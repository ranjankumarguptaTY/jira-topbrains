from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from bson import ObjectId
from app.core.database import get_database, serialize_doc, serialize_docs
from app.core.security import (
    get_current_user,
    is_super_admin,
    can_manage_org,
    can_manage_team,
    is_org_admin,
    is_org_member,
)
from app.core.channels import create_team_broadcast, sync_team_member
from app.schemas.organization import (
    TeamCreate, TeamUpdate, TeamResponse, TeamMemberAdd, TeamMemberResponse
)

router = APIRouter(prefix="/api/teams", tags=["teams"])


@router.post("", response_model=TeamResponse)
async def create_team(
    team_in: TeamCreate,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """Create a new team within an organization. 
    Only super admins, org admins, or leads within the org can create teams.
    """
    org_id = team_in.organization_id
    if not org_id:
        raise HTTPException(status_code=400, detail="organization_id is required to create a team.")

    # Verify org exists
    if not ObjectId.is_valid(org_id):
        raise HTTPException(status_code=400, detail="Invalid organization ID")
    org = await db.organizations.find_one({"_id": ObjectId(org_id)})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Permission check: super admin, org admin, or lead in org
    if not is_super_admin(current_user):
        if not await can_manage_org(db, current_user, org_id):
            # Check if user is a lead in this org
            org_membership = await db.org_memberships.find_one({
                "organization_id": org_id,
                "user_id": current_user["id"]
            })
            if not org_membership or "lead" not in org_membership.get("roles", []):
                raise HTTPException(status_code=403, detail="Only super admins, org admins, or org leads can create teams.")

    now = datetime.now(timezone.utc)
    lead_uid = team_in.lead_user_id if (team_in.lead_user_id and ObjectId.is_valid(team_in.lead_user_id)) else None
    team_doc = {
        "name": team_in.name,
        "description": team_in.description or "",
        "organization_id": org_id,
        "lead_user_id": lead_uid,
        "created_by": current_user["id"],
        "created_at": now,
    }
    result = await db.teams.insert_one(team_doc)
    team_id = str(result.inserted_id)
    team_doc["_id"] = result.inserted_id

    # Auto-add creator to team memberships
    await db.team_memberships.insert_one({
        "team_id": team_id,
        "user_id": current_user["id"],
        "role": "lead" if (not lead_uid or lead_uid == current_user["id"]) else "member",
        "joined_at": now,
    })

    # If a different lead_user_id is specified, add them as lead
    if lead_uid and lead_uid != current_user["id"]:
        lead_user = await db.users.find_one({"_id": ObjectId(lead_uid)})
        if lead_user:
            await db.team_memberships.insert_one({
                "team_id": team_id,
                "user_id": lead_uid,
                "role": "lead",
                "joined_at": now,
            })

    # Auto-create #team broadcast channel
    await create_team_broadcast(db, team_id, team_in.name, org_id, current_user["id"])

    doc = serialize_doc(team_doc)
    doc["member_count"] = await db.team_memberships.count_documents({"team_id": team_id})
    doc["project_count"] = 0
    doc["lead_name"] = None
    if team_in.lead_user_id and ObjectId.is_valid(team_in.lead_user_id):
        lead = await db.users.find_one({"_id": ObjectId(team_in.lead_user_id)})
        if lead:
            doc["lead_name"] = lead.get("name")
    return doc


@router.get("", response_model=list[TeamResponse])
async def list_teams(
    org_id: str = Query(None, description="Filter teams by organization"),
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """List teams. Super admin/org admin sees all teams in org; others see teams they belong to."""
    if is_super_admin(current_user):
        # Super admin sees all teams, optionally filtered by org
        query = {"organization_id": org_id} if org_id else {}
        cursor = db.teams.find(query).sort("name", 1)
    elif org_id and await is_org_admin(db, current_user["id"], org_id):
        # Org admin sees all teams in their org
        cursor = db.teams.find({"organization_id": org_id}).sort("name", 1)
    else:
        # Regular users see teams they belong to
        memberships = await db.team_memberships.find({"user_id": current_user["id"]}).to_list(100)
        team_ids = [m["team_id"] for m in memberships]
        if not team_ids:
            return []
        query = {"_id": {"$in": [ObjectId(tid) for tid in team_ids if ObjectId.is_valid(tid)]}}
        if org_id:
            query["organization_id"] = org_id
        cursor = db.teams.find(query).sort("name", 1)

    teams = await cursor.to_list(100)
    result = []
    for team in teams:
        doc = serialize_doc(team)
        doc["member_count"] = await db.team_memberships.count_documents({"team_id": doc["id"]})
        doc["project_count"] = await db.projects.count_documents({"team_id": doc["id"]})
        # Get lead name
        doc["lead_name"] = None
        if doc.get("lead_user_id") and ObjectId.is_valid(doc["lead_user_id"]):
            lead = await db.users.find_one({"_id": ObjectId(doc["lead_user_id"])})
            if lead:
                doc["lead_name"] = lead.get("name")
        result.append(doc)
    return result


@router.get("/{team_id}", response_model=TeamResponse)
async def get_team(team_id: str, current_user=Depends(get_current_user), db=Depends(get_database)):
    if not ObjectId.is_valid(team_id):
        raise HTTPException(status_code=400, detail="Invalid team ID")
    team = await db.teams.find_one({"_id": ObjectId(team_id)})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    doc = serialize_doc(team)
    doc["member_count"] = await db.team_memberships.count_documents({"team_id": team_id})
    doc["project_count"] = await db.projects.count_documents({"team_id": team_id})
    doc["lead_name"] = None
    if doc.get("lead_user_id") and ObjectId.is_valid(doc["lead_user_id"]):
        lead = await db.users.find_one({"_id": ObjectId(doc["lead_user_id"])})
        if lead:
            doc["lead_name"] = lead.get("name")
    return doc


@router.patch("/{team_id}", response_model=TeamResponse)
async def update_team(
    team_id: str,
    team_in: TeamUpdate,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    if not ObjectId.is_valid(team_id):
        raise HTTPException(status_code=400, detail="Invalid team ID")

    if not await can_manage_team(db, current_user, team_id):
        raise HTTPException(status_code=403, detail="Only super admins, org admins, or team leads can update this team.")

    update_data = {k: v for k, v in team_in.model_dump().items() if v is not None}
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc)
        await db.teams.update_one({"_id": ObjectId(team_id)}, {"$set": update_data})

    team = await db.teams.find_one({"_id": ObjectId(team_id)})
    doc = serialize_doc(team)
    doc["member_count"] = await db.team_memberships.count_documents({"team_id": team_id})
    doc["project_count"] = await db.projects.count_documents({"team_id": team_id})
    doc["lead_name"] = None
    if doc.get("lead_user_id") and ObjectId.is_valid(doc["lead_user_id"]):
        lead = await db.users.find_one({"_id": ObjectId(doc["lead_user_id"])})
        if lead:
            doc["lead_name"] = lead.get("name")
    return doc


@router.delete("/{team_id}")
async def delete_team(team_id: str, current_user=Depends(get_current_user), db=Depends(get_database)):
    if not ObjectId.is_valid(team_id):
        raise HTTPException(status_code=400, detail="Invalid team ID")

    if not await can_manage_team(db, current_user, team_id):
        raise HTTPException(status_code=403, detail="Only super admins, org admins, or team leads can delete teams.")

    # Cascade: delete team memberships
    await db.team_memberships.delete_many({"team_id": team_id})

    # Delete projects in team and their memberships
    projects = await db.projects.find({"team_id": team_id}).to_list(500)
    for p in projects:
        pid = str(p["_id"])
        await db.project_memberships.delete_many({"project_id": pid})
        await db.issues.delete_many({"project_id": pid})
        await db.sprints.delete_many({"project_id": pid})
    await db.projects.delete_many({"team_id": team_id})

    # Delete team broadcast channels
    await db.conversations.delete_many({"team_id": team_id})

    # Delete team
    await db.teams.delete_one({"_id": ObjectId(team_id)})

    return {"status": "deleted"}


# =============================================
# TEAM MEMBERS
# =============================================

@router.get("/{team_id}/members", response_model=list[TeamMemberResponse])
async def list_team_members(team_id: str, current_user=Depends(get_current_user), db=Depends(get_database)):
    memberships = await db.team_memberships.find({"team_id": team_id}).to_list(200)
    result = []
    for m in memberships:
        doc = serialize_doc(m)
        # Populate user info
        if ObjectId.is_valid(m.get("user_id")):
            user = await db.users.find_one({"_id": ObjectId(m["user_id"])}, {"password_hash": 0})
            if user:
                doc["user"] = serialize_doc(user)
        result.append(doc)
    return result


@router.post("/{team_id}/members", response_model=TeamMemberResponse)
async def add_team_member(
    team_id: str,
    member_in: TeamMemberAdd,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """Add a member to a team. User must already be a member of the team's organization."""
    if not await can_manage_team(db, current_user, team_id):
        raise HTTPException(status_code=403, detail="Only super admins, org admins, or team leads can add members.")

    # Get team to check org
    team = await db.teams.find_one({"_id": ObjectId(team_id)}) if ObjectId.is_valid(team_id) else None
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    org_id = team.get("organization_id")

    # Verify user is a member of the org
    if org_id and not is_super_admin(current_user):
        org_membership = await db.org_memberships.find_one({
            "organization_id": org_id,
            "user_id": member_in.user_id
        })
        if not org_membership:
            raise HTTPException(status_code=400, detail="User must be a member of the organization before being added to a team.")

    # Check if already a member
    existing = await db.team_memberships.find_one({"team_id": team_id, "user_id": member_in.user_id})
    if existing:
        raise HTTPException(status_code=400, detail="User is already a team member.")

    # Verify user exists
    if not ObjectId.is_valid(member_in.user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")
    user = await db.users.find_one({"_id": ObjectId(member_in.user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    membership_doc = {
        "team_id": team_id,
        "user_id": member_in.user_id,
        "role": member_in.role,
        "joined_at": datetime.now(timezone.utc),
    }
    result = await db.team_memberships.insert_one(membership_doc)
    membership_doc["_id"] = result.inserted_id

    # Auto-add to team broadcast channel
    await sync_team_member(db, team_id, member_in.user_id, action="add")

    doc = serialize_doc(membership_doc)
    doc["user"] = serialize_doc(user)
    return doc


@router.delete("/{team_id}/members/{user_id}")
async def remove_team_member(
    team_id: str,
    user_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    if not await can_manage_team(db, current_user, team_id):
        raise HTTPException(status_code=403, detail="Only super admins, org admins, or team leads can remove members.")

    result = await db.team_memberships.delete_one({"team_id": team_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Membership not found")

    # Remove from team broadcast channel
    await sync_team_member(db, team_id, user_id, action="remove")

    # Also remove from projects in this team
    projects = await db.projects.find({"team_id": team_id}).to_list(500)
    for p in projects:
        pid = str(p["_id"])
        await db.project_memberships.delete_one({"project_id": pid, "user_id": user_id})
        from app.core.channels import sync_project_member
        await sync_project_member(db, pid, user_id, action="remove")

    return {"status": "removed"}
