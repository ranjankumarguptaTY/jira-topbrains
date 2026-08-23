from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class SprintBase(BaseModel):
    project_id: str
    name: str
    goal: Optional[str] = ""
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: str = "future"  # future, active, closed

class SprintCreate(BaseModel):
    project_id: str
    name: str
    goal: Optional[str] = ""
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class SprintUpdate(BaseModel):
    name: Optional[str] = None
    goal: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: Optional[str] = None

class SprintStartRequest(BaseModel):
    name: Optional[str] = None
    goal: Optional[str] = None
    duration_weeks: Optional[int] = 2
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class SprintCompleteRequest(BaseModel):
    move_incomplete_to_sprint_id: Optional[str] = None  # None means move to backlog

class SprintResponse(SprintBase):
    id: str
    issue_count: int = 0
    total_story_points: int = 0
    completed_story_points: int = 0
    created_at: Optional[datetime] = None
