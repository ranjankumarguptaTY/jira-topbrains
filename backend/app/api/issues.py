import logging
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from bson import ObjectId
from app.core.database import get_database, serialize_doc, serialize_docs
from app.core.security import get_current_user_optional, get_current_user
from app.core.events import emit_event
from app.schemas.issue import (
    IssueCreate,
    IssueUpdate,
    IssueStatusUpdate,
    IssueReorderRequest,
    IssueResponse
)

logger = logging.getLogger("issues_api")
router = APIRouter(prefix="/api/issues", tags=["issues"])


async def populate_issue_relationships(issue_doc: dict, db):
    """Helper to populate assignee, reporter, epic, and subtask statistics"""
    if not issue_doc:
        return None
    
    serialized = serialize_doc(issue_doc)
    
    # Assignee
    if serialized.get("assignee_id") and ObjectId.is_valid(serialized["assignee_id"]):
        assignee = await db.users.find_one({"_id": ObjectId(serialized["assignee_id"])}, {"password_hash": 0})
        serialized["assignee"] = serialize_doc(assignee)
    
    # Reporter
    if serialized.get("reporter_id") and ObjectId.is_valid(serialized["reporter_id"]):
        reporter = await db.users.find_one({"_id": ObjectId(serialized["reporter_id"])}, {"password_hash": 0})
        serialized["reporter"] = serialize_doc(reporter)
        
    # Epic
    if serialized.get("epic_id") and ObjectId.is_valid(serialized["epic_id"]):
        epic = await db.issues.find_one({"_id": ObjectId(serialized["epic_id"])})
        if epic:
            serialized["epic"] = {
                "id": str(epic["_id"]),
                "key": epic.get("key"),
                "summary": epic.get("summary"),
                "color": "#6554C0"
            }
            
    # Subtasks count
    issue_id_str = serialized["id"]
    subtasks = await db.issues.find({"parent_id": issue_id_str}).to_list(length=100)
    if subtasks:
        done_count = sum(1 for s in subtasks if s.get("status") == "done")
        serialized["subtask_stats"] = {
            "total": len(subtasks),
            "completed": done_count
        }
        
    # Comments count
    c_count = await db.comments.count_documents({"issue_id": issue_id_str})
    serialized["comments_count"] = c_count
    
    return serialized


