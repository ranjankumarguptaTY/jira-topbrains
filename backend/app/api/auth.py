from datetime import datetime, timezone
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status, Query
from bson import ObjectId
from app.core.database import get_database, serialize_doc, serialize_docs
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user,
    is_super_admin,
    is_org_admin,
)
from app.schemas.user import UserCreate, AdminUserCreate, UserLogin, UserResponse, UserStatusUpdate, TokenResponse, PasswordChangeRequest

router = APIRouter(prefix="/api/auth", tags=["auth"])

class RoleUpdateRequest(BaseModel):
    role: str

@router.post("/register", response_model=TokenResponse)
async def register(user_in: UserCreate, db=Depends(get_database)):
    """Public registration — users register as common users (no role assignment).
    Role is assigned when they get added to an organization by an org admin.
    """
    existing = await db.users.find_one({"email": user_in.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    avatar = user_in.avatar_url or f"https://api.dicebear.com/7.x/avataaars/svg?seed={user_in.name}"
    user_doc = {
        "email": user_in.email.lower(),
        "name": user_in.name,
        "company_name": user_in.company_name or "",
        "password_hash": get_password_hash(user_in.password),
        "avatar_url": avatar,
        "role": "member",  # Always member — org-level roles are managed via org_memberships
        "is_active": True,
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id
    serialized_user = serialize_doc(user_doc)
    
    access_token = create_access_token(data={"sub": serialized_user["id"], "email": serialized_user["email"]})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": serialized_user
    }

@router.post("/login", response_model=TokenResponse)
async def login(user_in: UserLogin, db=Depends(get_database)):
    user = await db.users.find_one({"email": user_in.email.lower()})
    if not user or not verify_password(user_in.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Check if account is active
    if user.get("is_active") is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated by a workspace administrator. You cannot log in, but your previous contributions remain preserved."
        )
    
    serialized_user = serialize_doc(user)
    access_token = create_access_token(data={"sub": serialized_user["id"], "email": serialized_user["email"]})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": serialized_user
    }

@router.get("/me", response_model=UserResponse)
async def get_me(current_user=Depends(get_current_user)):
    return current_user

@router.get("/users", response_model=list[UserResponse])
async def list_users(
    org_id: str = Query(None, description="Filter users by organization membership"),
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """List users. Super admin sees all; org admin sees users in their org; others see users in shared orgs."""
    if org_id:
        # Return users in the specified org
        memberships = await db.org_memberships.find({"organization_id": org_id}).to_list(500)
        user_ids = [m["user_id"] for m in memberships if ObjectId.is_valid(m.get("user_id"))]
        if not user_ids:
            return []
        cursor = db.users.find(
            {"_id": {"$in": [ObjectId(uid) for uid in user_ids]}},
            {"password_hash": 0}
        ).sort("name", 1)
        users = await cursor.to_list(length=500)
        result = []
        for u in users:
            doc = serialize_doc(u)
            # Attach org roles
            membership = next((m for m in memberships if m.get("user_id") == doc["id"]), None)
            if membership:
                doc["org_roles"] = membership.get("roles", [])
            result.append(doc)
        return result
    else:
        if is_super_admin(current_user):
            cursor = db.users.find({}, {"password_hash": 0}).sort("name", 1)
            users = await cursor.to_list(length=500)
            return serialize_docs(users)
        else:
            # Non-super-admins only see users within their organizations
            my_memberships = await db.org_memberships.find({"user_id": current_user["id"]}).to_list(100)
            my_org_ids = [m["organization_id"] for m in my_memberships]
            if not my_org_ids:
                user = await db.users.find_one({"_id": ObjectId(current_user["id"])}, {"password_hash": 0})
                return [serialize_doc(user)] if user else []
            
            org_memberships = await db.org_memberships.find({"organization_id": {"$in": my_org_ids}}).to_list(500)
            shared_user_ids = list(set([m["user_id"] for m in org_memberships if ObjectId.is_valid(m.get("user_id"))]))
            cursor = db.users.find(
                {"_id": {"$in": [ObjectId(uid) for uid in shared_user_ids]}},
                {"password_hash": 0}
            ).sort("name", 1)
            users = await cursor.to_list(length=500)
            return serialize_docs(users)

@router.get("/search", response_model=list[UserResponse])
async def search_users(
    q: str = Query(..., min_length=1),
    org_id: str = Query(None, description="Scope search to organization members"),
    limit: int = Query(10, ge=1, le=50, description="Max users to return (default 10)"),
    include_self: bool = Query(False, description="Whether to include the current user in search results"),
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """Search registered users by name or email query."""
    regex_pattern = {"$regex": q.strip(), "$options": "i"}
    
    query_filter = {
        "$or": [{"name": regex_pattern}, {"email": regex_pattern}]
    }
    if not include_self and ObjectId.is_valid(current_user.get("id")):
        query_filter["_id"] = {"$ne": ObjectId(current_user["id"])}

    # If org_id provided, only search within org members
    if org_id:
        memberships = await db.org_memberships.find({"organization_id": org_id}).to_list(500)
        org_user_ids = [ObjectId(m["user_id"]) for m in memberships if ObjectId.is_valid(m.get("user_id"))]
        if not org_user_ids:
            return []
        if not include_self:
            query_filter["_id"] = {"$ne": ObjectId(current_user["id"]), "$in": org_user_ids}
        else:
            query_filter["_id"] = {"$in": org_user_ids}
    
    cursor = db.users.find(query_filter, {"password_hash": 0}).limit(limit)
    users = await cursor.to_list(length=limit)

    # Get current user's org memberships to determine internal vs external
    my_orgs = await db.org_memberships.find({"user_id": current_user["id"]}).to_list(100)
    my_org_ids = set(m["organization_id"] for m in my_orgs)

    result = []
    for u in users:
        doc = serialize_doc(u)
        u_orgs = await db.org_memberships.find({"user_id": doc["id"]}).to_list(100)
        u_org_ids = set(m["organization_id"] for m in u_orgs)
        # If they share at least one org, internal; else external
        shared = bool(my_org_ids & u_org_ids)
        doc["is_external"] = not shared if (my_org_ids or u_org_ids) else False
        result.append(doc)

    return result

@router.post("/admin/create-user", response_model=UserResponse)
async def admin_create_user(
    user_in: AdminUserCreate,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """Create a user with a specific role. 
    Super admin can create any role including org_admin.
    Org admins can create lead/member roles (handled at org membership level).
    """
    if not is_super_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super administrators can create users with elevated roles."
        )
    
    existing = await db.users.find_one({"email": user_in.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    avatar = user_in.avatar_url or f"https://api.dicebear.com/7.x/avataaars/svg?seed={user_in.name}"
    user_doc = {
        "email": user_in.email.lower(),
        "name": user_in.name,
        "password_hash": get_password_hash(user_in.password),
        "avatar_url": avatar,
        "role": user_in.role or "member",
        "is_active": True,
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id
    return serialize_doc(user_doc)

@router.patch("/admin/users/{user_id}/role", response_model=UserResponse)
async def admin_update_user_role(
    user_id: str,
    role_in: RoleUpdateRequest,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """Update a user's platform-level role. Super admin only."""
    if not is_super_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super administrators can update platform-level user roles."
        )
        
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")
        
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"role": role_in.role}}
    )
    user = await db.users.find_one({"_id": ObjectId(user_id)}, {"password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return serialize_doc(user)

@router.patch("/admin/users/{user_id}/status", response_model=UserResponse)
async def admin_update_user_status(
    user_id: str,
    status_in: UserStatusUpdate,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """Deactivate or reactivate a user. Preserves all their issues, comments, and audit history."""
    if not is_super_admin(current_user):
        # Check if current user is org admin of any shared org
        user_orgs = await db.org_memberships.find({"user_id": user_id}).to_list(100)
        has_permission = False
        for m in user_orgs:
            if await is_org_admin(db, current_user["id"], m["organization_id"]):
                has_permission = True
                break
        if not has_permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only super administrators or org administrators can deactivate/activate users."
            )
        
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")

    # Safety check: Cannot deactivate oneself
    if str(user_id) == str(current_user["id"]):
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account.")

    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Safety check: Cannot deactivate master admin admin@topbrains.com
    if user.get("email") == "admin@topbrains.com" and not status_in.is_active:
        raise HTTPException(status_code=400, detail="The master root administrator account cannot be deactivated.")

    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"is_active": status_in.is_active, "updated_at": datetime.now(timezone.utc)}}
    )
    
    updated = await db.users.find_one({"_id": ObjectId(user_id)}, {"password_hash": 0})
    return serialize_doc(updated)

class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    company_name: Optional[str] = None

@router.put("/profile", response_model=UserResponse)
async def update_profile(
    req: ProfileUpdateRequest,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    update_data = {}
    if req.name is not None:
        update_data["name"] = req.name.strip()
    if req.company_name is not None:
        update_data["company_name"] = req.company_name.strip()

    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc)
        await db.users.update_one(
            {"_id": ObjectId(current_user["id"])},
            {"$set": update_data}
        )
    
    updated_user = await db.users.find_one({"_id": ObjectId(current_user["id"])})
    return serialize_doc(updated_user)

@router.post("/change-password")
async def change_password(
    req: PasswordChangeRequest,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """Change current user's password with old password verification."""
    user = await db.users.find_one({"_id": ObjectId(current_user["id"])})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not verify_password(req.current_password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=400,
            detail="Current password does not match. If you don't remember your old password, please contact your Organization Administrator to reset your password."
        )
    
    new_hash = get_password_hash(req.new_password)
    await db.users.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {"password_hash": new_hash, "updated_at": datetime.now(timezone.utc)}}
    )
    return {"message": "Password changed successfully"}

@router.post("/admin/users/{user_id}/reset-password-default")
async def admin_reset_password_default(
    user_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """Admin resets a user's password to the default 'Password@123'."""
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")

    # Super admin or org admin check
    if not is_super_admin(current_user):
        user_orgs = await db.org_memberships.find({"user_id": user_id}).to_list(100)
        has_permission = False
        for m in user_orgs:
            if await is_org_admin(db, current_user["id"], m["organization_id"]):
                has_permission = True
                break
        if not has_permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only super administrators or organization administrators can reset user passwords."
            )

    target_user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    default_password = "Password@123"
    default_hash = get_password_hash(default_password)
    
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"password_hash": default_hash, "updated_at": datetime.now(timezone.utc)}}
    )
    return {
        "message": f"Password for {target_user.get('name', 'user')} has been reset to default Password@123 successfully.",
        "default_password": default_password
    }

