from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from bson import ObjectId
from app.core.database import get_database, serialize_doc
from app.core.security import get_current_user
from app.schemas.notification import NotificationResponse, UnreadCountResponse

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationResponse])
async def list_notifications(
    limit: int = Query(50, le=100),
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """List notifications for the current user, newest first."""
    cursor = db.notifications.find(
        {"user_id": current_user["id"]}
    ).sort("created_at", -1).limit(limit)
    notifs = await cursor.to_list(limit)
    return [serialize_doc(n) for n in notifs]


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    count = await db.notifications.count_documents({
        "user_id": current_user["id"],
        "is_read": False,
    })
    return {"count": count}


@router.patch("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    if not ObjectId.is_valid(notification_id):
        raise HTTPException(status_code=400, detail="Invalid notification ID")
    await db.notifications.update_one(
        {"_id": ObjectId(notification_id), "user_id": current_user["id"]},
        {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc)}}
    )
    return {"status": "read"}


@router.post("/read-all")
async def mark_all_read(
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    await db.notifications.update_many(
        {"user_id": current_user["id"], "is_read": False},
        {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc)}}
    )
    return {"status": "all_read"}


from pydantic import BaseModel

class PushKeys(BaseModel):
    p256dh: str
    auth: str

class PushSubscriptionSchema(BaseModel):
    endpoint: str
    keys: PushKeys

@router.post("/subscribe")
async def subscribe_push_notifications(
    subscription: PushSubscriptionSchema,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """Register user's Web Push subscription."""
    # Avoid duplicates
    existing = await db.push_subscriptions.find_one({
        "user_id": current_user["id"],
        "endpoint": subscription.endpoint
    })
    
    if not existing:
        await db.push_subscriptions.insert_one({
            "user_id": current_user["id"],
            "endpoint": subscription.endpoint,
            "keys": {
                "p256dh": subscription.keys.p256dh,
                "auth": subscription.keys.auth
            },
            "created_at": datetime.now(timezone.utc)
        })
    return {"status": "subscribed"}
