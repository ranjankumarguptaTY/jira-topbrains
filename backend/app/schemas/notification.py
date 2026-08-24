from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime

class NotificationCreate(BaseModel):
    user_id: str
    type: str  # chat_message, issue_assigned, issue_status_changed, issue_comment, mention, guest_request
    title: str
    body: str
    entity_type: Optional[str] = None  # issue, conversation, project, chat_request
    entity_id: Optional[str] = None
    metadata: Optional[dict] = None

class NotificationResponse(BaseModel):
    id: str
    user_id: str
    type: str
    title: str
    body: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    metadata: Optional[dict] = None
    is_read: bool = False
    created_at: Optional[datetime] = None

class UnreadCountResponse(BaseModel):
    count: int
