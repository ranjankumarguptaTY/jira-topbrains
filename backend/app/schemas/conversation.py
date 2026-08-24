from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime

# =============================================
# CONVERSATION
# =============================================
class ConversationCreate(BaseModel):
    type: Literal["direct", "group", "channel"] = "direct"
    name: Optional[str] = None  # Required for group/channel
    member_ids: List[str] = []  # User IDs to add

class ConversationUpdate(BaseModel):
    name: Optional[str] = None

class ConversationResponse(BaseModel):
    id: str
    type: str
    name: Optional[str] = None
    members: List[dict] = []
    last_message: Optional[dict] = None
    unread_count: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# =============================================
# MESSAGE
# =============================================
class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)
    type: str = "text"  # text, system, ticket_notification, file

class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    sender_id: Optional[str] = None
    sender: Optional[dict] = None
    content: str
    type: str = "text"
    read_by: List[str] = []  # List of user_ids who have read this message
    metadata: Optional[dict] = None  # For ticket notifications, file references, etc.
    created_at: Optional[datetime] = None

# =============================================
# GUEST CHAT REQUEST
# =============================================
class GuestChatRequestCreate(BaseModel):
    target_user_id: str
    message: Optional[str] = ""

class GuestChatRequestResponse(BaseModel):
    id: str
    requester_id: str
    target_user_id: str
    status: str  # pending, accepted, declined, blocked
    message: Optional[str] = None
    requester: Optional[dict] = None
    target_user: Optional[dict] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
