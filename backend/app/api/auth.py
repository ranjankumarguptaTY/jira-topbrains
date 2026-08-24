from datetime import datetime, timezone
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status, Query
from bson import ObjectId
from app.core.database import get_database, serialize_doc, serialize_docs
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user
)
from app.schemas.user import UserCreate, UserLogin, UserResponse, UserStatusUpdate, TokenResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])

class RoleUpdateRequest(BaseModel):
    role: str

@router.post("/register", response_model=TokenResponse)
async def register(user_in: UserCreate, db=Depends(get_database)):
    existing = await db.users.find_one({"email": user_in.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Security Rule: Public registration is never permitted to create an 'admin' account.
    assigned_role = "member" if user_in.role == "admin" else (user_in.role or "member")
    
    avatar = user_in.avatar_url or f"https://api.dicebear.com/7.x/avataaars/svg?seed={user_in.name}"
    user_doc = {
        "email": user_in.email.lower(),
        "name": user_in.name,
        "password_hash": get_password_hash(user_in.password),
        "avatar_url": avatar,
        "role": assigned_role,
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
async def list_users(db=Depends(get_database)):
    cursor = db.users.find({}, {"password_hash": 0}).sort("name", 1)
    users = await cursor.to_list(length=100)
    return serialize_docs(users)

@router.get("/search", response_model=list[UserResponse])
async def search_users(
    q: str = Query(..., min_length=1),
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """Search registered users by name or email query."""
    regex_pattern = {"$regex": q.strip(), "$options": "i"}
    cursor = db.users.find(
        {
            "_id": {"$ne": ObjectId(current_user["id"])},
            "$or": [{"name": regex_pattern}, {"email": regex_pattern}]
        },
        {"password_hash": 0}
    ).limit(20)
    users = await cursor.to_list(length=20)

    # Get current user's team memberships to determine internal vs external/guest
    my_teams = await db.team_memberships.find({"user_id": current_user["id"]}).to_list(100)
    my_team_ids = set(m["team_id"] for m in my_teams)

    result = []
    for u in users:
        doc = serialize_doc(u)
        u_teams = await db.team_memberships.find({"user_id": doc["id"]}).to_list(100)
        u_team_ids = set(m["team_id"] for m in u_teams)
        # If they share at least one team, or both have no teams assigned (default org), internal; else external
        shared = bool(my_team_ids & u_team_ids)
        doc["is_external"] = not shared if (my_team_ids or u_team_ids) else False
        result.append(doc)

    return result

@router.post("/admin/create-user", response_model=UserResponse)
async def admin_create_user(
    user_in: UserCreate,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create admin accounts or manage team privileges."
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
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can update user roles."
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
    """Deactivate or reactivate a team user. Preserves all their issues, comments, and audit history."""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can deactivate or activate users."
        )
        
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")

    # Safety check: Cannot deactivate oneself
    if str(user_id) == str(current_user["id"]):
        raise HTTPException(status_code=400, detail="You cannot deactivate your own administrative account.")

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
