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
    pass

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None

class OrganizationResponse(OrganizationBase):
    id: str
    created_at: Optional[datetime] = None

# =============================================
# TEAM
# =============================================
class TeamBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = ""
    organization_id: Optional[str] = None

class TeamCreate(TeamBase):
    pass

class TeamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class TeamResponse(TeamBase):
    id: str
    member_count: int = 0
    created_at: Optional[datetime] = None

# =============================================
# TEAM MEMBERSHIP
# =============================================
class TeamMemberAdd(BaseModel):
    user_id: str
    role: str = Field("member", pattern="^(team_head|member)$")

class TeamMemberResponse(BaseModel):
    id: str
    user_id: str
    team_id: str
    role: str
    user: Optional[dict] = None
    joined_at: Optional[datetime] = None
