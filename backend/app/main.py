import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection, db_instance
from app.core.security import get_password_hash
from app.api import auth, projects, sprints, issues, comments, seed, import_export
from app.api import teams, conversations, notifications, guest_requests, organizations, file_transfers
from app.api import migrate as migrate_api
from app.api.websocket import manager, authenticate_ws_token

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("topbrains_jira_app")

async def ensure_default_admin():
    """Ensure TopBrains default master super_admin account exists in MongoDB"""
    try:
        db = db_instance.db
        admin_email = settings.SUPER_ADMIN_EMAIL.strip().lower()
        admin_password = settings.SUPER_ADMIN_PASSWORD
        admin_name = settings.SUPER_ADMIN_NAME

        existing = await db.users.find_one({"email": admin_email})
        if not existing:
            admin_user = {
                "email": admin_email,
                "name": admin_name,
                "password_hash": get_password_hash(admin_password),
                "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=TopBrainsMasterSuperAdmin",
                "role": "super_admin",
                "is_active": True,
                "created_at": datetime.now(timezone.utc)
            }
            await db.users.insert_one(admin_user)
            logger.info("Default TopBrains Master Admin account created: %s (role: super_admin)", admin_email)
        else:
            # Transition: ensure existing admin has super_admin role
            if existing.get("role") != "super_admin":
                await db.users.update_one(
                    {"_id": existing["_id"]},
                    {"$set": {"role": "super_admin"}}
                )
                logger.info("Upgraded %s to super_admin role", admin_email)
            logger.info("TopBrains Super Admin account verified: %s", admin_email)
        
        # Ensure Super Admin has zero assigned org memberships so credentials/profile remain strictly platform-level
        admin_doc = await db.users.find_one({"email": admin_email})
        if admin_doc:
            deleted = await db.org_memberships.delete_many({"user_id": str(admin_doc["_id"])})
            if deleted.deleted_count > 0:
                logger.info("Cleaned %d assigned org memberships from Super Admin", deleted.deleted_count)
    except Exception as e:
        logger.warning("Notice ensuring master admin: %s", e)

async def ensure_indexes():
    """Create all database indexes for optimal performance."""
    try:
        db = db_instance.db
        # Core indexes
        await db.users.create_index("email", unique=True)
        await db.projects.create_index("key", unique=True)
        await db.issues.create_index([("project_id", 1), ("key", 1)], unique=True)
        await db.issues.create_index([("project_id", 1), ("sprint_id", 1), ("status", 1), ("order", 1)])
        await db.issues.create_index([("assignee_id", 1), ("status", 1)])
        await db.issues.create_index([("reporter_id", 1)])
        await db.sprints.create_index([("project_id", 1), ("status", 1)])
        await db.comments.create_index([("issue_id", 1), ("created_at", 1)])
        await db.activity.create_index([("issue_id", 1), ("created_at", -1)])

        # Teams & Organizations
        await db.organizations.create_index("name")
        await db.teams.create_index("name")
        await db.teams.create_index("organization_id")
        await db.team_memberships.create_index([("team_id", 1), ("user_id", 1)], unique=True)
        await db.team_memberships.create_index("user_id")

        # Org memberships
        await db.org_memberships.create_index([("organization_id", 1), ("user_id", 1)], unique=True)
        await db.org_memberships.create_index("user_id")
        await db.org_memberships.create_index("organization_id")

        # Project memberships
        await db.project_memberships.create_index([("project_id", 1), ("user_id", 1)], unique=True)
        await db.project_memberships.create_index("user_id")
        await db.project_memberships.create_index("project_id")

        # Projects — team and org indexes
        await db.projects.create_index("team_id")
        await db.projects.create_index("organization_id")

        # Chat
        await db.conversations.create_index("updated_at")
        await db.conversations.create_index([("type", 1), ("organization_id", 1)])
        await db.conversations.create_index([("type", 1), ("team_id", 1)])
        await db.conversations.create_index([("type", 1), ("project_id", 1)])
        await db.conversation_members.create_index([("conversation_id", 1), ("user_id", 1)], unique=True)
        await db.conversation_members.create_index("user_id")
        await db.messages.create_index([("conversation_id", 1), ("created_at", 1)])

        # Notifications
        await db.notifications.create_index([("user_id", 1), ("created_at", -1)])
        await db.notifications.create_index([("user_id", 1), ("is_read", 1)])

        # Domain events
        await db.domain_events.create_index("created_at")

        # Guest chat requests
        await db.guest_chat_requests.create_index([("requester_id", 1), ("target_user_id", 1)])
        await db.guest_chat_requests.create_index([("target_user_id", 1), ("status", 1)])

        # File transfers
        await db.file_transfers.create_index("transfer_id", unique=True)
        await db.file_transfers.create_index([("conversation_id", 1), ("created_at", -1)])
        await db.file_transfers.create_index("expires_at")

        logger.info("All MongoDB indexes verified successfully.")
    except Exception as e:
        logger.warning(f"Index creation notice: {e}")

