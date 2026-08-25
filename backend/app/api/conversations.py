from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from bson import ObjectId
from app.core.database import get_database, serialize_doc, serialize_docs
from app.core.security import get_current_user
from app.schemas.conversation import (
    ConversationCreate, ConversationUpdate, ConversationResponse,
    MessageCreate, MessageResponse,
)

router = APIRouter(prefix="/api/conversations", tags=["conversations"])


@router.get("", response_model=list[ConversationResponse])
async def list_conversations(current_user=Depends(get_current_user), db=Depends(get_database)):
    """List all conversations for the current user."""
    # Find conversations where user is a member
    memberships = await db.conversation_members.find({"user_id": current_user["id"]}).to_list(200)
    convo_ids = [m["conversation_id"] for m in memberships]

    if not convo_ids:
        return []

    convos = await db.conversations.find(
        {"_id": {"$in": [ObjectId(cid) for cid in convo_ids if ObjectId.is_valid(cid)]}}
    ).sort("updated_at", -1).to_list(200)

    # Find pending chat requests where current_user is the recipient
    pending_incoming_reqs = await db.guest_chat_requests.find({
        "target_user_id": current_user["id"],
        "status": "pending",
    }).to_list(100)
    pending_requester_ids = set([r["requester_id"] for r in pending_incoming_reqs])

    result = []
    for convo in convos:
        doc = serialize_doc(convo)
        # Populate members
        members_raw = await db.conversation_members.find({"conversation_id": doc["id"]}).to_list(50)
        members = []
        for m in members_raw:
            if ObjectId.is_valid(m.get("user_id")):
                user = await db.users.find_one({"_id": ObjectId(m["user_id"])}, {"password_hash": 0})
                if user:
                    members.append(serialize_doc(user))
        doc["members"] = members

        # If it is a direct conversation initiated by an external user that is still pending acceptance by current_user, do not show in main chat list
        if doc.get("type") == "direct" and pending_requester_ids:
            other_member = next((m for m in members if m["id"] != current_user["id"]), None)
            if other_member and other_member["id"] in pending_requester_ids:
                continue

        # Last message
        last_msg = await db.messages.find({"conversation_id": doc["id"]}).sort("created_at", -1).to_list(1)
        doc["last_message"] = serialize_doc(last_msg[0]) if last_msg else None

        # Unread count
        my_membership = next((m for m in memberships if m["conversation_id"] == doc["id"]), None)
        last_read = my_membership.get("last_read_at") if my_membership else None
        if last_read:
            doc["unread_count"] = await db.messages.count_documents({
                "conversation_id": doc["id"],
                "created_at": {"$gt": last_read},
                "sender_id": {"$ne": current_user["id"]},
            })
        else:
            doc["unread_count"] = await db.messages.count_documents({
                "conversation_id": doc["id"],
                "sender_id": {"$ne": current_user["id"]},
            })

        # Find if current_user has a pending chat request sent to the other user
        doc["is_pending_request"] = False
        if doc.get("type") == "direct":
            other_member = next((m for m in members if m["id"] != current_user["id"]), None)
            if other_member:
                sent_req = await db.guest_chat_requests.find_one({
                    "requester_id": current_user["id"],
                    "target_user_id": other_member["id"],
                    "status": "pending",
                })
                if sent_req:
                    doc["is_pending_request"] = True

        result.append(doc)

    return result


