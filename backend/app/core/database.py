import logging
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from app.core.config import settings

logger = logging.getLogger(__name__)

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_instance = Database()

async def get_database():
    return db_instance.db

async def connect_to_mongo():
    logger.info("Connecting to MongoDB at %s...", settings.MONGODB_URL)
    db_instance.client = AsyncIOMotorClient(settings.MONGODB_URL)
    db_instance.db = db_instance.client[settings.DATABASE_NAME]
    logger.info("Connected to MongoDB database: %s", settings.DATABASE_NAME)
    
    # Create indexes for optimal performance
    try:
        await db_instance.db.users.create_index("email", unique=True)
        await db_instance.db.projects.create_index("key", unique=True)
        await db_instance.db.issues.create_index([("project_id", 1), ("key", 1)], unique=True)
        await db_instance.db.issues.create_index([("project_id", 1), ("sprint_id", 1), ("status", 1), ("order", 1)])
        await db_instance.db.sprints.create_index([("project_id", 1), ("status", 1)])
        await db_instance.db.comments.create_index([("issue_id", 1), ("created_at", 1)])
        await db_instance.db.activity.create_index([("issue_id", 1), ("created_at", -1)])
        logger.info("MongoDB indexes verified successfully.")
    except Exception as e:
        logger.warning(f"Index creation notice: {e}")

async def close_mongo_connection():
    logger.info("Closing MongoDB connection...")
    if db_instance.client:
        db_instance.client.close()
        logger.info("MongoDB connection closed.")

from datetime import datetime

def serialize_doc(doc: dict) -> dict:
    """Helper to serialize MongoDB document ObjectId and Datetime to standardized types"""
    if not doc:
        return None
    for k, v in list(doc.items()):
        if isinstance(v, ObjectId):
            doc[k] = str(v)
        elif isinstance(v, datetime):
            doc[k] = v.isoformat() + "Z" if v.tzinfo is None else v.isoformat()
        elif isinstance(v, dict):
            doc[k] = serialize_doc(v)
        elif isinstance(v, list):
            doc[k] = [serialize_doc(item) if isinstance(item, dict) else (str(item) if isinstance(item, ObjectId) else item) for item in v]
    doc["id"] = str(doc.get("_id", ""))
    doc.pop("_id", None)
    return doc

def serialize_docs(docs: list) -> list:
    """Helper to serialize a list of MongoDB documents"""
    return [serialize_doc(d) for d in docs if d]
