from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from app.core.database import get_database, serialize_doc, serialize_docs
from app.core.security import get_current_user
from app.schemas.organization import (
    OrganizationCreate, OrganizationUpdate, OrganizationResponse
)

router = APIRouter(prefix="/api/organizations", tags=["organizations"])


@router.post("", response_model=OrganizationResponse)
async def create_organization(
    org_in: OrganizationCreate,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """Create organization (Super Admin only)."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only Super Admins can create organizations.")

    now = datetime.now(timezone.utc)
    org_doc = {
        "name": org_in.name,
        "description": org_in.description or "",
        "logo_url": org_in.logo_url,
        "created_by": current_user["id"],
        "created_at": now,
        "updated_at": now
    }
    result = await db.organizations.insert_one(org_doc)
    org_doc["_id"] = result.inserted_id
    return serialize_doc(org_doc)


@router.get("/mine", response_model=OrganizationResponse)
async def get_my_organization(
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """Get the current user's organization or the default top-level organization."""
    # Find organization or create default
    org = await db.organizations.find_one()
    if not org:
        now = datetime.now(timezone.utc)
        default_org = {
            "name": "TopBrains Organization",
            "description": "Unified Collaboration and Work Management Workspace",
            "logo_url": None,
            "created_by": current_user["id"],
            "created_at": now,
            "updated_at": now
        }
        res = await db.organizations.insert_one(default_org)
        default_org["_id"] = res.inserted_id
        return serialize_doc(default_org)

    return serialize_doc(org)


@router.patch("/{org_id}", response_model=OrganizationResponse)
async def update_organization(
    org_id: str,
    org_in: OrganizationUpdate,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only Super Admins can update organization settings.")

    if not ObjectId.is_valid(org_id):
        raise HTTPException(status_code=400, detail="Invalid organization ID")

    update_data = {k: v for k, v in org_in.model_dump().items() if v is not None}
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc)
        await db.organizations.update_one({"_id": ObjectId(org_id)}, {"$set": update_data})

    org = await db.organizations.find_one({"_id": ObjectId(org_id)})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return serialize_doc(org)
