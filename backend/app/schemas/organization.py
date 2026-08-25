from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# =============================================
# ORGANIZATION
# =============================================
class OrganizationBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = ""
    logo_url: Optional[str] = None

class OrganizationCreate(OrganizationBase):
    admin_user_id: Optional[str] = None  # Existing user to assign as org admin

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None

class OrgBroadcastSend(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)

class PlatformBroadcastSend(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)
    target_org_ids: Optional[List[str]] = None  # None or empty = all organizations

class OrganizationResponse(OrganizationBase):
    id: str
    created_by: Optional[str] = None
    member_count: int = 0
    team_count: int = 0
    project_count: int = 0
    created_at: Optional[datetime] = None

# =============================================
# TEAM
# =============================================
class TeamBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = ""
    organization_id: str  # Required — teams must belong to an org

class TeamCreate(TeamBase):
    lead_user_id: Optional[str] = None  # Assign a team lead on creation

class TeamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    lead_user_id: Optional[str] = None

class TeamResponse(TeamBase):
    id: str
    lead_user_id: Optional[str] = None
    lead_name: Optional[str] = None
    member_count: int = 0
    project_count: int = 0
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None

# =============================================
# TEAM MEMBERSHIP
# =============================================
class TeamMemberAdd(BaseModel):
    user_id: str
    role: str = Field("member", pattern="^(lead|member|tester|engineer|pm|qa)$")

class TeamMemberResponse(BaseModel):
    id: str
    user_id: str
    team_id: str
    role: str
    user: Optional[dict] = None
    joined_at: Optional[datetime] = None

# =============================================
# ORGANIZATION ROLES
# =============================================
class OrgRoleCreate(BaseModel):
    id: Optional[str] = None  # Key slug (e.g. "devops", "designer")
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = ""
    color: Optional[str] = "#0052CC"

class OrgRoleUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    color: Optional[str] = None

class OrgRoleResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = ""
    color: Optional[str] = "#0052CC"
    is_system: bool = False
    member_count: int = 0

