import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from bson import ObjectId
from app.core.config import settings
from app.core.database import get_database, serialize_doc

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        password_bytes = plain_password.encode('utf-8')[:72]
        hashed_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    password_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password_bytes, salt).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

async def get_current_user_optional(token: Optional[str] = Depends(oauth2_scheme), db=Depends(get_database)):
    """Validates JWT token and fetches latest live user document and permissions directly from MongoDB."""
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id:
            return None
    except JWTError:
        return None
    
    if ObjectId.is_valid(user_id):
        # Always verify against the live database record
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return None
            
        # Security check: verify account is currently active in the database
        if user.get("is_active") is False:
            return None
            
        serialized = serialize_doc(user)
        # Ensure latest database role is present on current_user
        serialized["role"] = user.get("role", "member")
        return serialized
        
    return None

async def get_current_user(user=Depends(get_current_user_optional)):
    """Guaranteed authenticated user dependency for secure API endpoints."""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials or user account is deactivated.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


# =============================================
# ROLE & PERMISSION UTILITIES
# =============================================

def is_super_admin(user: dict) -> bool:
    """Check if the user is the platform super admin."""
    role = user.get("role", "")
    return role in ("super_admin", "admin")  # Support both during transition


def is_platform_admin(user: dict) -> bool:
    """Check if the user has any admin-level platform role (super_admin or legacy admin)."""
    return is_super_admin(user)


async def get_user_org_roles(db, user_id: str, org_id: str) -> List[str]:
    """Get a user's roles within a specific organization."""
    membership = await db.org_memberships.find_one({
        "user_id": user_id,
        "organization_id": org_id
    })
    if not membership:
        return []
    return membership.get("roles", [])


async def is_org_admin(db, user_id: str, org_id: str) -> bool:
    """Check if the user is an admin of the specified organization."""
    roles = await get_user_org_roles(db, user_id, org_id)
    return "admin" in roles


async def is_org_member(db, user_id: str, org_id: str) -> bool:
    """Check if the user is a member of the specified organization (any role)."""
    membership = await db.org_memberships.find_one({
        "user_id": user_id,
        "organization_id": org_id
    })
    return membership is not None


async def is_team_lead(db, user_id: str, team_id: str) -> bool:
    """Check if the user is the lead of the specified team."""
    membership = await db.team_memberships.find_one({
        "team_id": team_id,
        "user_id": user_id,
        "role": {"$in": ["lead", "team_head"]}  # Support both during transition
    })
    return membership is not None


async def is_team_member(db, user_id: str, team_id: str) -> bool:
    """Check if the user is a member of the specified team (any role)."""
    membership = await db.team_memberships.find_one({
        "team_id": team_id,
        "user_id": user_id
    })
    return membership is not None


async def is_project_member(db, user_id: str, project_id: str) -> bool:
    """Check if the user is a member of the specified project."""
    membership = await db.project_memberships.find_one({
        "project_id": project_id,
        "user_id": user_id
    })
    return membership is not None


async def can_manage_org(db, user: dict, org_id: str) -> bool:
    """Check if the user can manage the specified organization.
    Super admins can manage any org; org admins can manage their own org.
    """
    if is_super_admin(user):
        return True
    return await is_org_admin(db, user["id"], org_id)


async def can_manage_team(db, user: dict, team_id: str) -> bool:
    """Check if the user can manage the specified team.
    Super admins, org admins of the team's org, and team leads can manage.
    """
    if is_super_admin(user):
        return True
    
    # Get team to find its org
    team = await db.teams.find_one({"_id": ObjectId(team_id)}) if ObjectId.is_valid(team_id) else None
    if team:
        org_id = team.get("organization_id")
        if org_id and await is_org_admin(db, user["id"], org_id):
            return True
    
    return await is_team_lead(db, user["id"], team_id)


async def can_manage_project(db, user: dict, project_id: str) -> bool:
    """Check if the user can manage the specified project.
    Super admins, org admins, project lead, and team leads of the project's team can manage.
    """
    if is_super_admin(user):
        return True
    
    project = await db.projects.find_one({"_id": ObjectId(project_id)}) if ObjectId.is_valid(project_id) else None
    if not project:
        return False
    
    org_id = project.get("organization_id")
    if org_id and await is_org_admin(db, user["id"], org_id):
        return True
    
    lead_id = project.get("lead_id")
    if lead_id and str(lead_id) == str(user["id"]):
        return True
    
    team_id = project.get("team_id")
    if team_id and await is_team_lead(db, user["id"], team_id):
        return True
    
    return False


import html
import re

def sanitize_text(text: Optional[str]) -> str:
    """Sanitize user submitted text to prevent XSS, HTML injection, and command/script execution vulnerabilities.
    - Strips dangerous null bytes and control chars
    - HTML-escapes special characters (<, >, &, \", ')
    - Preserves plain text, formatting, code snippets, and emoji safely
    """
    if not text:
        return ""
    # Strip null bytes and non-printable control characters (except newline, tab, cr)
    cleaned = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', text)
    # HTML escape dangerous characters
    escaped = html.escape(cleaned, quote=True)
    return escaped

async def get_user_orgs(db, user_id: str) -> list:
    """Get all organizations a user belongs to."""
    memberships = await db.org_memberships.find({"user_id": user_id}).to_list(100)
    org_ids = [m["organization_id"] for m in memberships]
    if not org_ids:
        return []
    orgs = await db.organizations.find({
        "_id": {"$in": [ObjectId(oid) for oid in org_ids if ObjectId.is_valid(oid)]}
    }).to_list(100)
    return orgs
