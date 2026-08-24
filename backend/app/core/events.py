"""
Domain Event System
Connects Jira/Chat/Auth domains through domain events.
Events trigger notifications, WebSocket broadcasts, and activity feed entries.
"""
import logging
from datetime import datetime, timezone
from bson import ObjectId
from app.core.database import db_instance, serialize_doc

logger = logging.getLogger("events")


async def emit_event(event_type: str, payload: dict):
    """
    Emit a domain event. Creates a notification, stores activity, and broadcasts via WebSocket.
    
    Event types:
    - ISSUE_ASSIGNED
    - ISSUE_STATUS_CHANGED
    - ISSUE_PRIORITY_CHANGED
    - ISSUE_COMMENT_ADDED
    - ISSUE_CREATED
    - ISSUE_COMPLETED
    - GUEST_REQUEST_RECEIVED
    - GUEST_REQUEST_ACCEPTED
    """
    db = db_instance.db
    if db is None:
        logger.warning("Database not initialized, skipping event emission")
        return

    now = datetime.now(timezone.utc)

    # Store domain event
    event_doc = {
        "type": event_type,
        "payload": payload,
        "created_at": now,
    }
    await db.domain_events.insert_one(event_doc)

    # --- Route events to create notifications ---
    try:
        if event_type == "ISSUE_ASSIGNED":
            await _handle_issue_assigned(db, payload, now)
        elif event_type == "ISSUE_STATUS_CHANGED":
            await _handle_issue_status_changed(db, payload, now)
        elif event_type == "ISSUE_COMMENT_ADDED":
            await _handle_issue_comment_added(db, payload, now)
        elif event_type == "ISSUE_COMPLETED":
            await _handle_issue_completed(db, payload, now)
    except Exception as e:
        logger.error(f"Error handling event {event_type}: {e}")


import json
import asyncio
from pywebpush import webpush, WebPushException

async def trigger_web_push(db, user_id: str, payload: dict):
    cursor = db.push_subscriptions.find({"user_id": user_id})
    subs = await cursor.to_list(None)
    for sub in subs:
        try:
            await asyncio.to_thread(
                webpush,
                subscription_info={
                    "endpoint": sub["endpoint"],
                    "keys": {
                        "p256dh": sub["keys"]["p256dh"],
                        "auth": sub["keys"]["auth"]
                    }
                },
                data=json.dumps(payload),
                vapid_private_key="backend/private_key.pem",
                vapid_claims={"sub": "mailto:admin@topbrains.com"}
            )
        except WebPushException as ex:
            if ex.response and ex.response.status_code in [404, 410]:
                await db.push_subscriptions.delete_one({"_id": sub["_id"]})
        except Exception as e:
            logger.debug(f"Web push dispatch failed: {e}")

async def _create_notification(db, user_id: str, notif_type: str, title: str, body: str,
                                entity_type: str = None, entity_id: str = None, metadata: dict = None):
    """Create a notification and broadcast via WebSocket."""
    now = datetime.now(timezone.utc)
    notif = {
        "user_id": user_id,
        "type": notif_type,
        "title": title,
        "body": body,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "metadata": metadata or {},
        "is_read": False,
        "created_at": now,
    }
    result = await db.notifications.insert_one(notif)
    notif["_id"] = result.inserted_id
    serialized = serialize_doc(notif)

    # Broadcast via WebSocket
    try:
        from app.api.websocket import manager
        await manager.send_to_user(user_id, {
            "type": "NOTIFICATION_CREATED",
            "notification": serialized,
        })
    except Exception as e:
        logger.debug(f"WebSocket broadcast failed: {e}")

    # Dispatch Background Web Push Notification
    try:
        push_body = "1 new message"
        if notif_type == "chat_message":
            if "uploaded a file" in body or "Sent a file" in body or (metadata and metadata.get("type") == "file"):
                push_body = "Sent a file"
        else:
            push_body = "New notification received"

        push_payload = {
            "title": title,
            "body": push_body,
            "data": {
                "url": f"/chat/{entity_id}" if notif_type == "chat_message" else "/my-work"
            }
        }
        asyncio.create_task(trigger_web_push(db, user_id, push_payload))
    except Exception as e:
        logger.debug(f"Failed to dispatch web push task: {e}")

    return serialized


