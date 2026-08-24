from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from app.core.database import get_database, serialize_doc, serialize_docs
from app.core.security import get_current_user
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
    """Create a new team. Only admins and team_heads can create teams."""
    if current_user.get("role") not in ("admin", "team_head"):
        raise HTTPException(status_code=403, detail="Only admins or team heads can create teams.")

    team_doc = {
        "name": team_in.name,
        "description": team_in.description or "",
        "organization_id": team_in.organization_id,
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.teams.insert_one(team_doc)
    team_doc["_id"] = result.inserted_id

    # Auto-add creator as team_head member
    await db.team_memberships.insert_one({
        "team_id": str(result.inserted_id),
        "user_id": current_user["id"],
        "role": "team_head",
        "joined_at": datetime.now(timezone.utc),
    })

    doc = serialize_doc(team_doc)
    doc["member_count"] = 1
    return doc


@router.get("", response_model=list[TeamResponse])
async def list_teams(current_user=Depends(get_current_user), db=Depends(get_database)):
    """List all teams visible to the current user."""
    if current_user.get("role") == "admin":
        # Admins see all teams
        cursor = db.teams.find().sort("name", 1)
    else:
        # Regular users see teams they belong to
        memberships = await db.team_memberships.find({"user_id": current_user["id"]}).to_list(100)
        team_ids = [m["team_id"] for m in memberships]
        if not team_ids:
            return []
        cursor = db.teams.find({"_id": {"$in": [ObjectId(tid) for tid in team_ids]}}).sort("name", 1)

    teams = await cursor.to_list(100)
    result = []
    for team in teams:
        doc = serialize_doc(team)
        count = await db.team_memberships.count_documents({"team_id": doc["id"]})
        doc["member_count"] = count
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

    # Check permissions: admin or team_head of this team
    if current_user.get("role") != "admin":
        membership = await db.team_memberships.find_one({
            "team_id": team_id, "user_id": current_user["id"], "role": "team_head"
        })
        if not membership:
            raise HTTPException(status_code=403, detail="Only admins or the team head can update this team.")

    update_data = {k: v for k, v in team_in.model_dump().items() if v is not None}
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc)
        await db.teams.update_one({"_id": ObjectId(team_id)}, {"$set": update_data})

    team = await db.teams.find_one({"_id": ObjectId(team_id)})
    doc = serialize_doc(team)
    doc["member_count"] = await db.team_memberships.count_documents({"team_id": team_id})
    return doc


@router.delete("/{team_id}")
async def delete_team(team_id: str, current_user=Depends(get_current_user), db=Depends(get_database)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete teams.")
    if not ObjectId.is_valid(team_id):
        raise HTTPException(status_code=400, detail="Invalid team ID")
    await db.teams.delete_one({"_id": ObjectId(team_id)})
    await db.team_memberships.delete_many({"team_id": team_id})
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
    # Verify permissions
    if current_user.get("role") != "admin":
        membership = await db.team_memberships.find_one({
            "team_id": team_id, "user_id": current_user["id"], "role": "team_head"
        })
        if not membership:
            raise HTTPException(status_code=403, detail="Only admins or team heads can add members.")

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
    if current_user.get("role") != "admin":
        membership = await db.team_memberships.find_one({
            "team_id": team_id, "user_id": current_user["id"], "role": "team_head"
        })
        if not membership:
            raise HTTPException(status_code=403, detail="Only admins or team heads can remove members.")

    result = await db.team_memberships.delete_one({"team_id": team_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Membership not found")
    return {"status": "removed"}
