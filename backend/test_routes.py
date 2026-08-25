from app.api import conversations

print("=== CONVERSATIONS ROUTER ROUTES ===")
for r in conversations.router.routes:
    print(f"{getattr(r, 'methods', None)} {getattr(r, 'path', None)} ({getattr(r, 'name', None)})")





