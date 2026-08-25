"""
Auto-Channel Management
Creates and manages broadcast channels for organizations, teams, and projects.
Handles automatic member syncing when users join/leave these entities.
"""
import logging
from datetime import datetime, timezone
from bson import ObjectId
from app.core.database import db_instance, serialize_doc

logger = logging.getLogger("channels")


async def create_org_broadcast(db, org_id: str, org_name: str, created_by: str):
    """
    Create the #org broadcast channel when an organization is created.
    All org members are automatically added.
    """
    now = datetime.now(timezone.utc)
    channel_name = f"#{org_name}"

    # Check if broadcast already exists
    existing = await db.conversations.find_one({
        "type": "org_broadcast",
        "organization_id": org_id
    })
    if existing:
        return serialize_doc(existing)

    convo_doc = {
        "type": "org_broadcast",
        "name": channel_name,
        "organization_id": org_id,
        "created_by": created_by,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.conversations.insert_one(convo_doc)
    convo_id = str(result.inserted_id)

    # Add all existing org members (Super Admin creator is not added if not an org member)
    org_members = await db.org_memberships.find({"organization_id": org_id}).to_list(1000)
    for m in org_members:
        uid = m.get("user_id")
        if uid:
            try:
                await db.conversation_members.insert_one({
                    "conversation_id": convo_id,
                    "user_id": uid,
                    "joined_at": now,
                    "last_read_at": now,
                })
            except Exception:
                pass  # Duplicate key, user already added

    convo_doc["_id"] = result.inserted_id
    logger.info(f"Created org broadcast channel '{channel_name}' for org {org_id}")
    return serialize_doc(convo_doc)


async def create_team_broadcast(db, team_id: str, team_name: str, org_id: str, created_by: str):
    """
    Create the #team broadcast channel when a team is created.
    All team members are automatically added.
    """
    now = datetime.now(timezone.utc)
    channel_name = f"#{team_name}"

    # Check if broadcast already exists
    existing = await db.conversations.find_one({
        "type": "team_broadcast",
        "team_id": team_id
    })
    if existing:
        return serialize_doc(existing)

    convo_doc = {
        "type": "team_broadcast",
        "name": channel_name,
        "organization_id": org_id,
        "team_id": team_id,
        "created_by": created_by,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.conversations.insert_one(convo_doc)
    convo_id = str(result.inserted_id)

    # Add the creator as first member
    await db.conversation_members.insert_one({
        "conversation_id": convo_id,
        "user_id": created_by,
        "joined_at": now,
        "last_read_at": now,
    })

    # Add all existing team members
    team_members = await db.team_memberships.find({"team_id": team_id}).to_list(500)
    for m in team_members:
        uid = m.get("user_id")
        if uid and uid != created_by:
            try:
                await db.conversation_members.insert_one({
                    "conversation_id": convo_id,
                    "user_id": uid,
                    "joined_at": now,
                    "last_read_at": now,
                })
            except Exception:
                pass

    convo_doc["_id"] = result.inserted_id
    logger.info(f"Created team broadcast channel '{channel_name}' for team {team_id}")
    return serialize_doc(convo_doc)


async def create_project_broadcast(db, project_id: str, project_name: str, org_id: str, team_id: str, created_by: str):
    """
    Create the #project broadcast channel when a project is created.
    All project members are automatically added.
    """
    now = datetime.now(timezone.utc)
    channel_name = f"#{project_name}"

    # Check if broadcast already exists
    existing = await db.conversations.find_one({
        "type": "project_broadcast",
        "project_id": project_id
    })
    if existing:
        return serialize_doc(existing)

    convo_doc = {
        "type": "project_broadcast",
        "name": channel_name,
        "organization_id": org_id,
        "team_id": team_id,
        "project_id": project_id,
        "created_by": created_by,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.conversations.insert_one(convo_doc)
    convo_id = str(result.inserted_id)

    # Add the creator as first member
    await db.conversation_members.insert_one({
        "conversation_id": convo_id,
        "user_id": created_by,
        "joined_at": now,
        "last_read_at": now,
    })

    convo_doc["_id"] = result.inserted_id
    logger.info(f"Created project broadcast channel '{channel_name}' for project {project_id}")
    return serialize_doc(convo_doc)


async def sync_org_member(db, org_id: str, user_id: str, action: str = "add"):
    """
    When a user joins/leaves an org, add/remove them from the org broadcast channel.
    """
    broadcast = await db.conversations.find_one({
        "type": "org_broadcast",
        "organization_id": org_id
    })
    if not broadcast:
        return

    convo_id = str(broadcast["_id"])

    if action == "add":
        existing = await db.conversation_members.find_one({
            "conversation_id": convo_id,
            "user_id": user_id
        })
        if not existing:
            now = datetime.now(timezone.utc)
            await db.conversation_members.insert_one({
                "conversation_id": convo_id,
                "user_id": user_id,
                "joined_at": now,
                "last_read_at": now,
            })
            logger.info(f"Added user {user_id} to org broadcast channel for org {org_id}")
    elif action == "remove":
        await db.conversation_members.delete_one({
            "conversation_id": convo_id,
            "user_id": user_id
        })
        logger.info(f"Removed user {user_id} from org broadcast channel for org {org_id}")


async def sync_team_member(db, team_id: str, user_id: str, action: str = "add"):
    """
    When a user joins/leaves a team, add/remove them from the team broadcast channel.
    """
    broadcast = await db.conversations.find_one({
        "type": "team_broadcast",
        "team_id": team_id
    })
    if not broadcast:
        return

    convo_id = str(broadcast["_id"])

    if action == "add":
        existing = await db.conversation_members.find_one({
            "conversation_id": convo_id,
            "user_id": user_id
        })
        if not existing:
            now = datetime.now(timezone.utc)
            await db.conversation_members.insert_one({
                "conversation_id": convo_id,
                "user_id": user_id,
                "joined_at": now,
                "last_read_at": now,
            })
            logger.info(f"Added user {user_id} to team broadcast channel for team {team_id}")
    elif action == "remove":
        await db.conversation_members.delete_one({
            "conversation_id": convo_id,
            "user_id": user_id
        })
        logger.info(f"Removed user {user_id} from team broadcast channel for team {team_id}")


async def sync_project_member(db, project_id: str, user_id: str, action: str = "add"):
    """
    When a user joins/leaves a project, add/remove them from the project broadcast channel.
    """
    broadcast = await db.conversations.find_one({
        "type": "project_broadcast",
        "project_id": project_id
    })
    if not broadcast:
        return

    convo_id = str(broadcast["_id"])

    if action == "add":
        existing = await db.conversation_members.find_one({
            "conversation_id": convo_id,
            "user_id": user_id
        })
        if not existing:
            now = datetime.now(timezone.utc)
            await db.conversation_members.insert_one({
                "conversation_id": convo_id,
                "user_id": user_id,
                "joined_at": now,
                "last_read_at": now,
            })
            logger.info(f"Added user {user_id} to project broadcast channel for project {project_id}")
    elif action == "remove":
        await db.conversation_members.delete_one({
            "conversation_id": convo_id,
            "user_id": user_id
        })
        logger.info(f"Removed user {user_id} from project broadcast channel for project {project_id}")