@router.post("", response_model=ConversationResponse)
async def create_conversation(
    convo_in: ConversationCreate,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """Create a new conversation (DM, group, or channel)."""
    # For direct messages, check if one already exists
    if convo_in.type == "direct" and len(convo_in.member_ids) == 1:
        other_id = convo_in.member_ids[0]
        # Check if blocked
        blocked = await db.guest_chat_requests.find_one({
            "$or": [
                {"requester_id": current_user["id"], "target_user_id": other_id, "status": "blocked"},
                {"requester_id": other_id, "target_user_id": current_user["id"], "status": "blocked"},
            ]
        })
        if blocked:
            raise HTTPException(status_code=403, detail="Cannot start conversation with this user")

        # Find existing DM between these two users
        my_convos = await db.conversation_members.find({"user_id": current_user["id"]}).to_list(500)
        my_convo_ids = [m["conversation_id"] for m in my_convos]

        other_convos = await db.conversation_members.find({"user_id": other_id}).to_list(500)
        other_convo_ids = [m["conversation_id"] for m in other_convos]

        common_ids = set(my_convo_ids) & set(other_convo_ids)
        for cid in common_ids:
            existing = await db.conversations.find_one({"_id": ObjectId(cid), "type": "direct"})
            if existing:
                doc = serialize_doc(existing)
                # Return existing conversation with members populated
                members_raw = await db.conversation_members.find({"conversation_id": doc["id"]}).to_list(10)
                members = []
                for m in members_raw:
                    if ObjectId.is_valid(m.get("user_id")):
                        user = await db.users.find_one({"_id": ObjectId(m["user_id"])}, {"password_hash": 0})
                        if user:
                            members.append(serialize_doc(user))
                doc["members"] = members
                doc["unread_count"] = 0
                return doc

        # Check if users share at least one organization (direct org membership or user.organization_id)
        my_user_doc = await db.users.find_one({"_id": ObjectId(current_user["id"])}) if ObjectId.is_valid(current_user["id"]) else None
        other_user_doc = await db.users.find_one({"_id": ObjectId(other_id)}) if ObjectId.is_valid(other_id) else None

        my_org_memberships = await db.org_memberships.find({
            "$or": [{"user_id": current_user["id"]}, {"user_id": ObjectId(current_user["id"])}] if ObjectId.is_valid(current_user["id"]) else [{"user_id": current_user["id"]}]
        }).to_list(100)
        other_org_memberships = await db.org_memberships.find({
            "$or": [{"user_id": other_id}, {"user_id": ObjectId(other_id)}] if ObjectId.is_valid(other_id) else [{"user_id": other_id}]
        }).to_list(100)

        my_org_ids = set([str(m.get("organization_id")) for m in my_org_memberships if m.get("organization_id")])
        other_org_ids = set([str(m.get("organization_id")) for m in other_org_memberships if m.get("organization_id")])

        if my_user_doc and my_user_doc.get("organization_id"):
            my_org_ids.add(str(my_user_doc["organization_id"]))
        if other_user_doc and other_user_doc.get("organization_id"):
            other_org_ids.add(str(other_user_doc["organization_id"]))

        shares_org = bool(my_org_ids & other_org_ids)

        # Same organization members skip chat requests and chat immediately without acceptance criteria
        if not shares_org:
            accepted_req = await db.guest_chat_requests.find_one({
                "$or": [
                    {"requester_id": current_user["id"], "target_user_id": other_id, "status": "accepted"},
                    {"requester_id": other_id, "target_user_id": current_user["id"], "status": "accepted"},
                ]
            })
            if not accepted_req:
                # Create or return a pending chat request for the target user to accept/decline/block
                existing_req = await db.guest_chat_requests.find_one({
                    "requester_id": current_user["id"],
                    "target_user_id": other_id,
                    "status": "pending"
                })
                if not existing_req:
                    req_doc = {
                        "requester_id": current_user["id"],
                        "target_user_id": other_id,
                        "message": "Direct message initiation across organizations",
                        "status": "pending",
                        "created_at": datetime.now(timezone.utc),
                        "updated_at": datetime.now(timezone.utc),
                    }
                    await db.guest_chat_requests.insert_one(req_doc)

                    # Send real-time notification
                    from app.api.websocket import manager
                    from app.core.events import _create_notification
                    await manager.send_to_user(other_id, {
                        "type": "GUEST_REQUEST_RECEIVED",
                        "request": {
                            "id": str(req_doc.get("_id", "")),
                            "requester": {"id": current_user["id"], "name": current_user.get("name"), "company_name": current_user.get("company_name")},
                            "message": "wants to start a conversation with you.",
                        }
                    })
                    await _create_notification(
                        db=db,
                        user_id=other_id,
                        notif_type="guest_request",
                        title=f"Chat request from {current_user.get('name', 'User')}",
                        body="wants to connect and chat with you.",
                        entity_type="guest_request",
                        entity_id=str(req_doc.get("_id", "")),
                    )

    # Create the conversation
    now = datetime.now(timezone.utc)
    convo_doc = {
        "type": convo_in.type,
        "name": convo_in.name,
        "organization_id": convo_in.organization_id,
        "team_id": convo_in.team_id,
        "project_id": convo_in.project_id,
        "created_by": current_user["id"],
        "created_at": now,
        "updated_at": now,
    }
    result = await db.conversations.insert_one(convo_doc)
    convo_id = str(result.inserted_id)

    # Add all members (including current user)
    all_member_ids = list(set([current_user["id"]] + convo_in.member_ids))
    for uid in all_member_ids:
        await db.conversation_members.insert_one({
            "conversation_id": convo_id,
            "user_id": uid,
            "joined_at": now,
            "last_read_at": now,
        })

    # Populate response
    convo_doc["_id"] = result.inserted_id
    doc = serialize_doc(convo_doc)
    members = []
    for uid in all_member_ids:
        if ObjectId.is_valid(uid):
            user = await db.users.find_one({"_id": ObjectId(uid)}, {"password_hash": 0})
            if user:
                members.append(serialize_doc(user))
    doc["members"] = members
    doc["unread_count"] = 0
    return doc


@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    if not ObjectId.is_valid(conversation_id):
        raise HTTPException(status_code=400, detail="Invalid conversation ID")

    from app.core.security import is_super_admin
    is_super = is_super_admin(current_user)

    # Verify membership
    membership = await db.conversation_members.find_one({
        "conversation_id": conversation_id, "user_id": current_user["id"]
    })
    if not membership and not is_super:
        raise HTTPException(status_code=403, detail="Not a member of this conversation")

    convo = await db.conversations.find_one({"_id": ObjectId(conversation_id)})
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    doc = serialize_doc(convo)
    members_raw = await db.conversation_members.find({"conversation_id": conversation_id}).to_list(50)
    members = []
    for m in members_raw:
        if ObjectId.is_valid(m.get("user_id")):
            user = await db.users.find_one({"_id": ObjectId(m["user_id"])}, {"password_hash": 0, "email": 0})
            if user:
                members.append(serialize_doc(user))
    doc["members"] = members
    doc["unread_count"] = 0
    return doc


@router.get("/{conversation_id}/messages", response_model=list[MessageResponse])
async def get_messages(
    conversation_id: str,
    limit: int = Query(50, le=100),
    before: str = Query(None),
    after: str = Query(None),
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """Get messages for a conversation (paginated)."""
    from app.core.security import is_super_admin
    is_super = is_super_admin(current_user)

    # Verify membership
    membership = await db.conversation_members.find_one({
        "conversation_id": conversation_id, "user_id": current_user["id"]
    })
    if not membership and not is_super:
        raise HTTPException(status_code=403, detail="Not a member of this conversation")

    query = {"conversation_id": conversation_id}
    cleared_at = membership.get("cleared_at") if membership else None
    if cleared_at:
        query["created_at"] = {"$gt": cleared_at}

    if before and ObjectId.is_valid(before):
        msg = await db.messages.find_one({"_id": ObjectId(before)})
        if msg:
            if "created_at" in query:
                query["created_at"]["$lt"] = msg["created_at"]
            else:
                query["created_at"] = {"$lt": msg["created_at"]}
    elif after and ObjectId.is_valid(after):
        msg = await db.messages.find_one({"_id": ObjectId(after)})
        if msg:
            if "created_at" in query:
                query["created_at"]["$gt"] = max(cleared_at, msg["created_at"]) if cleared_at else msg["created_at"]
            else:
                query["created_at"] = {"$gt": msg["created_at"]}

    if after:
        msgs = await db.messages.find(query).sort("created_at", 1).to_list(limit)
    else:
        msgs = await db.messages.find(query).sort("created_at", -1).to_list(limit)
        msgs.reverse()

    result = []
    for msg in msgs:
        doc = serialize_doc(msg)
        # Populate sender (name, role, avatar only - no email)
        if ObjectId.is_valid(msg.get("sender_id")):
            sender = await db.users.find_one({"_id": ObjectId(msg["sender_id"])}, {"password_hash": 0, "email": 0})
            if sender:
                doc["sender"] = serialize_doc(sender)
        result.append(doc)
    return result


@router.post("/{conversation_id}/messages", response_model=MessageResponse)
async def send_message(
    conversation_id: str,
    msg_in: MessageCreate,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """Send a message to a conversation."""
    # Verify membership (allow super_admin anywhere)
    from app.core.security import is_super_admin, sanitize_text
    is_super = is_super_admin(current_user)

    membership = await db.conversation_members.find_one({
        "conversation_id": conversation_id, "user_id": current_user["id"]
    })
    if not membership and not is_super:
        raise HTTPException(status_code=403, detail="Not a member of this conversation")

    # Check if sender is blocked by other members in this conversation
    members = await db.conversation_members.find({"conversation_id": conversation_id}).to_list(100)
    other_uids = [m["user_id"] for m in members if m.get("user_id") != current_user["id"]]
    if other_uids:
        blocked = await db.guest_chat_requests.find_one({
            "requester_id": current_user["id"],
            "target_user_id": {"$in": other_uids},
            "status": "blocked"
        })
        if blocked:
            raise HTTPException(status_code=403, detail="You cannot send messages to this conversation because you have been blocked by a participant.")

    # Sanitize message content to prevent server/browser script injection (XSS/RCE)
    safe_content = sanitize_text(msg_in.content)

    now = datetime.now(timezone.utc)
    msg_doc = {
        "conversation_id": conversation_id,
        "sender_id": current_user["id"],
        "content": safe_content,
        "type": msg_in.type,
        "read_by": [current_user["id"]],
        "created_at": now,
    }
    result = await db.messages.insert_one(msg_doc)
    msg_doc["_id"] = result.inserted_id

    # Update conversation's updated_at
    await db.conversations.update_one(
        {"_id": ObjectId(conversation_id)},
        {"$set": {"updated_at": now}}
    )

    # Update sender's last_read_at if membership exists
    if membership:
        await db.conversation_members.update_one(
            {"conversation_id": conversation_id, "user_id": current_user["id"]},
            {"$set": {"last_read_at": now}}
        )

    doc = serialize_doc(msg_doc)
    doc["sender"] = {
        "id": current_user["id"],
        "name": current_user.get("name"),
        "role": current_user.get("role", "member"),
        "avatar_url": current_user.get("avatar_url"),
    }

    # Broadcast message to other conversation members via WebSocket
    from app.api.websocket import manager
    from app.core.events import _create_notification

    # Get conversation details for notifications
    convo = await db.conversations.find_one({"_id": ObjectId(conversation_id)})
    convo_name = convo.get("name") if convo else None

    # Broadcast to all conversation members
    members = await db.conversation_members.find({"conversation_id": conversation_id}).to_list(200)
    for m in members:
        uid = m.get("user_id")
        if uid and uid != current_user["id"]:
            # Real-time WebSocket delivery
            await manager.send_to_user(uid, {
                "type": "CHAT_MESSAGE_CREATED",
                "conversation_id": conversation_id,
                "message": doc,
            })

            # Create in-app Notification for the receiver
            sender_name = current_user.get("name", "Someone")
            notif_title = f"New message from {sender_name}" if not convo_name else f"New message in #{convo_name}"
            snippet = msg_in.content[:80] + ("..." if len(msg_in.content) > 80 else "")
            await _create_notification(
                db=db,
                user_id=uid,
                notif_type="chat_message",
                title=notif_title,
                body=snippet,
                entity_type="conversation",
                entity_id=conversation_id,
                metadata={"sender_id": current_user["id"], "message_id": doc["id"]}
            )

    return doc


@router.post("/{conversation_id}/read")
async def mark_conversation_read(
    conversation_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """Mark conversation as read for current user and clear conversation notifications."""
    now = datetime.now(timezone.utc)
    await db.conversation_members.update_one(
        {"conversation_id": conversation_id, "user_id": current_user["id"]},
        {"$set": {"last_read_at": now}}
    )

    # Add current_user to read_by array for all unread messages in this conversation
    await db.messages.update_many(
        {"conversation_id": conversation_id, "read_by": {"$ne": current_user["id"]}},
        {"$addToSet": {"read_by": current_user["id"]}}
    )

    # Automatically mark all notifications related to this conversation as read
    await db.notifications.update_many(
        {
            "user_id": current_user["id"],
            "entity_id": conversation_id,
            "is_read": False,
        },
        {"$set": {"is_read": True, "read_at": now}}
    )

    # Broadcast read receipt via WebSocket so the sender's UI updates in real-time
    from app.api.websocket import manager
    await manager.broadcast_to_conversation(conversation_id, {
        "type": "CHAT_MESSAGES_READ",
        "conversation_id": conversation_id,
        "reader_id": current_user["id"],
        "reader_name": current_user.get("name"),
        "read_at": now.isoformat(),
    }, exclude_user=current_user["id"])

    # Broadcast updated notification count to current user
    unread_notifs = await db.notifications.count_documents({
        "user_id": current_user["id"],
        "is_read": False,
    })
    await manager.send_to_user(current_user["id"], {
        "type": "NOTIFICATION_COUNT_UPDATED",
        "count": unread_notifs,
    })

    return {"status": "read"}


@router.post("/{conversation_id}/members")
async def add_conversation_member(
    conversation_id: str,
    body: dict,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    from app.core.security import is_super_admin
    is_super = is_super_admin(current_user)

    convo = await db.conversations.find_one({"_id": ObjectId(conversation_id)})
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # In group chats, only creator (admin) or super_admin can add members
    if convo.get("type") in ("group", "channel"):
        if convo.get("created_by") != current_user["id"] and not is_super:
            raise HTTPException(status_code=403, detail="Only the group admin (creator) can add members.")

    user_id = body.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id required")

    existing = await db.conversation_members.find_one({
        "conversation_id": conversation_id, "user_id": user_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="User is already a member")

    await db.conversation_members.insert_one({
        "conversation_id": conversation_id,
        "user_id": user_id,
        "joined_at": datetime.now(timezone.utc),
        "last_read_at": datetime.now(timezone.utc),
    })
    return {"status": "added"}


@router.delete("/{conversation_id}/members/{user_id}")
async def remove_conversation_member(
    conversation_id: str,
    user_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    from app.core.security import is_super_admin
    is_super = is_super_admin(current_user)

    convo = await db.conversations.find_one({"_id": ObjectId(conversation_id)})
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # In group chats, only creator (admin) or super_admin can remove members (or user can leave themselves)
    if convo.get("type") in ("group", "channel") and user_id != current_user["id"]:
        if convo.get("created_by") != current_user["id"] and not is_super:
            raise HTTPException(status_code=403, detail="Only the group admin can remove members.")

    await db.conversation_members.delete_one({
        "conversation_id": conversation_id, "user_id": user_id
    })
    return {"status": "removed"}


@router.delete("/{conversation_id}/messages")
async def clear_conversation_messages(
    conversation_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """
    Clear chat:
    - Broadcast channels (org, team, project): Prohibited from clearing.
    - Group chats: Only the creator (admin) or super_admin can clear.
    - Direct 1:1 chats: Clears for the current user only.
    """
    from app.core.security import is_super_admin
    is_super = is_super_admin(current_user)

    convo = await db.conversations.find_one({"_id": ObjectId(conversation_id)})
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    convo_type = convo.get("type", "direct")
    if convo_type in ("org_broadcast", "team_broadcast", "project_broadcast"):
        raise HTTPException(status_code=400, detail="Broadcast channels cannot be cleared.")

    if convo_type in ("group", "channel"):
        if convo.get("created_by") != current_user["id"] and not is_super:
            raise HTTPException(status_code=403, detail="Only the group creator (admin) can clear chat for this group.")

    now = datetime.now(timezone.utc)
    # Update membership cleared_at timestamp for current user
    res = await db.conversation_members.update_one(
        {"conversation_id": conversation_id, "user_id": current_user["id"]},
        {"$set": {"cleared_at": now}}
    )
    if res.matched_count == 0:
        await db.conversation_members.insert_one({
            "conversation_id": conversation_id,
            "user_id": current_user["id"],
            "joined_at": now,
            "last_read_at": now,
            "cleared_at": now
        })
    return {"status": "cleared"}


@router.post("/{conversation_id}/block")
async def block_conversation_user(
    conversation_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """Block the other user in a direct conversation so they cannot message you."""
    convo = await db.conversations.find_one({"_id": ObjectId(conversation_id)})
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    members = await db.conversation_members.find({"conversation_id": conversation_id}).to_list(10)
    other_members = [m for m in members if m.get("user_id") != current_user["id"]]
    if not other_members:
        raise HTTPException(status_code=400, detail="Cannot block this conversation")

    other_user_id = other_members[0]["user_id"]
    now = datetime.now(timezone.utc)

    # Upsert blocked record in guest_chat_requests / blocks
    await db.guest_chat_requests.update_one(
        {"requester_id": other_user_id, "target_user_id": current_user["id"]},
        {"$set": {"status": "blocked", "updated_at": now}},
        upsert=True
    )
    return {"status": "blocked", "blocked_user_id": other_user_id}