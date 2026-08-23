from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=100)
    avatar_url: Optional[str] = Field(None, max_length=500)
    role: str = Field("member", pattern="^(admin|member|pm|qa)$")
    is_active: bool = True

class UserCreate(UserBase):
    # Enforce 6 to 72 character bounds to protect against Long Password Bcrypt CPU Exhaustion (Bcrypt DoS)
    password: str = Field(..., min_length=6, max_length=72, description="Max 72 characters prevents Bcrypt DoS")

class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=72)

class UserStatusUpdate(BaseModel):
    is_active: bool

class UserResponse(UserBase):
    id: str
    created_at: Optional[datetime] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
