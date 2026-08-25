from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from bson import ObjectId
from app.core.database import get_database, serialize_doc, serialize_docs
from app.core.security import (
    get_current_user,
    get_current_user_optional,
    is_super_admin,
    can_manage_team,
    can_manage_project,
    is_org_admin,
    is_org_member,
    is_team_member,
)
from app.core.channels import create_project_broadcast, sync_project_member
from app.schemas.project import (
    ProjectCreate, ProjectUpdate, ProjectResponse,
    ProjectMemberAdd, ProjectMemberResponse,
    BoardConfigUpdate, TagCreate, ColumnCreate,
)

router = APIRouter(prefix="/api/projects", tags=["projects"])

DEFAULT_PROJECT_COLUMNS = [
    {"id": "todo", "title": "To Do", "color": "#42526E"},
    {"id": "inprogress", "title": "In Progress", "color": "#0052CC"},
    {"id": "inreview", "title": "In Review", "color": "#FF8B00"},
    {"id": "done", "title": "Done", "color": "#00875A"},
]

DEFAULT_PROJECT_TAGS = [
    {"id": "frontend", "name": "Frontend", "color": "#0052CC"},
    {"id": "backend", "name": "Backend", "color": "#00875A"},
    {"id": "bug", "name": "Bug", "color": "#DE350B"},
    {"id": "feature", "name": "Feature", "color": "#6554C0"},
    {"id": "ui_ux", "name": "UI/UX", "color": "#FF8B00"},
    {"id": "api", "name": "API", "color": "#00B8D9"},
]


async def _enrich_project(db, project: dict) -> dict:
    """Add computed fields (issue_count, lead_name, team_name, org_name, member_count) to a project doc."""
    p_id = str(project["_id"]) if "_id" in project else project.get("id", "")
    
    # Issue count
    issue_count = await db.issues.count_documents({"project_id": p_id})
    
    # Lead name
    lead_name = None
    if project.get("lead_id") and ObjectId.is_valid(project["lead_id"]):
        lead = await db.users.find_one({"_id": ObjectId(project["lead_id"])})
        if lead:
            lead_name = lead.get("name")
    
    # Team name
    team_name = None
    if project.get("team_id") and ObjectId.is_valid(project["team_id"]):
        team = await db.teams.find_one({"_id": ObjectId(project["team_id"])})
        if team:
            team_name = team.get("name")
    
    # Org name
    organization_name = None
    if project.get("organization_id") and ObjectId.is_valid(project["organization_id"]):
        org = await db.organizations.find_one({"_id": ObjectId(project["organization_id"])})
        if org:
            organization_name = org.get("name")

    # Member count
    member_count = await db.project_memberships.count_documents({"project_id": p_id})

    serialized = serialize_doc(project)
    serialized["issue_count"] = issue_count
    serialized["lead_name"] = lead_name
    serialized["team_name"] = team_name
    serialized["organization_name"] = organization_name
    serialized["member_count"] = member_count
    serialized["columns"] = project.get("columns") or DEFAULT_PROJECT_COLUMNS
    serialized["tags"] = project.get("tags") or DEFAULT_PROJECT_TAGS
    return serialized


