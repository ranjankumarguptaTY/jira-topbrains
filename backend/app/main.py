import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection, db_instance
from app.core.security import get_password_hash
from app.api import auth, projects, sprints, issues, comments, seed, import_export

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("topbrains_jira_app")

async def ensure_default_admin():
    """Ensure TopBrains default master admin account exists in MongoDB"""
    try:
        db = db_instance.db
        admin_email = "admin@topbrains.com"
        existing = await db.users.find_one({"email": admin_email})
        if not existing:
            admin_user = {
                "email": admin_email,
                "name": "TopBrains Admin",
                "password_hash": get_password_hash("adminpassword123"),
                "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=TopBrainsAdminMaster",
                "role": "admin",
                "created_at": datetime.now(timezone.utc)
            }
            await db.users.insert_one(admin_user)
            logger.info("Default TopBrains Master Admin account created: %s", admin_email)
        else:
            logger.info("TopBrains Master Admin account verified: %s", admin_email)
    except Exception as e:
        logger.warning("Notice ensuring master admin: %s", e)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing TopBrains Jira API server...")
    await connect_to_mongo()
    await ensure_default_admin()
    yield
    # Shutdown
    logger.info("Shutting down TopBrains Jira API server...")
    await close_mongo_connection()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="TopBrains Jira - Enterprise Issue & Project Tracking Backend with MongoDB and Python FastAPI",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for Frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
app.include_router(projects.router)
app.include_router(sprints.router)
app.include_router(issues.router)
app.include_router(comments.router)
app.include_router(seed.router)
app.include_router(import_export.router)

@app.get("/")
async def root():
    return {
        "status": "healthy",
        "app": "TopBrains Jira Backend API",
        "docs": "/docs",
        "database": settings.DATABASE_NAME,
        "master_admin": "admin@topbrains.com"
    }

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "topbrains-jira-backend"}