async def _handle_issue_assigned(db, payload: dict, now: datetime):
    assignee_id = payload.get("assignee_id")
    assigner_id = payload.get("assigner_id")
    issue_key = payload.get("issue_key", "")
    issue_summary = payload.get("issue_summary", "")
    project_name = payload.get("project_name", "")
    priority = payload.get("priority", "medium")

    if not assignee_id or assignee_id == assigner_id:
        return

    # Get assigner name
    assigner_name = "Someone"
    if assigner_id and ObjectId.is_valid(assigner_id):
        assigner = await db.users.find_one({"_id": ObjectId(assigner_id)})
        if assigner:
            assigner_name = assigner.get("name", "Someone")

    await _create_notification(
        db,
        user_id=assignee_id,
        notif_type="issue_assigned",
        title="New Assignment",
        body=f"{assigner_name} assigned you {issue_key}: {issue_summary}",
        entity_type="issue",
        entity_id=payload.get("issue_id"),
        metadata={
            "issue_key": issue_key,
            "project_name": project_name,
            "priority": priority,
            "assigner_name": assigner_name,
        }
    )


async def _handle_issue_status_changed(db, payload: dict, now: datetime):
    issue_key = payload.get("issue_key", "")
    issue_summary = payload.get("issue_summary", "")
    old_status = payload.get("old_status", "")
    new_status = payload.get("new_status", "")
    changed_by_id = payload.get("changed_by_id")
    reporter_id = payload.get("reporter_id")
    assignee_id = payload.get("assignee_id")

    # Get changer name
    changer_name = "Someone"
    if changed_by_id and ObjectId.is_valid(changed_by_id):
        changer = await db.users.find_one({"_id": ObjectId(changed_by_id)})
        if changer:
            changer_name = changer.get("name", "Someone")

    # Notify reporter and assignee (except the one who made the change)
    notify_ids = set()
    if reporter_id and reporter_id != changed_by_id:
        notify_ids.add(reporter_id)
    if assignee_id and assignee_id != changed_by_id:
        notify_ids.add(assignee_id)

    for uid in notify_ids:
        await _create_notification(
            db,
            user_id=uid,
            notif_type="issue_status_changed",
            title="Ticket Updated",
            body=f"{issue_key}: {old_status.upper()} -> {new_status.upper()} by {changer_name}",
            entity_type="issue",
            entity_id=payload.get("issue_id"),
            metadata={
                "issue_key": issue_key,
                "old_status": old_status,
                "new_status": new_status,
                "changer_name": changer_name,
            }
        )


async def _handle_issue_comment_added(db, payload: dict, now: datetime):
    issue_key = payload.get("issue_key", "")
    commenter_id = payload.get("commenter_id")
    assignee_id = payload.get("assignee_id")
    reporter_id = payload.get("reporter_id")

    commenter_name = "Someone"
    if commenter_id and ObjectId.is_valid(commenter_id):
        commenter = await db.users.find_one({"_id": ObjectId(commenter_id)})
        if commenter:
            commenter_name = commenter.get("name", "Someone")

    notify_ids = set()
    if assignee_id and assignee_id != commenter_id:
        notify_ids.add(assignee_id)
    if reporter_id and reporter_id != commenter_id:
        notify_ids.add(reporter_id)

    for uid in notify_ids:
        await _create_notification(
            db,
            user_id=uid,
            notif_type="issue_comment",
            title="New Comment",
            body=f"{commenter_name} commented on {issue_key}",
            entity_type="issue",
            entity_id=payload.get("issue_id"),
            metadata={"issue_key": issue_key, "commenter_name": commenter_name}
        )


async def _handle_issue_completed(db, payload: dict, now: datetime):
    issue_key = payload.get("issue_key", "")
    completed_by_id = payload.get("completed_by_id")
    reporter_id = payload.get("reporter_id")

    completer_name = "Someone"
    if completed_by_id and ObjectId.is_valid(completed_by_id):
        completer = await db.users.find_one({"_id": ObjectId(completed_by_id)})
        if completer:
            completer_name = completer.get("name", "Someone")

    if reporter_id and reporter_id != completed_by_id:
        await _create_notification(
            db,
            user_id=reporter_id,
            notif_type="issue_completed",
            title="Issue Completed",
            body=f"{issue_key} completed by {completer_name}",
            entity_type="issue",
            entity_id=payload.get("issue_id"),
            metadata={"issue_key": issue_key, "completer_name": completer_name}
        )
