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

    # Create the conversation
    now = datetime.now(timezone.utc)
    convo_doc = {
        "type": convo_in.type,
        "name": convo_in.name,
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

    # Verify membership
    membership = await db.conversation_members.find_one({
        "conversation_id": conversation_id, "user_id": current_user["id"]
    })
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this conversation")

    convo = await db.conversations.find_one({"_id": ObjectId(conversation_id)})
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    doc = serialize_doc(convo)
    members_raw = await db.conversation_members.find({"conversation_id": conversation_id}).to_list(50)
    members = []
    for m in members_raw:
        if ObjectId.is_valid(m.get("user_id")):
            user = await db.users.find_one({"_id": ObjectId(m["user_id"])}, {"password_hash": 0})
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
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """Get messages for a conversation (paginated)."""
    # Verify membership
    membership = await db.conversation_members.find_one({
        "conversation_id": conversation_id, "user_id": current_user["id"]
    })
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this conversation")

    query = {"conversation_id": conversation_id}
    if before and ObjectId.is_valid(before):
        msg = await db.messages.find_one({"_id": ObjectId(before)})
        if msg:
            query["created_at"] = {"$lt": msg["created_at"]}

    msgs = await db.messages.find(query).sort("created_at", 1).to_list(limit)

    result = []
    for msg in msgs:
        doc = serialize_doc(msg)
        # Populate sender
        if ObjectId.is_valid(msg.get("sender_id")):
            sender = await db.users.find_one({"_id": ObjectId(msg["sender_id"])}, {"password_hash": 0})
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
    # Verify membership
    membership = await db.conversation_members.find_one({
        "conversation_id": conversation_id, "user_id": current_user["id"]
    })
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this conversation")

    now = datetime.now(timezone.utc)
    msg_doc = {
        "conversation_id": conversation_id,
        "sender_id": current_user["id"],
        "content": msg_in.content,
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

    # Update sender's last_read_at
    await db.conversation_members.update_one(
        {"conversation_id": conversation_id, "user_id": current_user["id"]},
        {"$set": {"last_read_at": now}}
    )

    doc = serialize_doc(msg_doc)
    doc["sender"] = {
        "id": current_user["id"],
        "name": current_user.get("name"),
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
    await db.conversation_members.delete_one({
        "conversation_id": conversation_id, "user_id": user_id
    })
    return {"status": "removed"}
