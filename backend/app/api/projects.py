from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from app.core.database import get_database, serialize_doc, serialize_docs
from app.core.security import get_current_user_optional
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse

router = APIRouter(prefix="/api/projects", tags=["projects"])

@router.get("", response_model=list[ProjectResponse])
async def list_projects(db=Depends(get_database)):
    projects = await db.projects.find().sort("created_at", -1).to_list(length=100)
    result = []
    for p in projects:
        p_id = str(p["_id"])
        # Get issue count
        issue_count = await db.issues.count_documents({"project_id": p_id})
        
        # Get lead name
        lead_name = None
        if p.get("lead_id") and ObjectId.is_valid(p["lead_id"]):
            lead = await db.users.find_one({"_id": ObjectId(p["lead_id"])})
            if lead:
                lead_name = lead.get("name")
        
        serialized = serialize_doc(p)
        serialized["issue_count"] = issue_count
        serialized["lead_name"] = lead_name
        result.append(serialized)
    return result

@router.post("", response_model=ProjectResponse)
async def create_project(proj_in: ProjectCreate, db=Depends(get_database), user=Depends(get_current_user_optional)):
    key = proj_in.key.strip().upper()
    existing = await db.projects.find_one({"key": key})
    if existing:
        raise HTTPException(status_code=400, detail=f"Project with key '{key}' already exists")
    
    lead_id = proj_in.lead_id
    if not lead_id and user:
        lead_id = user["id"]
    
    avatar = proj_in.avatar_url or f"https://api.dicebear.com/7.x/identicon/svg?seed={key}"
    proj_doc = {
        "name": proj_in.name.strip(),
        "key": key,
        "description": proj_in.description or "",
        "lead_id": lead_id,
        "avatar_url": avatar,
        "category": proj_in.category or "Software",
        "last_issue_number": 0,
        "created_at": datetime.now(timezone.utc)
    }
    res = await db.projects.insert_one(proj_doc)
    proj_doc["_id"] = res.inserted_id
    serialized = serialize_doc(proj_doc)
    serialized["issue_count"] = 0
    return serialized

@router.get("/{project_id_or_key}", response_model=ProjectResponse)
async def get_project(project_id_or_key: str, db=Depends(get_database)):
    query = {}
    if ObjectId.is_valid(project_id_or_key):
        query = {"$or": [{"_id": ObjectId(project_id_or_key)}, {"key": project_id_or_key.upper()}]}
    else:
        query = {"key": project_id_or_key.upper()}
    
    project = await db.projects.find_one(query)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    p_id = str(project["_id"])
    issue_count = await db.issues.count_documents({"project_id": p_id})
    lead_name = None
    if project.get("lead_id") and ObjectId.is_valid(project["lead_id"]):
        lead = await db.users.find_one({"_id": ObjectId(project["lead_id"])})
        if lead:
            lead_name = lead.get("name")
            
    serialized = serialize_doc(project)
    serialized["issue_count"] = issue_count
    serialized["lead_name"] = lead_name
    return serialized

@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, proj_update: ProjectUpdate, db=Depends(get_database)):
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")
    
    update_data = {k: v for k, v in proj_update.model_dump().items() if v is not None}
    if update_data:
        await db.projects.update_one({"_id": ObjectId(project_id)}, {"$set": update_data})
    
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    issue_count = await db.issues.count_documents({"project_id": project_id})
    serialized = serialize_doc(project)
    serialized["issue_count"] = issue_count
    return serialized

@router.delete("/{project_id}")
async def delete_project(project_id: str, db=Depends(get_database)):
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")
    
    # Cascade delete
    await db.projects.delete_one({"_id": ObjectId(project_id)})
    await db.sprints.delete_many({"project_id": project_id})
    await db.issues.delete_many({"project_id": project_id})
    return {"message": "Project and associated items deleted successfully"}
