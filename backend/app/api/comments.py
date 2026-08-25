import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from app.core.database import get_database, serialize_doc, serialize_docs
from app.core.security import get_current_user, get_current_user_optional, sanitize_text
from app.core.events import emit_event
from app.schemas.comment import CommentCreate, CommentUpdate, CommentResponse, ActivityResponse

logger = logging.getLogger("comments_api")
router = APIRouter(prefix="/api/comments", tags=["comments"])


@router.get("/issue/{issue_id}", response_model=list[CommentResponse])
async def get_issue_comments(issue_id: str, db=Depends(get_database)):
    comments = await db.comments.find({"issue_id": issue_id}).sort("created_at", 1).to_list(length=200)
    result = []
    for c in comments:
        user_info = None
        if c.get("user_id") and ObjectId.is_valid(c["user_id"]):
            u = await db.users.find_one({"_id": ObjectId(c["user_id"])}, {"password_hash": 0})
            user_info = serialize_doc(u)
            
        serialized = serialize_doc(c)
        serialized["user"] = user_info
        result.append(serialized)
    return result


@router.post("", response_model=CommentResponse)
async def create_comment(
    comment_in: CommentCreate,
    db=Depends(get_database),
    current_user=Depends(get_current_user_optional)
):
    now = datetime.now(timezone.utc)
    user_id = current_user["id"] if current_user else None
    safe_content = sanitize_text(comment_in.content)
    
    doc = {
        "issue_id": comment_in.issue_id,
        "user_id": user_id,
        "content": safe_content,
        "created_at": now,
        "updated_at": now
    }
    res = await db.comments.insert_one(doc)
    doc["_id"] = res.inserted_id
    
    # Log activity
    await db.activity.insert_one({
        "issue_id": comment_in.issue_id,
        "user_id": user_id,
        "action": "added_comment",
        "details": {"preview": comment_in.content[:50]},
        "created_at": now
    })

    # Emit domain event for new comment
    try:
        issue = await db.issues.find_one({"_id": ObjectId(comment_in.issue_id)})
        if issue:
            await emit_event("ISSUE_COMMENT_ADDED", {
                "issue_id": comment_in.issue_id,
                "issue_key": issue.get("key", "Issue"),
                "commenter_id": user_id,
                "assignee_id": issue.get("assignee_id"),
                "reporter_id": issue.get("reporter_id")
            })
    except Exception as e:
        logger.warning(f"Failed to emit comment event: {e}")
    
    user_info = None
    if user_id and ObjectId.is_valid(user_id):
        u = await db.users.find_one({"_id": ObjectId(user_id)}, {"password_hash": 0})
        user_info = serialize_doc(u)
        
    serialized = serialize_doc(doc)
    serialized["user"] = user_info
    return serialized


@router.delete("/{comment_id}")
async def delete_comment(comment_id: str, db=Depends(get_database)):
    if not ObjectId.is_valid(comment_id):
        raise HTTPException(status_code=400, detail="Invalid comment ID")
    await db.comments.delete_one({"_id": ObjectId(comment_id)})
    return {"message": "Comment deleted successfully"}


@router.get("/activity/{issue_id}", response_model=list[ActivityResponse])
async def get_issue_activity(issue_id: str, db=Depends(get_database)):
    activities = await db.activity.find({"issue_id": issue_id}).sort("created_at", -1).to_list(length=100)
    result = []
    for a in activities:
        user_info = None
        if a.get("user_id") and ObjectId.is_valid(a["user_id"]):
            u = await db.users.find_one({"_id": ObjectId(a["user_id"])}, {"password_hash": 0})
            user_info = serialize_doc(u)
            
        serialized = serialize_doc(a)
        serialized["user"] = user_info
        result.append(serialized)
    return result
