"""
TopBrains Platform — MongoDB Database Seeding & Initialization CLI
Run this script to initialize your database on a new server or reset it for testing.

Usage:
  python seed.py               # Seeds clean demo organizations, teams, and sample data
  python seed.py --admin-only  # Only creates/ensures the Super Admin account (clean production start)
"""
import os
import sys

# Ensure backend root directory is in sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import asyncio
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.core.security import get_password_hash
from app.api.seed import seed_jira_database
from datetime import datetime, timezone

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("seed_cli")

async def init_admin_only(db):
    """Creates the master Super Admin account without inserting sample demo data."""
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
        logger.info(f"Super Admin created: {admin_email}")
    else:
        await db.users.update_one(
            {"_id": existing["_id"]},
            {"$set": {"role": "super_admin"}}
        )
        logger.info(f"Super Admin verified: {admin_email}")

async def main():
    logger.info("=" * 60)
    logger.info("  TopBrains Collaboration Platform - Database Seeding")
    logger.info("=" * 60)
    logger.info(f"Connecting to MongoDB at: {settings.MONGODB_URL}")
    logger.info(f"Target Database: {settings.DATABASE_NAME}")

    client = AsyncIOMotorClient(settings.MONGODB_URL, serverSelectionTimeoutMS=5000)
    db = client[settings.DATABASE_NAME]

    try:
        if "--admin-only" in sys.argv:
            logger.info("Mode: Production Admin-Only Initialization")
            await init_admin_only(db)
        else:
            logger.info("Mode: Complete Demo Seeding (Organizations, Teams, Projects, Chat)")
            result = await seed_jira_database(db)
            logger.info(f"Seeding Complete: {result.get('status', 'Success')}")
            logger.info(f"Master Super Admin: {settings.SUPER_ADMIN_EMAIL}")

    except Exception as e:
        logger.error(f"Seeding notice: {e}")
    finally:
        client.close()
        logger.info("Done.")

if __name__ == "__main__":
    asyncio.run(main())
