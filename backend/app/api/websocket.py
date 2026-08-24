"""
WebSocket connection manager for real-time messaging and notifications.
"""
import json
import logging
from typing import Dict, Set, Optional
from fastapi import WebSocket, WebSocketDisconnect
from jose import JWTError, jwt
from app.core.config import settings

logger = logging.getLogger("websocket")


class ConnectionManager:
    """Manages WebSocket connections per user."""

    def __init__(self):
        # user_id -> set of active WebSocket connections
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # conversation_id -> set of user_ids (cached for broadcast)
        self._convo_members_cache: Dict[str, Set[str]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)
        logger.info(f"WS connected: user={user_id}, total_connections={self._total_connections()}")

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        logger.info(f"WS disconnected: user={user_id}, total_connections={self._total_connections()}")

    def is_online(self, user_id: str) -> bool:
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0

    async def send_to_user(self, user_id: str, data: dict):
        """Send message to all connections of a specific user."""
        if user_id in self.active_connections:
            message = json.dumps(data, default=str)
            dead = []
            for ws in self.active_connections[user_id]:
                try:
                    await ws.send_text(message)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self.active_connections[user_id].discard(ws)

    async def broadcast_to_conversation(self, conversation_id: str, data: dict, exclude_user: Optional[str] = None):
        """Broadcast message to all members of a conversation."""
        from app.core.database import db_instance

        db = db_instance.db
        if db is None:
            return

        members = await db.conversation_members.find({"conversation_id": conversation_id}).to_list(200)
        for member in members:
            uid = member.get("user_id")
            if uid and uid != exclude_user:
                await self.send_to_user(uid, data)

    async def broadcast_to_users(self, user_ids: list, data: dict, exclude_user: Optional[str] = None):
        """Broadcast to a list of specific users."""
        for uid in user_ids:
            if uid != exclude_user:
                await self.send_to_user(uid, data)

    def _total_connections(self) -> int:
        return sum(len(conns) for conns in self.active_connections.values())


# Singleton
manager = ConnectionManager()


def authenticate_ws_token(token: str) -> Optional[str]:
    """Verify JWT token from WebSocket connection and return user_id."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        return user_id
    except JWTError:
        return None
