import asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import connect_to_mongo, close_mongo_connection, db_instance
from app.core.security import create_access_token

async def test_react():
    await connect_to_mongo()
    db = db_instance.db

    # Get admin or any user
    user = await db.users.find_one({"email": "sarah.admin@topbrains.com"})
    if not user:
        user = await db.users.find_one({})
    user_id = str(user["_id"])
    token = create_access_token(data={"sub": user_id, "email": user.get("email"), "role": user.get("role")})

    # Find conversation and message
    convo = await db.conversations.find_one({})
    convo_id = str(convo["_id"])
    msg = await db.messages.find_one({"conversation_id": convo_id})
    if not msg:
        msg = await db.messages.find_one({})
        convo_id = str(msg["conversation_id"])
    msg_id = str(msg["_id"])

    print(f"Testing with User: {user['email']} (ID: {user_id})")
    print(f"Convo ID: {convo_id}, Msg ID: {msg_id}")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Test 1: React endpoint
        res = await client.post(
            f"/api/conversations/{convo_id}/messages/{msg_id}/react",
            json={"emoji": "👍"},
            headers={"Authorization": f"Bearer {token}"}
        )
        print("React Response status:", res.status_code)
        print("React Response JSON:", ascii(res.json()))

        # Test 2: Send message with reply_to
        reply_res = await client.post(
            f"/api/conversations/{convo_id}/messages",
            json={
                "content": "Test reply message",
                "reply_to": {
                    "id": msg_id,
                    "content": "Hello",
                    "sender_name": "Test User"
                }
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        print("Reply Send Response status:", reply_res.status_code)
        print("Reply Send Response reply_to:", ascii(reply_res.json().get("reply_to")))

        msgs_res = await client.get(
            f"/api/conversations/{convo_id}/messages",
            headers={"Authorization": f"Bearer {token}"}
        )
        print("Get Messages status:", msgs_res.status_code)
        last_msgs = msgs_res.json()
        print("Last message reply_to:", ascii(last_msgs[-1].get("reply_to") if last_msgs else None))

    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(test_react())