async def auto_migrate():
    """Run migration on startup to ensure data consistency during transition."""
    try:
        db = db_instance.db
        from app.api.migrate import run_migration
        results = await run_migration(db)
        logger.info("Auto-migration completed: %s", results)
    except Exception as e:
        logger.warning("Auto-migration notice: %s", e)

async def check_auto_seed():
    """If AUTO_SEED is enabled and DB has no organizations, seed initial data."""
    try:
        if settings.AUTO_SEED:
            db = db_instance.db
            org_count = await db.organizations.count_documents({})
            if org_count == 0:
                logger.info("AUTO_SEED is enabled & database is empty. Running initial demo seeding...")
                from app.api.seed import seed_jira_database
                await seed_jira_database(db)
                logger.info("Initial demo seeding completed successfully.")
    except Exception as e:
        logger.warning("Auto-seed notice: %s", e)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing TopBrains Collaboration Platform API...")
    await connect_to_mongo()
    await ensure_default_admin()
    await ensure_indexes()
    await auto_migrate()
    await check_auto_seed()
    yield
    # Shutdown
    logger.info("Shutting down TopBrains Collaboration Platform API...")
    await close_mongo_connection()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="TopBrains — Unified Collaboration Platform with Chat & Project Management",
    version="3.0.0",
    lifespan=lifespan
)

# Enable CORS for Frontend communication
cors_origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
]
if hasattr(settings, "ALLOWED_ORIGINS") and settings.ALLOWED_ORIGINS and settings.ALLOWED_ORIGINS != "*":
    for origin in settings.ALLOWED_ORIGINS.split(","):
        origin = origin.strip()
        if origin and origin not in cors_origins:
            cors_origins.append(origin)
elif hasattr(settings, "ALLOWED_ORIGINS") and settings.ALLOWED_ORIGINS == "*":
    cors_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins if cors_origins != ["*"] else ["*"],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$" if cors_origins != ["*"] else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# HTTP Security Headers & Content Security Policy (CSP)
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "img-src 'self' data: https: blob:; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com data:; "
        "connect-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*;"
    )
    return response

# Register API Routers
app.include_router(auth.router)
app.include_router(organizations.router)
app.include_router(teams.router)
app.include_router(projects.router)
app.include_router(sprints.router)
app.include_router(issues.router)
app.include_router(comments.router)
app.include_router(conversations.router)
app.include_router(guest_requests.router)
app.include_router(notifications.router)
app.include_router(file_transfers.router)
app.include_router(seed.router)
app.include_router(import_export.router)
app.include_router(migrate_api.router)


# =============================================
# WEBSOCKET ENDPOINT
# =============================================
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time messaging and notifications."""
    # Authenticate via query param token
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="Missing authentication token")
        return

    user_id = authenticate_ws_token(token)
    if not user_id:
        await websocket.close(code=4001, reason="Invalid authentication token")
        return

    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                import json
                message = json.loads(data)
                msg_type = message.get("type")

                if msg_type == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
                # Future: handle typing indicators, read receipts, etc.

            except (json.JSONDecodeError, Exception):
                pass

    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
        manager.disconnect(websocket, user_id)


@app.get("/")
async def root():
    return {
        "status": "healthy",
        "app": "TopBrains Collaboration Platform API",
        "version": "3.0.0",
        "docs": "/docs",
        "database": settings.DATABASE_NAME,
        "master_admin": "admin@topbrains.com"
    }

@app.get("/api/health")
async def health_check():
    from datetime import datetime, timezone
    return {
        "status": "ok", 
        "service": "topbrains-collaboration-platform",
        "server_time": datetime.now(timezone.utc).isoformat()
    }
