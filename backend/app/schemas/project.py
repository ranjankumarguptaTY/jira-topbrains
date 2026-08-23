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

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    lead_id: Optional[str] = None
    avatar_url: Optional[str] = None
    category: Optional[str] = None

class ProjectResponse(ProjectBase):
    id: str
    issue_count: int = 0
    created_at: Optional[datetime] = None
    lead_name: Optional[str] = None
