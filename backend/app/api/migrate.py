"""
Database Migration Script
Handles transition from the old flat role model to the new multi-org hierarchy.
Run once to migrate existing data. Safe to run multiple times (idempotent).
"""
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from app.core.database import get_database, serialize_doc
from app.core.security import get_current_user, is_super_admin
from app.core.channels import (
    create_org_broadcast,
    create_team_broadcast,
    create_project_broadcast,
)

logger = logging.getLogger("migration")
router = APIRouter(prefix="/api/migrate", tags=["migration"])


async def run_migration(db):
    """Run all migration steps. Idempotent — safe to run multiple times."""
    results = {
        "role_migration": await _migrate_roles(db),
        "org_migration": await _migrate_default_org(db),
        "team_migration": await _migrate_teams_to_org(db),
        "project_migration": await _migrate_projects(db),
        "broadcast_migration": await _migrate_broadcast_channels(db),
        "index_migration": await _ensure_new_indexes(db),
    }
    logger.info(f"Migration completed: {results}")
    return results


async def _migrate_roles(db):
    """Step 1: Rename 'admin' role to 'super_admin' for the master admin.
    Supports transition: both 'admin' and 'super_admin' are recognized.
    """
    count = 0

    # Only the master admin (admin@topbrains.com) becomes super_admin
    master = await db.users.find_one({"email": "admin@topbrains.com"})
    if master and master.get("role") == "admin":
        await db.users.update_one(
            {"_id": master["_id"]},
            {"$set": {"role": "super_admin"}}
        )
        count += 1
        logger.info("Migrated master admin to super_admin role")

    # Rename team_head to lead in team memberships
    result = await db.team_memberships.update_many(
        {"role": "team_head"},
        {"$set": {"role": "lead"}}
    )
    lead_count = result.modified_count

    return {"admin_to_super_admin": count, "team_head_to_lead": lead_count}


async def _migrate_default_org(db):
    """Step 2: Ensure a default organization exists and add all existing users."""
    org = await db.organizations.find_one()
    if not org:
        now = datetime.now(timezone.utc)
        # Find the super admin to be the creator
        admin = await db.users.find_one({"role": {"$in": ["super_admin", "admin"]}})
        creator_id = str(admin["_id"]) if admin else "system"

        org_doc = {
            "name": "TopBrains Organization",
            "description": "Unified Collaboration and Work Management Workspace",
            "logo_url": None,
            "created_by": creator_id,
            "created_at": now,
            "updated_at": now,
        }
        result = await db.organizations.insert_one(org_doc)
        org = org_doc
        org["_id"] = result.inserted_id
        logger.info("Created default organization")

    org_id = str(org["_id"])
    users_added = 0

    # Add all existing users to the default org if not already members
    all_users = await db.users.find({}).to_list(1000)
    for user in all_users:
        user_id = str(user["_id"])
        existing = await db.org_memberships.find_one({
            "organization_id": org_id,
            "user_id": user_id
        })
        if not existing:
            # Skip super_admin — Super Admin is platform maintainer and should not belong to any tenant org
            user_role = user.get("role", "member")
            if user_role == "super_admin":
                continue

            if user_role in ("admin", "org_admin"):
                roles = ["admin"]
            elif user_role == "team_head":
                roles = ["lead"]
            else:
                roles = ["member"]

            await db.org_memberships.insert_one({
                "organization_id": org_id,
                "user_id": user_id,
                "roles": roles,
                "joined_at": datetime.now(timezone.utc),
            })
            users_added += 1

    return {"org_id": org_id, "users_added": users_added}


async def _migrate_teams_to_org(db):
    """Step 3: Assign all existing teams to the default org if not already assigned."""
    org = await db.organizations.find_one()
    if not org:
        return {"teams_updated": 0}

    org_id = str(org["_id"])

    # Update teams without an organization_id
    result = await db.teams.update_many(
        {"$or": [{"organization_id": None}, {"organization_id": {"$exists": False}}]},
        {"$set": {"organization_id": org_id}}
    )

    return {"teams_updated": result.modified_count}


async def _migrate_projects(db):
    """Step 4: Assign org_id to all existing projects.
    Also create project_memberships for existing project leads.
    """
    org = await db.organizations.find_one()
    if not org:
        return {"projects_updated": 0, "memberships_created": 0}

    org_id = str(org["_id"])

    # Update projects without org_id
    result = await db.projects.update_many(
        {"$or": [{"organization_id": None}, {"organization_id": {"$exists": False}}]},
        {"$set": {"organization_id": org_id}}
    )

    # Create project memberships for project leads
    memberships_created = 0
    all_projects = await db.projects.find({}).to_list(500)
    for project in all_projects:
        project_id = str(project["_id"])
        lead_id = project.get("lead_id")

        if lead_id:
            existing = await db.project_memberships.find_one({
                "project_id": project_id,
                "user_id": lead_id
            })
            if not existing:
                await db.project_memberships.insert_one({
                    "project_id": project_id,
                    "user_id": lead_id,
                    "role": "lead",
                    "joined_at": datetime.now(timezone.utc),
                })
                memberships_created += 1

    return {"projects_updated": result.modified_count, "memberships_created": memberships_created}


