from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from app.core.database import get_database, serialize_doc
from app.core.security import get_current_user
from app.schemas.conversation import GuestChatRequestCreate, GuestChatRequestResponse

router = APIRouter(prefix="/api/chat-requests", tags=["guest-requests"])


@router.post("", response_model=GuestChatRequestResponse)
async def send_chat_request(
    req_in: GuestChatRequestCreate,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """Send a chat request to another user (guest/external flow)."""
    if req_in.target_user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot send a chat request to yourself")

    # Check if target user exists
    if not ObjectId.is_valid(req_in.target_user_id):
        raise HTTPException(status_code=400, detail="Invalid target user ID")
    target = await db.users.find_one({"_id": ObjectId(req_in.target_user_id)})
    if not target:
        raise HTTPException(status_code=404, detail="Target user not found")

    # Check for existing request
    existing = await db.guest_chat_requests.find_one({
        "requester_id": current_user["id"],
        "target_user_id": req_in.target_user_id,
        "status": {"$in": ["pending", "accepted"]},
    })
    if existing:
        raise HTTPException(status_code=400, detail="A request already exists for this user")

    # Check if blocked
    blocked = await db.guest_chat_requests.find_one({
        "requester_id": current_user["id"],
        "target_user_id": req_in.target_user_id,
        "status": "blocked",
    })
    if blocked:
        raise HTTPException(status_code=403, detail="You have been blocked by this user")

    now = datetime.now(timezone.utc)
    request_doc = {
        "requester_id": current_user["id"],
        "target_user_id": req_in.target_user_id,
        "message": req_in.message or "",
        "status": "pending",
        "created_at": now,
        "updated_at": now,
    }
    result = await db.guest_chat_requests.insert_one(request_doc)
    request_doc["_id"] = result.inserted_id
    doc = serialize_doc(request_doc)

    # Populate users
    doc["requester"] = {"id": current_user["id"], "name": current_user.get("name"), "avatar_url": current_user.get("avatar_url")}
    doc["target_user"] = serialize_doc(target)

    # Send real-time notification
    from app.api.websocket import manager
    from app.core.events import _create_notification

    await manager.send_to_user(req_in.target_user_id, {
        "type": "GUEST_REQUEST_RECEIVED",
        "request": doc,
    })

    # Trigger in-app notification & push for the target user
    requester_name = current_user.get("name", "Guest User")
    preview_msg = req_in.message or "wants to start a conversation with you."
    await _create_notification(
        db=db,
        user_id=req_in.target_user_id,
        notif_type="guest_request",
        title=f"Guest chat request from {requester_name}",
        body=preview_msg,
        entity_type="guest_request",
        entity_id=str(request_doc["_id"]),
        metadata={"requester_id": current_user["id"], "request_id": str(request_doc["_id"])}
    )

    return doc


@router.get("", response_model=list[GuestChatRequestResponse])
async def list_chat_requests(
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """List all pending chat requests for the current user (both sent and received)."""
    # Received requests
    received = await db.guest_chat_requests.find({
        "target_user_id": current_user["id"],
        "status": "pending",
    }).sort("created_at", -1).to_list(50)

    result = []
    for req in received:
        doc = serialize_doc(req)
        if ObjectId.is_valid(req.get("requester_id")):
            requester = await db.users.find_one({"_id": ObjectId(req["requester_id"])}, {"password_hash": 0})
            if requester:
                doc["requester"] = serialize_doc(requester)
        result.append(doc)
    return result


@router.post("/{request_id}/accept")
async def accept_chat_request(
    request_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """Accept a chat request — creates a 1:1 conversation."""
    if not ObjectId.is_valid(request_id):
        raise HTTPException(status_code=400, detail="Invalid request ID")

    req = await db.guest_chat_requests.find_one({"_id": ObjectId(request_id)})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.get("target_user_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the target user can accept this request")
    if req.get("status") != "pending":
        raise HTTPException(status_code=400, detail=f"Request is already {req.get('status')}")

    now = datetime.now(timezone.utc)
    await db.guest_chat_requests.update_one(
        {"_id": ObjectId(request_id)},
        {"$set": {"status": "accepted", "updated_at": now}}
    )

    # Create a direct conversation between the two users
    convo_doc = {
        "type": "direct",
        "name": None,
        "created_by": current_user["id"],
        "created_at": now,
        "updated_at": now,
    }
    convo_result = await db.conversations.insert_one(convo_doc)
    convo_id = str(convo_result.inserted_id)

    for uid in [current_user["id"], req["requester_id"]]:
        await db.conversation_members.insert_one({
            "conversation_id": convo_id,
            "user_id": uid,
            "joined_at": now,
            "last_read_at": now,
        })

    # Notify the requester
    from app.api.websocket import manager
    from app.core.events import _create_notification

    await manager.send_to_user(req["requester_id"], {
        "type": "GUEST_REQUEST_ACCEPTED",
        "request_id": request_id,
        "conversation_id": convo_id,
    })

    # Trigger notification for the requester
    acceptor_name = current_user.get("name", "User")
    await _create_notification(
        db=db,
        user_id=req["requester_id"],
        notif_type="chat_message",
        title=f"{acceptor_name} accepted your chat request",
        body="You can now send direct messages and collaborate.",
        entity_type="conversation",
        entity_id=convo_id,
        metadata={"conversation_id": convo_id}
    )

    return {"status": "accepted", "conversation_id": convo_id}


@router.post("/{request_id}/decline")
async def decline_chat_request(
    request_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    if not ObjectId.is_valid(request_id):
        raise HTTPException(status_code=400, detail="Invalid request ID")
    req = await db.guest_chat_requests.find_one({"_id": ObjectId(request_id)})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.get("target_user_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the target user can decline this request")

    await db.guest_chat_requests.update_one(
        {"_id": ObjectId(request_id)},
        {"$set": {"status": "declined", "updated_at": datetime.now(timezone.utc)}}
    )
    return {"status": "declined"}


@router.post("/{request_id}/block")
async def block_chat_request(
    request_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    if not ObjectId.is_valid(request_id):
        raise HTTPException(status_code=400, detail="Invalid request ID")
    req = await db.guest_chat_requests.find_one({"_id": ObjectId(request_id)})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.get("target_user_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the target user can block this request")

    await db.guest_chat_requests.update_one(
        {"_id": ObjectId(request_id)},
        {"$set": {"status": "blocked", "updated_at": datetime.now(timezone.utc)}}
    )
    return {"status": "blocked"}
