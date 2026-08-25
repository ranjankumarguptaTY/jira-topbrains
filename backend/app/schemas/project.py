from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class ProjectBase(BaseModel):
    name: str
    key: str = Field(..., min_length=2, max_length=10, description="Project Key e.g. PROJ")
    description: Optional[str] = ""
    lead_id: Optional[str] = None
    avatar_url: Optional[str] = None
    category: Optional[str] = "Software"
    team_id: Optional[str] = None  # Team this project belongs to
    organization_id: Optional[str] = None  # Org this project belongs to
    columns: Optional[List[dict]] = None  # Board columns / cards list
    tags: Optional[List[dict]] = None  # Project tags / labels

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    lead_id: Optional[str] = None
    avatar_url: Optional[str] = None
    category: Optional[str] = None
    team_id: Optional[str] = None
    organization_id: Optional[str] = None
    columns: Optional[List[dict]] = None
    tags: Optional[List[dict]] = None

class ProjectResponse(ProjectBase):
    id: str
    issue_count: int = 0
    member_count: int = 0
    created_at: Optional[datetime] = None
    lead_name: Optional[str] = None
    team_name: Optional[str] = None
    organization_name: Optional[str] = None
    columns: Optional[List[dict]] = None
    tags: Optional[List[dict]] = None

class BoardConfigUpdate(BaseModel):
    columns: Optional[List[dict]] = None
    tags: Optional[List[dict]] = None

class TagCreate(BaseModel):
    id: Optional[str] = None
    name: str = Field(..., min_length=1, max_length=50)
    color: Optional[str] = "#0052CC"

class ColumnCreate(BaseModel):
    id: Optional[str] = None
    title: str = Field(..., min_length=1, max_length=50)
    color: Optional[str] = "#42526E"

# =============================================
# PROJECT MEMBERSHIP
# =============================================
class ProjectMemberAdd(BaseModel):
    user_id: str
    role: str = Field("member", pattern="^(lead|member|viewer|tester|engineer|pm|qa)$")

class ProjectMemberResponse(BaseModel):
    id: str
    user_id: str
    project_id: str
    role: str
    user: Optional[dict] = None
    joined_at: Optional[datetime] = None