@router.get("", response_model=list[ProjectResponse])
async def list_projects(
    team_id: str = Query(None, description="Filter projects by team"),
    org_id: str = Query(None, description="Filter projects by organization"),
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """List projects accessible to the current user.
    - Super Admin: sees all projects (optionally filtered by org_id/team_id).
    - Org Admin: sees all projects in organizations where they are Admin.
    - Team Lead / Member: sees all projects in teams they belong to or project memberships.
    """
    if is_super_admin(current_user):
        query = {}
        if org_id:
            query["organization_id"] = org_id
        if team_id:
            query["team_id"] = team_id
        projects = await db.projects.find(query).sort("created_at", -1).to_list(length=200)
        return [await _enrich_project(db, p) for p in projects]

    # Find all org memberships for this user
    user_org_memberships = await db.org_memberships.find({"user_id": current_user["id"]}).to_list(100)
    admin_org_ids = [
        m["organization_id"] for m in user_org_memberships 
        if "admin" in m.get("roles", []) or "super_admin" in m.get("roles", [])
    ]
    member_org_ids = [m["organization_id"] for m in user_org_memberships]

    # Find team memberships
    user_team_memberships = await db.team_memberships.find({"user_id": current_user["id"]}).to_list(100)
    user_team_ids = [m["team_id"] for m in user_team_memberships]

    # Find project memberships
    user_project_memberships = await db.project_memberships.find({"user_id": current_user["id"]}).to_list(100)
    user_project_ids = [m["project_id"] for m in user_project_memberships]

    or_conditions = []

    # 1. If user is Org Admin for any orgs, they see all projects in those orgs
    if admin_org_ids:
        or_conditions.append({"organization_id": {"$in": admin_org_ids}})

    # 2. Projects in teams the user is part of
    if user_team_ids:
        or_conditions.append({"team_id": {"$in": user_team_ids}})

    # 3. Direct project memberships
    if user_project_ids:
        or_conditions.append({"_id": {"$in": [ObjectId(pid) for pid in user_project_ids if ObjectId.is_valid(pid)]}})

    if not or_conditions:
        return []

    final_query = {"$or": or_conditions}
    if org_id:
        final_query = {"$and": [{"organization_id": org_id}, {"$or": or_conditions}]}
    if team_id:
        if "$and" in final_query:
            final_query["$and"].append({"team_id": team_id})
        else:
            final_query = {"$and": [{"team_id": team_id}, {"$or": or_conditions}]}

    projects = await db.projects.find(final_query).sort("created_at", -1).to_list(length=200)
    return [await _enrich_project(db, p) for p in projects]


@router.post("", response_model=ProjectResponse)
async def create_project(
    proj_in: ProjectCreate,
    db=Depends(get_database),
    user=Depends(get_current_user)
):
    """Create a project. If team_id is provided, project is scoped to that team.
    Only org admins or team leads can create team-scoped projects.
    """
    key = proj_in.key.strip().upper()
    existing = await db.projects.find_one({"key": key})
    if existing:
        raise HTTPException(status_code=400, detail=f"Project with key '{key}' already exists")
    
    lead_id = proj_in.lead_id
    if not lead_id and user:
        lead_id = user["id"]
    
    # If team_id is provided, verify permissions and auto-set org_id
    org_id = proj_in.organization_id
    team_id = proj_in.team_id

    if team_id:
        if not ObjectId.is_valid(team_id):
            raise HTTPException(status_code=400, detail="Invalid team ID")
        team = await db.teams.find_one({"_id": ObjectId(team_id)})
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")
        
        # Auto-set org_id from team
        if not org_id:
            org_id = team.get("organization_id")

        # Permission: must be able to manage team
        if not await can_manage_team(db, user, team_id):
            raise HTTPException(status_code=403, detail="Only super admins, org admins, or team leads can create projects in this team.")

    avatar = proj_in.avatar_url or f"https://api.dicebear.com/7.x/identicon/svg?seed={key}"
    proj_doc = {
        "name": proj_in.name.strip(),
        "key": key,
        "description": proj_in.description or "",
        "lead_id": lead_id,
        "avatar_url": avatar,
        "category": proj_in.category or "Software",
        "team_id": team_id,
        "organization_id": org_id,
        "last_issue_number": 0,
        "created_at": datetime.now(timezone.utc)
    }
    res = await db.projects.insert_one(proj_doc)
    project_id = str(res.inserted_id)
    proj_doc["_id"] = res.inserted_id

    # Add creator as project member
    await db.project_memberships.insert_one({
        "project_id": project_id,
        "user_id": user["id"],
        "role": "lead",
        "joined_at": datetime.now(timezone.utc),
    })

    # If lead_id is different from creator, add them too
    if lead_id and lead_id != user["id"]:
        await db.project_memberships.insert_one({
            "project_id": project_id,
            "user_id": lead_id,
            "role": "lead",
            "joined_at": datetime.now(timezone.utc),
        })

    # Auto-create #project broadcast channel
    if org_id and team_id:
        await create_project_broadcast(db, project_id, proj_in.name.strip(), org_id, team_id, user["id"])

    enriched = await _enrich_project(db, proj_doc)
    return enriched


@router.get("/{project_id_or_key}", response_model=ProjectResponse)
async def get_project(project_id_or_key: str, db=Depends(get_database), user=Depends(get_current_user)):
    query = {}
    if ObjectId.is_valid(project_id_or_key):
        query = {"$or": [{"_id": ObjectId(project_id_or_key)}, {"key": project_id_or_key.upper()}]}
    else:
        query = {"key": project_id_or_key.upper()}
    
    project = await db.projects.find_one(query)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Permission check: super admin, org admin of project's org, member of project's team, or direct project member
    if not is_super_admin(user):
        pid = str(project["_id"])
        org_id = project.get("organization_id")
        team_id = project.get("team_id")
        
        is_admin = False
        if org_id:
            is_admin = await is_org_admin(db, user["id"], org_id)
            
        in_team = False
        if team_id:
            in_team = (await db.team_memberships.find_one({"team_id": team_id, "user_id": user["id"]})) is not None
            
        in_project = (await db.project_memberships.find_one({"project_id": pid, "user_id": user["id"]})) is not None
        
        if not is_admin and not in_team and not in_project:
            raise HTTPException(status_code=403, detail="You do not have access to this project. You must be a member of the project's team or an organization admin.")

    return await _enrich_project(db, project)


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, proj_update: ProjectUpdate, db=Depends(get_database), user=Depends(get_current_user)):
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")
    
    # Permission check
    if not await can_manage_project(db, user, project_id):
        raise HTTPException(status_code=403, detail="You do not have permission to update this project.")
    
    update_data = {k: v for k, v in proj_update.model_dump().items() if v is not None}
    if update_data:
        await db.projects.update_one({"_id": ObjectId(project_id)}, {"$set": update_data})
    
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return await _enrich_project(db, project)


