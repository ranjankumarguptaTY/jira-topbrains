from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=100)
    avatar_url: Optional[str] = Field(None, max_length=500)
    is_active: bool = True

class UserCreate(BaseModel):
    """Public registration — no role selection. Users register as common users."""
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=100)
    # Enforce 6 to 72 character bounds to protect against Long Password Bcrypt CPU Exhaustion (Bcrypt DoS)
    password: str = Field(..., min_length=6, max_length=72, description="Max 72 characters prevents Bcrypt DoS")
    avatar_url: Optional[str] = Field(None, max_length=500)

class AdminUserCreate(BaseModel):
    """Admin-created user — can assign platform-level role."""
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=6, max_length=72)
    avatar_url: Optional[str] = Field(None, max_length=500)
    role: str = Field("member", pattern="^(super_admin|admin|org_admin|lead|member|pm|qa|tester|engineer)$")

class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=72)

class PasswordChangeRequest(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=72)
    new_password: str = Field(..., min_length=6, max_length=72)

class UserStatusUpdate(BaseModel):
    is_active: bool

class UserResponse(BaseModel):
    id: str
    email: Optional[str] = None
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    role: Optional[str] = "member"  # Platform-level role (super_admin, admin, member)
    is_active: Optional[bool] = True
    is_external: Optional[bool] = False
    created_at: Optional[datetime] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# =============================================
# ORG MEMBERSHIP
# =============================================
class OrgMemberAdd(BaseModel):
    """Add a user to an organization with specific roles."""
    user_id: str
    roles: List[str] = Field(["member"], description="Roles within the org: admin, lead, member, tester, engineer, pm, qa")

class OrgMemberUpdate(BaseModel):
    """Update a user's roles within an organization."""
    roles: List[str] = Field(..., min_length=1, description="Updated roles within the org")

class OrgMemberResponse(BaseModel):
    id: str
    user_id: str
    organization_id: str
    roles: List[str] = []
    user: Optional[dict] = None
    joined_at: Optional[datetime] = None
