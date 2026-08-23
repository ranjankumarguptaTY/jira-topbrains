from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime

class IssueBase(BaseModel):
    project_id: str
    summary: str
    description: Optional[str] = ""
    type: str = "story"  # epic, story, bug, task, subtask
    status: str = "todo"  # todo, inprogress, inreview, done
    priority: str = "medium"  # lowest, low, medium, high, highest
    story_points: Optional[int] = None
    assignee_id: Optional[str] = None
    reporter_id: Optional[str] = None
    sprint_id: Optional[str] = None  # None = Backlog
    parent_id: Optional[str] = None  # For sub-tasks
    epic_id: Optional[str] = None  # For stories/tasks under an Epic
    labels: List[str] = []
    order: float = 0.0
    due_date: Optional[datetime] = None
    time_original_estimate: Optional[float] = 0.0  # in hours
    time_spent: Optional[float] = 0.0
    time_remaining: Optional[float] = 0.0

class IssueCreate(IssueBase):
    pass

class IssueUpdate(BaseModel):
    summary: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    story_points: Optional[int] = None
    assignee_id: Optional[str] = None
    reporter_id: Optional[str] = None
    sprint_id: Optional[str] = None
    parent_id: Optional[str] = None
    epic_id: Optional[str] = None
    labels: Optional[List[str]] = None
    order: Optional[float] = None
    due_date: Optional[datetime] = None
    time_original_estimate: Optional[float] = None
    time_spent: Optional[float] = None
    time_remaining: Optional[float] = None

class IssueStatusUpdate(BaseModel):
    status: str
    order: Optional[float] = None
    sprint_id: Optional[str] = None

class IssueReorderRequest(BaseModel):
    status: Optional[str] = None
    sprint_id: Optional[str] = None
    order: float

class IssueResponse(IssueBase):
    id: str
    key: str  # e.g. "KAN-12"
    project_key: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    # Populated helpers
    assignee: Optional[dict] = None
    reporter: Optional[dict] = None
    epic: Optional[dict] = None
    subtask_stats: Optional[dict] = None
    comments_count: int = 0