async def _migrate_broadcast_channels(db):
    """Step 5: Create broadcast channels for existing orgs, teams, and projects."""
    channels_created = 0

    # Org broadcasts
    orgs = await db.organizations.find({}).to_list(100)
    for org in orgs:
        org_id = str(org["_id"])
        existing = await db.conversations.find_one({"type": "org_broadcast", "organization_id": org_id})
        if not existing:
            creator_id = org.get("created_by", "system")
            await create_org_broadcast(db, org_id, org["name"], creator_id)
            channels_created += 1

    # Team broadcasts
    teams = await db.teams.find({}).to_list(500)
    for team in teams:
        team_id = str(team["_id"])
        existing = await db.conversations.find_one({"type": "team_broadcast", "team_id": team_id})
        if not existing:
            org_id = team.get("organization_id", "")
            creator_id = team.get("created_by", "system")
            await create_team_broadcast(db, team_id, team["name"], org_id, creator_id)
            channels_created += 1

    # Project broadcasts
    projects = await db.projects.find({"team_id": {"$exists": True, "$ne": None}}).to_list(500)
    for project in projects:
        project_id = str(project["_id"])
        existing = await db.conversations.find_one({"type": "project_broadcast", "project_id": project_id})
        if not existing:
            org_id = project.get("organization_id", "")
            team_id = project.get("team_id", "")
            creator_id = project.get("lead_id", "system")
            if org_id and team_id:
                await create_project_broadcast(db, project_id, project["name"], org_id, team_id, creator_id)
                channels_created += 1

    return {"channels_created": channels_created}


async def _ensure_new_indexes(db):
    """Step 6: Create indexes for new collections."""
    try:
        # Org memberships
        await db.org_memberships.create_index(
            [("organization_id", 1), ("user_id", 1)], unique=True
        )
        await db.org_memberships.create_index("user_id")
        await db.org_memberships.create_index("organization_id")

        # Project memberships
        await db.project_memberships.create_index(
            [("project_id", 1), ("user_id", 1)], unique=True
        )
        await db.project_memberships.create_index("user_id")
        await db.project_memberships.create_index("project_id")

        # Conversations — new type indexes
        await db.conversations.create_index([("type", 1), ("organization_id", 1)])
        await db.conversations.create_index([("type", 1), ("team_id", 1)])
        await db.conversations.create_index([("type", 1), ("project_id", 1)])

        # Teams — org index
        await db.teams.create_index("organization_id")

        # Projects — team and org indexes
        await db.projects.create_index("team_id")
        await db.projects.create_index("organization_id")

        return {"indexes_created": True}
    except Exception as e:
        logger.warning(f"Index creation notice: {e}")
        return {"indexes_created": False, "error": str(e)}


@router.post("")
async def trigger_migration(
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """Trigger the database migration. Super Admin only."""
    if not is_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Only Super Admins can run migrations.")

    results = await run_migration(db)
    return {"status": "migration_complete", "results": results}


@router.get("/status")
async def migration_status(
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """Check migration status — what's been migrated and what's pending."""
    org_count = await db.organizations.count_documents({})
    org_membership_count = await db.org_memberships.count_documents({})
    project_membership_count = await db.project_memberships.count_documents({})
    broadcast_count = await db.conversations.count_documents({"type": {"$in": ["org_broadcast", "team_broadcast", "project_broadcast"]}})
    super_admin_count = await db.users.count_documents({"role": "super_admin"})
    legacy_admin_count = await db.users.count_documents({"role": "admin"})
    legacy_team_head_count = await db.team_memberships.count_documents({"role": "team_head"})
    teams_without_org = await db.teams.count_documents(
        {"$or": [{"organization_id": None}, {"organization_id": {"$exists": False}}]}
    )

    return {
        "organizations": org_count,
        "org_memberships": org_membership_count,
        "project_memberships": project_membership_count,
        "broadcast_channels": broadcast_count,
        "super_admins": super_admin_count,
        "legacy_admins_pending": legacy_admin_count,
        "legacy_team_heads_pending": legacy_team_head_count,
        "teams_without_org": teams_without_org,
    }
