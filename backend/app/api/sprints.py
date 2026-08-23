from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from app.core.database import get_database, serialize_doc, serialize_docs
from app.schemas.sprint import (
    SprintCreate,
    SprintUpdate,
    SprintStartRequest,
    SprintCompleteRequest,
    SprintResponse
)

router = APIRouter(prefix="/api/sprints", tags=["sprints"])

@router.get("/project/{project_id}", response_model=list[SprintResponse])
async def get_project_sprints(project_id: str, db=Depends(get_database)):
    sprints = await db.sprints.find({"project_id": project_id}).sort("created_at", 1).to_list(length=100)
    result = []
    for s in sprints:
        s_id = str(s["_id"])
        # Calculate stats
        issues = await db.issues.find({"sprint_id": s_id}).to_list(length=500)
        total_pts = sum(i.get("story_points", 0) or 0 for i in issues)
        completed_pts = sum(i.get("story_points", 0) or 0 for i in issues if i.get("status") == "done")
        
        serialized = serialize_doc(s)
        serialized["issue_count"] = len(issues)
        serialized["total_story_points"] = total_pts
        serialized["completed_story_points"] = completed_pts
        result.append(serialized)
    return result

@router.post("", response_model=SprintResponse)
async def create_sprint(sprint_in: SprintCreate, db=Depends(get_database)):
    doc = {
        "project_id": sprint_in.project_id,
        "name": sprint_in.name.strip(),
        "goal": sprint_in.goal or "",
        "start_date": sprint_in.start_date,
        "end_date": sprint_in.end_date,
        "status": "future",
        "created_at": datetime.now(timezone.utc)
    }
    res = await db.sprints.insert_one(doc)
    doc["_id"] = res.inserted_id
    serialized = serialize_doc(doc)
    serialized["issue_count"] = 0
    serialized["total_story_points"] = 0
    serialized["completed_story_points"] = 0
    return serialized

@router.put("/{sprint_id}", response_model=SprintResponse)
async def update_sprint(sprint_id: str, update_in: SprintUpdate, db=Depends(get_database)):
    if not ObjectId.is_valid(sprint_id):
        raise HTTPException(status_code=400, detail="Invalid sprint ID")
        
    data = {k: v for k, v in update_in.model_dump().items() if v is not None}
    if data:
        await db.sprints.update_one({"_id": ObjectId(sprint_id)}, {"$set": data})
        
    sprint = await db.sprints.find_one({"_id": ObjectId(sprint_id)})
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
        
    issues = await db.issues.find({"sprint_id": sprint_id}).to_list(length=500)
    total_pts = sum(i.get("story_points", 0) or 0 for i in issues)
    completed_pts = sum(i.get("story_points", 0) or 0 for i in issues if i.get("status") == "done")
    
    serialized = serialize_doc(sprint)
    serialized["issue_count"] = len(issues)
    serialized["total_story_points"] = total_pts
    serialized["completed_story_points"] = completed_pts
    return serialized

@router.post("/{sprint_id}/start", response_model=SprintResponse)
async def start_sprint(sprint_id: str, start_req: SprintStartRequest, db=Depends(get_database)):
    if not ObjectId.is_valid(sprint_id):
        raise HTTPException(status_code=400, detail="Invalid sprint ID")
        
    sprint = await db.sprints.find_one({"_id": ObjectId(sprint_id)})
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
        
    start_dt = start_req.start_date or datetime.now(timezone.utc)
    duration_days = (start_req.duration_weeks or 2) * 7
    end_dt = start_req.end_date or (start_dt + timedelta(days=duration_days))
    
    update_fields = {
        "status": "active",
        "start_date": start_dt,
        "end_date": end_dt
    }
    if start_req.name:
        update_fields["name"] = start_req.name
    if start_req.goal is not None:
        update_fields["goal"] = start_req.goal
        
    await db.sprints.update_one({"_id": ObjectId(sprint_id)}, {"$set": update_fields})
    sprint = await db.sprints.find_one({"_id": ObjectId(sprint_id)})
    
    issues = await db.issues.find({"sprint_id": sprint_id}).to_list(length=500)
    total_pts = sum(i.get("story_points", 0) or 0 for i in issues)
    completed_pts = sum(i.get("story_points", 0) or 0 for i in issues if i.get("status") == "done")
    
    serialized = serialize_doc(sprint)
    serialized["issue_count"] = len(issues)
    serialized["total_story_points"] = total_pts
    serialized["completed_story_points"] = completed_pts
    return serialized

@router.post("/{sprint_id}/complete")
async def complete_sprint(sprint_id: str, complete_req: SprintCompleteRequest, db=Depends(get_database)):
    if not ObjectId.is_valid(sprint_id):
        raise HTTPException(status_code=400, detail="Invalid sprint ID")
        
    sprint = await db.sprints.find_one({"_id": ObjectId(sprint_id)})
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
        
    # Mark sprint as closed
    await db.sprints.update_one({"_id": ObjectId(sprint_id)}, {"$set": {"status": "closed", "completed_at": datetime.now(timezone.utc)}})
    
    # Incomplete issues handling
    target_sprint_id = complete_req.move_incomplete_to_sprint_id
    if target_sprint_id and not ObjectId.is_valid(target_sprint_id):
        target_sprint_id = None
        
    # Find incomplete issues
    incomplete_filter = {
        "sprint_id": sprint_id,
        "status": {"$ne": "done"}
    }
    
    update_res = await db.issues.update_many(
        incomplete_filter,
        {"$set": {"sprint_id": target_sprint_id}}
    )
    
    return {
        "message": "Sprint completed successfully",
        "moved_issues_count": update_res.modified_count,
        "destination": target_sprint_id or "Backlog"
    }

@router.delete("/{sprint_id}")
async def delete_sprint(sprint_id: str, db=Depends(get_database)):
    if not ObjectId.is_valid(sprint_id):
        raise HTTPException(status_code=400, detail="Invalid sprint ID")
        
    # Move sprint issues back to backlog
    await db.issues.update_many({"sprint_id": sprint_id}, {"$set": {"sprint_id": None}})
    await db.sprints.delete_one({"_id": ObjectId(sprint_id)})
    return {"message": "Sprint deleted and issues moved to backlog"}
