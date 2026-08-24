from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class FileTransferInitiate(BaseModel):
    conversation_id: str
    filename: str = Field(..., min_length=1, max_length=255)
    file_size_bytes: int = Field(..., gt=0)
    mime_type: Optional[str] = "application/octet-stream"
    sha256_client: Optional[str] = None
    recipient_user_ids: Optional[List[str]] = []

class FileTransferStatusResponse(BaseModel):
    id: str
    transfer_id: str
    conversation_id: str
    sender_id: str
    sender: Optional[dict] = None
    filename: str
    file_size_bytes: int
    uploaded_bytes: int
    mime_type: str
    sha256: Optional[str] = None
    status: str  # uploading, ready, completed, expired, cancelled, failed
    expires_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