@router.get("/my-work", response_model=list[IssueResponse])
async def get_my_work(
    view: str = Query("assigned", pattern="^(assigned|created|completed|all)$"),
    project_id: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    type: Optional[str] = None,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """Retrieve work items consolidated for the current user across all projects."""
    query = {}
    if view == "assigned":
        query["assignee_id"] = current_user["id"]
        query["status"] = {"$ne": "done"}
    elif view == "created":
        query["reporter_id"] = current_user["id"]
    elif view == "completed":
        query["assignee_id"] = current_user["id"]
        query["status"] = "done"
    elif view == "all":
        query["$or"] = [
            {"assignee_id": current_user["id"]},
            {"reporter_id": current_user["id"]}
        ]

    if project_id and project_id != "all":
        query["project_id"] = project_id
    if status and status != "all":
        query["status"] = status
    if priority and priority != "all":
        query["priority"] = priority
    if type and type != "all":
        query["type"] = type

    issues = await db.issues.find(query).sort("updated_at", -1).to_list(length=200)
    result = []
    for doc in issues:
        populated = await populate_issue_relationships(doc, db)
        result.append(populated)
    return result


@router.get("", response_model=list[IssueResponse])
async def list_issues(
    project_id: Optional[str] = None,
    sprint_id: Optional[str] = Query(None, description="Sprint ID or 'backlog' or 'none'"),
    type: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    assignee_id: Optional[str] = None,
    search: Optional[str] = None,
    parent_id: Optional[str] = None,
    db=Depends(get_database)
):
    query = {}
    if project_id:
        query["project_id"] = project_id
    
    if sprint_id == "backlog" or sprint_id == "none":
        query["sprint_id"] = None
    elif sprint_id:
        query["sprint_id"] = sprint_id
        
    if type:
        query["type"] = type
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    if assignee_id:
        query["assignee_id"] = assignee_id
    if parent_id is not None:
        query["parent_id"] = parent_id if parent_id != "" else None
        
    if search:
        import re
        safe_search = re.escape(search.strip()[:100])
        query["$or"] = [
            {"summary": {"$regex": safe_search, "$options": "i"}},
            {"key": {"$regex": safe_search, "$options": "i"}},
            {"description": {"$regex": safe_search, "$options": "i"}}
        ]
        
    issues = await db.issues.find(query).sort("order", 1).to_list(length=1000)
    result = []
    for doc in issues:
        populated = await populate_issue_relationships(doc, db)
        result.append(populated)
    return result


@router.post("", response_model=IssueResponse)
async def create_issue(
    issue_in: IssueCreate,
    db=Depends(get_database),
    current_user=Depends(get_current_user_optional)
):
    # Verify project
    if not ObjectId.is_valid(issue_in.project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")
        
    project = await db.projects.find_one({"_id": ObjectId(issue_in.project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    # Increment project issue number atomically
    updated_proj = await db.projects.find_one_and_update(
        {"_id": ObjectId(issue_in.project_id)},
        {"$inc": {"last_issue_number": 1}},
        return_document=True
    )
    issue_num = updated_proj.get("last_issue_number", 1)
    issue_key = f"{project.get('key', 'PROJ')}-{issue_num}"
    
    # Calculate initial order (max order in column + 1000)
    highest_order_doc = await db.issues.find_one(
        {"project_id": issue_in.project_id, "status": issue_in.status},
        sort=[("order", -1)]
    )
    order_val = (highest_order_doc.get("order", 0.0) + 1000.0) if highest_order_doc else 1000.0
    
    reporter = issue_in.reporter_id or (current_user["id"] if current_user else None)
    
    now = datetime.now(timezone.utc)
    issue_doc = {
        "project_id": issue_in.project_id,
        "key": issue_key,
        "summary": issue_in.summary.strip(),
        "description": issue_in.description or "",
        "type": issue_in.type or "story",
        "status": issue_in.status or "todo",
        "priority": issue_in.priority or "medium",
        "story_points": issue_in.story_points,
        "assignee_id": issue_in.assignee_id,
        "reporter_id": reporter,
        "sprint_id": issue_in.sprint_id,
        "parent_id": issue_in.parent_id,
        "epic_id": issue_in.epic_id,
        "labels": issue_in.labels or [],
        "order": order_val,
        "due_date": issue_in.due_date,
        "time_original_estimate": issue_in.time_original_estimate or 0.0,
        "time_spent": issue_in.time_spent or 0.0,
        "time_remaining": issue_in.time_remaining or issue_in.time_original_estimate or 0.0,
        "created_at": now,
        "updated_at": now
    }
    
    res = await db.issues.insert_one(issue_doc)
    issue_doc["_id"] = res.inserted_id
    issue_id_str = str(res.inserted_id)
    
    # Log activity
    await db.activity.insert_one({
        "issue_id": issue_id_str,
        "user_id": reporter,
        "action": "created_issue",
        "details": {"summary": issue_doc["summary"], "key": issue_key},
        "created_at": now
    })

    # Emit domain event for assignment if assignee assigned
    if issue_in.assignee_id:
        try:
            await emit_event("ISSUE_ASSIGNED", {
                "issue_id": issue_id_str,
                "issue_key": issue_key,
                "issue_summary": issue_doc["summary"],
                "project_name": project.get("name", "Project"),
                "priority": issue_doc["priority"],
                "assignee_id": issue_in.assignee_id,
                "assigner_id": reporter
            })
        except Exception as e:
            logger.warning(f"Failed to emit ISSUE_ASSIGNED: {e}")
    
    return await populate_issue_relationships(issue_doc, db)


@router.get("/{issue_id_or_key}", response_model=IssueResponse)
async def get_issue(issue_id_or_key: str, db=Depends(get_database)):
    query = {}
    if ObjectId.is_valid(issue_id_or_key):
        query = {"_id": ObjectId(issue_id_or_key)}
    else:
        query = {"key": issue_id_or_key.upper()}
        
    issue = await db.issues.find_one(query)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
        
    return await populate_issue_relationships(issue, db)


@router.put("/{issue_id}", response_model=IssueResponse)
async def update_issue(
    issue_id: str,
    update_in: IssueUpdate,
    db=Depends(get_database),
    current_user=Depends(get_current_user_optional)
):
    if not ObjectId.is_valid(issue_id):
        raise HTTPException(status_code=400, detail="Invalid issue ID")
        
    old_issue = await db.issues.find_one({"_id": ObjectId(issue_id)})
    if not old_issue:
        raise HTTPException(status_code=404, detail="Issue not found")
        
    data = {k: v for k, v in update_in.model_dump().items() if v is not None}
    if data:
        data["updated_at"] = datetime.now(timezone.utc)
        await db.issues.update_one({"_id": ObjectId(issue_id)}, {"$set": data})
        
        # Check and log changes in activity
        for field, new_val in data.items():
            if field in ["updated_at", "order"]:
                continue
            old_val = old_issue.get(field)
            if old_val != new_val:
                await db.activity.insert_one({
                    "issue_id": issue_id,
                    "user_id": current_user["id"] if current_user else None,
                    "action": f"updated_{field}",
                    "details": {"field": field, "old": str(old_val), "new": str(new_val)},
                    "created_at": datetime.now(timezone.utc)
                })

        # Check for assignment change
        if "assignee_id" in data and data["assignee_id"] != old_issue.get("assignee_id"):
            proj = await db.projects.find_one({"_id": ObjectId(old_issue["project_id"])})
            try:
                await emit_event("ISSUE_ASSIGNED", {
                    "issue_id": issue_id,
                    "issue_key": old_issue.get("key"),
                    "issue_summary": old_issue.get("summary"),
                    "project_name": proj.get("name", "Project") if proj else "Project",
                    "priority": old_issue.get("priority", "medium"),
                    "assignee_id": data["assignee_id"],
                    "assigner_id": current_user["id"] if current_user else None
                })
            except Exception as e:
                logger.warning(f"Failed to emit ISSUE_ASSIGNED: {e}")

        # Check for status change
        if "status" in data and data["status"] != old_issue.get("status"):
            try:
                await emit_event("ISSUE_STATUS_CHANGED", {
                    "issue_id": issue_id,
                    "issue_key": old_issue.get("key"),
                    "issue_summary": old_issue.get("summary"),
                    "old_status": old_issue.get("status"),
                    "new_status": data["status"],
                    "changed_by_id": current_user["id"] if current_user else None,
                    "reporter_id": old_issue.get("reporter_id"),
                    "assignee_id": old_issue.get("assignee_id")
                })
                if data["status"] == "done":
                    await emit_event("ISSUE_COMPLETED", {
                        "issue_id": issue_id,
                        "issue_key": old_issue.get("key"),
                        "completed_by_id": current_user["id"] if current_user else None,
                        "reporter_id": old_issue.get("reporter_id")
                    })
            except Exception as e:
                logger.warning(f"Failed to emit status event: {e}")
                
    updated_doc = await db.issues.find_one({"_id": ObjectId(issue_id)})
    return await populate_issue_relationships(updated_doc, db)


@router.patch("/{issue_id}/status", response_model=IssueResponse)
async def update_issue_status(
    issue_id: str,
    status_in: IssueStatusUpdate,
    db=Depends(get_database),
    current_user=Depends(get_current_user_optional)
):
    if not ObjectId.is_valid(issue_id):
        raise HTTPException(status_code=400, detail="Invalid issue ID")
        
    old_issue = await db.issues.find_one({"_id": ObjectId(issue_id)})
    if not old_issue:
        raise HTTPException(status_code=404, detail="Issue not found")
        
    update_data = {
        "status": status_in.status,
        "updated_at": datetime.now(timezone.utc)
    }
    if status_in.order is not None:
        update_data["order"] = status_in.order
    if status_in.sprint_id is not None:
        update_data["sprint_id"] = status_in.sprint_id if status_in.sprint_id != "backlog" else None
        
    await db.issues.update_one({"_id": ObjectId(issue_id)}, {"$set": update_data})
    
    # Log status change activity and emit domain event
    if old_issue.get("status") != status_in.status:
        await db.activity.insert_one({
            "issue_id": issue_id,
            "user_id": current_user["id"] if current_user else None,
            "action": "changed_status",
            "details": {"old_status": old_issue.get("status"), "new_status": status_in.status},
            "created_at": datetime.now(timezone.utc)
        })

        try:
            await emit_event("ISSUE_STATUS_CHANGED", {
                "issue_id": issue_id,
                "issue_key": old_issue.get("key"),
                "issue_summary": old_issue.get("summary"),
                "old_status": old_issue.get("status"),
                "new_status": status_in.status,
                "changed_by_id": current_user["id"] if current_user else None,
                "reporter_id": old_issue.get("reporter_id"),
                "assignee_id": old_issue.get("assignee_id")
            })
            if status_in.status == "done":
                await emit_event("ISSUE_COMPLETED", {
                    "issue_id": issue_id,
                    "issue_key": old_issue.get("key"),
                    "completed_by_id": current_user["id"] if current_user else None,
                    "reporter_id": old_issue.get("reporter_id")
                })
        except Exception as e:
            logger.warning(f"Failed to emit status event: {e}")
        
    updated_doc = await db.issues.find_one({"_id": ObjectId(issue_id)})
    return await populate_issue_relationships(updated_doc, db)


@router.patch("/{issue_id}/reorder")
async def reorder_issue(issue_id: str, reorder_req: IssueReorderRequest, db=Depends(get_database)):
    if not ObjectId.is_valid(issue_id):
        raise HTTPException(status_code=400, detail="Invalid issue ID")
        
    update_data = {"order": reorder_req.order, "updated_at": datetime.now(timezone.utc)}
    if reorder_req.status:
        update_data["status"] = reorder_req.status
    if reorder_req.sprint_id is not None:
        update_data["sprint_id"] = reorder_req.sprint_id if reorder_req.sprint_id != "backlog" else None
        
    await db.issues.update_one({"_id": ObjectId(issue_id)}, {"$set": update_data})
    return {"message": "Reordered successfully"}


@router.get("/{issue_id}/subtasks", response_model=list[IssueResponse])
async def get_subtasks(issue_id: str, db=Depends(get_database)):
    subtasks = await db.issues.find({"parent_id": issue_id}).sort("created_at", 1).to_list(length=100)
    result = []
    for s in subtasks:
        result.append(await populate_issue_relationships(s, db))
    return result


@router.get("/search/unified")
async def unified_search_issues(
    q: str = Query(..., min_length=2),
    scope: str = Query("all"),
    org_id: Optional[str] = Query(None),
    db=Depends(get_database)
):
    import re
    from app.core.database import serialize_doc
    clean_q = q.strip()
    regex_pattern = re.compile(re.escape(clean_q), re.IGNORECASE)
    
    # Match issues by Key, Summary, Description, Tags (Case Insensitive)
    matching_issues = await db.issues.find({
        "$or": [
            {"key": regex_pattern},
            {"summary": regex_pattern},
            {"description": regex_pattern},
            {"tags": regex_pattern},
        ]
    }).sort("updated_at", -1).limit(15).to_list(15)

    issues_res = []
    for iss in matching_issues:
        doc = serialize_doc(iss)
        if doc.get("assignee_id") and ObjectId.is_valid(doc["assignee_id"]):
            assignee = await db.users.find_one({"_id": ObjectId(doc["assignee_id"])}, {"password_hash": 0})
            doc["assignee"] = serialize_doc(assignee) if assignee else None
        issues_res.append(doc)

    # Match projects
    matching_projects = await db.projects.find({
        "$or": [{"name": regex_pattern}, {"key": regex_pattern}]
    }).limit(10).to_list(10)

    # Match users
    matching_users = await db.users.find({
        "is_active": True,
        "$or": [{"name": regex_pattern}, {"email": regex_pattern}, {"company_name": regex_pattern}]
    }, {"password_hash": 0}).limit(10).to_list(10)

    # Match conversations
    matching_convos = await db.conversations.find({
        "$or": [{"name": regex_pattern}, {"description": regex_pattern}]
    }).limit(10).to_list(10)

    # Match messages
    matching_msgs = await db.messages.find({
        "content": regex_pattern
    }).sort("created_at", -1).limit(15).to_list(15)

    msgs_res = []
    for m in matching_msgs:
        doc = serialize_doc(m)
        if ObjectId.is_valid(m.get("sender_id")):
            sender = await db.users.find_one({"_id": ObjectId(m["sender_id"])}, {"password_hash": 0})
            doc["sender"] = serialize_doc(sender) if sender else None
        msgs_res.append(doc)

    return {
        "issues": issues_res,
        "projects": [serialize_doc(p) for p in matching_projects],
        "users": [serialize_doc(u) for u in matching_users],
        "conversations": [serialize_doc(c) for c in matching_convos],
        "messages": msgs_res
    }

@router.delete("/{issue_id}")
async def delete_issue(issue_id: str, db=Depends(get_database)):
    if not ObjectId.is_valid(issue_id):
        raise HTTPException(status_code=400, detail="Invalid issue ID")
        
    await db.issues.delete_one({"_id": ObjectId(issue_id)})
    # Delete child subtasks
    await db.issues.delete_many({"parent_id": issue_id})
    # Delete comments and activity
    await db.comments.delete_many({"issue_id": issue_id})
    await db.activity.delete_many({"issue_id": issue_id})
    return {"message": "Issue deleted successfully"}
