from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime

# =============================================
# CONVERSATION
# =============================================
class ConversationCreate(BaseModel):
    type: Literal[
        "direct",           # 1:1 DM (independent, any user to any user)
        "group",            # Org-level group chat
        "channel",          # Generic channel (legacy)
        "org_broadcast",    # #org — auto-created per org, all org members
        "team_broadcast",   # #team — auto-created per team, all team members
        "project_broadcast" # #project — auto-created per project, all project members
    ] = "direct"
    name: Optional[str] = None  # Required for group/channel/broadcast
    member_ids: List[str] = []  # User IDs to add
    organization_id: Optional[str] = None  # For org-level groups and broadcasts
    team_id: Optional[str] = None  # For team broadcasts
    project_id: Optional[str] = None  # For project broadcasts

class ConversationUpdate(BaseModel):
    name: Optional[str] = None

class ConversationResponse(BaseModel):
    id: str
    type: str
    name: Optional[str] = None
    members: List[dict] = []
    last_message: Optional[dict] = None
    unread_count: int = 0
    organization_id: Optional[str] = None
    team_id: Optional[str] = None
    project_id: Optional[str] = None
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# =============================================
# MESSAGE
# =============================================
class ReactionRequest(BaseModel):
    emoji: str = Field(..., min_length=1, max_length=10)

class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)
    type: str = "text"  # text, system, ticket_notification, file
    reply_to: Optional[dict] = None  # { id, content, sender_name }
    forward_from: Optional[dict] = None  # { id, content, sender_name }
    metadata: Optional[dict] = None

class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    sender_id: Optional[str] = None
    sender: Optional[dict] = None
    content: str
    type: str = "text"
    read_by: List[str] = []  # List of user_ids who have read this message
    reply_to: Optional[dict] = None
    forward_from: Optional[dict] = None
    reactions: Optional[List[dict]] = []  # List of { emoji, user_id, user_name }
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