@router.delete("/{project_id}")
async def delete_project(project_id: str, db=Depends(get_database), user=Depends(get_current_user)):
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")
    
    if not await can_manage_project(db, user, project_id):
        raise HTTPException(status_code=403, detail="You do not have permission to delete this project.")
    
    # Cascade delete
    await db.project_memberships.delete_many({"project_id": project_id})
    await db.projects.delete_one({"_id": ObjectId(project_id)})
    await db.sprints.delete_many({"project_id": project_id})
    await db.issues.delete_many({"project_id": project_id})

    # Delete project broadcast channel
    await db.conversations.delete_many({"project_id": project_id})

    return {"message": "Project and associated items deleted successfully"}


# =============================================
# PROJECT MEMBERS
# =============================================

@router.get("/{project_id}/members", response_model=list[ProjectMemberResponse])
async def list_project_members(
    project_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """List all members of a project, including members from the project's assigned team."""
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")

    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    team_id = project.get("team_id")
    user_map = {}

    # 1. Direct project memberships
    memberships = await db.project_memberships.find({"project_id": project_id}).to_list(200)
    for m in memberships:
        uid = m.get("user_id")
        if uid and ObjectId.is_valid(uid):
            user_map[uid] = {
                "id": str(m["_id"]),
                "project_id": project_id,
                "user_id": uid,
                "role": m.get("role", "member"),
                "joined_at": m.get("joined_at"),
            }

    # 2. Team memberships if project belongs to a team
    if team_id:
        team_members = await db.team_memberships.find({"team_id": team_id}).to_list(200)
        for tm in team_members:
            uid = tm.get("user_id")
            if uid and ObjectId.is_valid(uid) and uid not in user_map:
                user_map[uid] = {
                    "id": str(tm["_id"]),
                    "project_id": project_id,
                    "user_id": uid,
                    "role": tm.get("role", "member"),
                    "joined_at": tm.get("joined_at"),
                }

    result = []
    for uid, doc in user_map.items():
        user = await db.users.find_one({"_id": ObjectId(uid)}, {"password_hash": 0})
        if user:
            doc["user"] = serialize_doc(user)
            result.append(doc)

    return result


@router.post("/{project_id}/members", response_model=ProjectMemberResponse)
async def add_project_member(
    project_id: str,
    member_in: ProjectMemberAdd,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """Add a member to a project. User should be a member of the project's team."""
    if not await can_manage_project(db, current_user, project_id):
        raise HTTPException(status_code=403, detail="Only project leads, team leads, or org admins can add project members.")

    project = await db.projects.find_one({"_id": ObjectId(project_id)}) if ObjectId.is_valid(project_id) else None
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Verify user is a team member (if project is team-scoped)
    team_id = project.get("team_id")
    if team_id:
        team_membership = await db.team_memberships.find_one({
            "team_id": team_id,
            "user_id": member_in.user_id
        })
        if not team_membership and not is_super_admin(current_user):
            raise HTTPException(status_code=400, detail="User must be a member of the project's team before being added to the project.")

    # Check if already a member
    existing = await db.project_memberships.find_one({
        "project_id": project_id,
        "user_id": member_in.user_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="User is already a project member.")

    # Verify user exists
    if not ObjectId.is_valid(member_in.user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")
    user = await db.users.find_one({"_id": ObjectId(member_in.user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    membership_doc = {
        "project_id": project_id,
        "user_id": member_in.user_id,
        "role": member_in.role,
        "joined_at": datetime.now(timezone.utc),
    }
    result = await db.project_memberships.insert_one(membership_doc)
    membership_doc["_id"] = result.inserted_id

    # Auto-add to project broadcast channel
    await sync_project_member(db, project_id, member_in.user_id, action="add")

    doc = serialize_doc(membership_doc)
    doc["user"] = serialize_doc(user)
    return doc


@router.delete("/{project_id}/members/{user_id}")
async def remove_project_member(
    project_id: str,
    user_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """Remove a member from a project."""
    if not await can_manage_project(db, current_user, project_id):
        raise HTTPException(status_code=403, detail="Only project leads, team leads, or org admins can remove project members.")

    result = await db.project_memberships.delete_one({"project_id": project_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Membership not found")

    # Remove from project broadcast channel
    await sync_project_member(db, project_id, user_id, action="remove")

    return {"status": "removed"}


# =============================================
# BOARD CONFIGURATION & CUSTOM CARDS / TAGS
# =============================================

@router.get("/{project_id}/board-config")
async def get_project_board_config(
    project_id: str,
    db=Depends(get_database),
    user=Depends(get_current_user)
):
    """Get board columns and tags for the project."""
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return {
        "columns": project.get("columns") or DEFAULT_PROJECT_COLUMNS,
        "tags": project.get("tags") or DEFAULT_PROJECT_TAGS
    }


@router.put("/{project_id}/board-config")
async def update_project_board_config(
    project_id: str,
    config_in: BoardConfigUpdate,
    db=Depends(get_database),
    user=Depends(get_current_user)
):
    """Update board columns and/or tags for the project. Only Org Admins, Project Leads, or Team Leads."""
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")
    
    if not await can_manage_project(db, user, project_id):
        raise HTTPException(status_code=403, detail="Only Organization Admins, Project Leads, or Team Leads can customize the board.")
    
    updates = {}
    if config_in.columns is not None:
        updates["columns"] = config_in.columns
    if config_in.tags is not None:
        updates["tags"] = config_in.tags
        
    if updates:
        await db.projects.update_one({"_id": ObjectId(project_id)}, {"$set": updates})
        
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    return {
        "columns": project.get("columns") or DEFAULT_PROJECT_COLUMNS,
        "tags": project.get("tags") or DEFAULT_PROJECT_TAGS
    }


@router.post("/{project_id}/tags")
async def add_project_tag(
    project_id: str,
    tag_in: TagCreate,
    db=Depends(get_database),
    user=Depends(get_current_user)
):
    """Add a new tag/label to the project."""
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")
    
    if not await can_manage_project(db, user, project_id):
        raise HTTPException(status_code=403, detail="Only Organization Admins, Project Leads, or Team Leads can add tags.")
    
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    import re
    tag_id = tag_in.id.strip().lower() if tag_in.id else re.sub(r'[^a-z0-9_]', '_', tag_in.name.strip().lower()).strip('_')
    existing_tags = list(project.get("tags") or DEFAULT_PROJECT_TAGS)
    
    if any(t["id"] == tag_id or t["name"].lower() == tag_in.name.strip().lower() for t in existing_tags):
        raise HTTPException(status_code=400, detail=f"Tag '{tag_in.name}' already exists in this project.")
        
    new_tag = {
        "id": tag_id,
        "name": tag_in.name.strip(),
        "color": tag_in.color or "#0052CC"
    }
    existing_tags.append(new_tag)
    
    await db.projects.update_one(
        {"_id": ObjectId(project_id)},
        {"$set": {"tags": existing_tags}}
    )
    return new_tag


@router.delete("/{project_id}/tags/{tag_id}")
async def delete_project_tag(
    project_id: str,
    tag_id: str,
    db=Depends(get_database),
    user=Depends(get_current_user)
):
    """Delete a tag from the project."""
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")
    
    if not await can_manage_project(db, user, project_id):
        raise HTTPException(status_code=403, detail="Only Organization Admins, Project Leads, or Team Leads can delete tags.")
    
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    existing_tags = list(project.get("tags") or DEFAULT_PROJECT_TAGS)
    updated_tags = [t for t in existing_tags if t["id"] != tag_id]
    
    await db.projects.update_one(
        {"_id": ObjectId(project_id)},
        {"$set": {"tags": updated_tags}}
    )
    return {"status": "deleted", "tag_id": tag_id}


@router.post("/{project_id}/columns")
async def add_project_column(
    project_id: str,
    column_in: ColumnCreate,
    db=Depends(get_database),
    user=Depends(get_current_user)
):
    """Add a new column / status to the active board."""
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")
    
    if not await can_manage_project(db, user, project_id):
        raise HTTPException(status_code=403, detail="Only Organization Admins, Project Leads, or Team Leads can add board columns.")
    
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    import re
    col_id = column_in.id.strip().lower() if column_in.id else re.sub(r'[^a-z0-9_]', '', column_in.title.strip().lower())
    existing_columns = list(project.get("columns") or DEFAULT_PROJECT_COLUMNS)
    
    if any(c["id"] == col_id for c in existing_columns):
        raise HTTPException(status_code=400, detail=f"Column with key '{col_id}' already exists.")
        
    new_column = {
        "id": col_id,
        "title": column_in.title.strip(),
        "color": column_in.color or "#42526E"
    }
    # Insert right before the last column (which is usually 'done') or at end
    if len(existing_columns) > 0 and existing_columns[-1]["id"] == "done":
        existing_columns.insert(len(existing_columns) - 1, new_column)
    else:
        existing_columns.append(new_column)
        
    await db.projects.update_one(
        {"_id": ObjectId(project_id)},
        {"$set": {"columns": existing_columns}}
    )
    return new_column


@router.delete("/{project_id}/columns/{column_id}")
async def delete_project_column(
    project_id: str,
    column_id: str,
    db=Depends(get_database),
    user=Depends(get_current_user)
):
    """Delete a column from the active board."""
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")
    
    if not await can_manage_project(db, user, project_id):
        raise HTTPException(status_code=403, detail="Only Organization Admins, Project Leads, or Team Leads can delete board columns.")
    
    if column_id in ("todo", "done"):
        raise HTTPException(status_code=400, detail="Cannot delete default 'todo' or 'done' columns.")
        
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    existing_columns = list(project.get("columns") or DEFAULT_PROJECT_COLUMNS)
    updated_columns = [c for c in existing_columns if c["id"] != column_id]
    
    # Move any issues in this deleted column to 'todo'
    await db.issues.update_many(
        {"project_id": project_id, "status": column_id},
        {"$set": {"status": "todo"}}
    )
    
    await db.projects.update_one(
        {"_id": ObjectId(project_id)},
        {"$set": {"columns": updated_columns}}
    )
    return {"status": "deleted", "column_id": column_id}

