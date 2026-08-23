from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CommentBase(BaseModel):
    issue_id: str
    content: str

class CommentCreate(CommentBase):
    pass

class CommentUpdate(BaseModel):
    content: str

class CommentResponse(CommentBase):
    id: str
    user_id: Optional[str] = None
    user: Optional[dict] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class ActivityResponse(BaseModel):
    id: str
    issue_id: str
    user_id: Optional[str] = None
    user: Optional[dict] = None
    action: str  # created, updated_status, updated_field, commented
    details: dict
    created_at: Optional[datetime] = None
