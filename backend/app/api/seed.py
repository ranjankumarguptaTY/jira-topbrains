from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from bson import ObjectId
from app.core.database import get_database
from app.core.security import get_password_hash

router = APIRouter(prefix="/api/seed", tags=["seed"])


@router.post("")
async def seed_jira_database(db=Depends(get_database)):
    """
    Wipes the database and populates clean demo data matching the new hierarchy:
    - Super Admin
    - 2 Organizations (TopBrains Tech Org, Wayne Enterprises Global)
    - Org Admins, Team Leads, Engineers, Testers, PMs, and External Guests
    - Org Memberships with role arrays
    - Teams with Team Leads and #team broadcast channels
    - Team-scoped Projects with #project broadcast channels
    - Sprints and Issues (Stories, Tasks, Bugs)
    - Slack-style chat channels (#org, #team, #project, Group Chat, 1:1 DMs with chat requests)
    """
    # 0. Clear all existing collections
    await db.users.delete_many({})
    await db.organizations.delete_many({})
    await db.org_memberships.delete_many({})
    await db.teams.delete_many({})
    await db.team_memberships.delete_many({})
    await db.projects.delete_many({})
    await db.project_memberships.delete_many({})
    await db.sprints.delete_many({})
    await db.issues.delete_many({})
    await db.comments.delete_many({})
    await db.activity.delete_many({})
    await db.conversations.delete_many({})
    await db.conversation_members.delete_many({})
    await db.messages.delete_many({})
    await db.guest_chat_requests.delete_many({})
    await db.notifications.delete_many({})
    await db.file_transfers.delete_many({})
    await db.domain_events.delete_many({})

    now = datetime.now(timezone.utc)

    # 1. Create Users
    # - 1 Super Admin
    # - 8 Regular Platform Users
    # - 1 External Guest
    users_data = [
        {
            "email": "admin@topbrains.com",
            "name": "Super Admin",
            "password_hash": get_password_hash("adminpassword123"),
            "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=TopBrainsMasterSuperAdmin",
            "role": "super_admin",
            "is_active": True,
            "created_at": now - timedelta(days=30),
        },
        {
            "email": "sarah.admin@topbrains.com",
            "name": "Sarah Connor",
            "password_hash": get_password_hash("password123"),
            "avatar_url": "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
            "role": "member",
            "is_active": True,
            "created_at": now - timedelta(days=25),
        },
        {
            "email": "bruce.wayne@waynecorp.com",
            "name": "Bruce Wayne",
            "password_hash": get_password_hash("password123"),
            "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
            "role": "member",
            "is_active": True,
            "created_at": now - timedelta(days=20),
        },
        {
            "email": "alex.lead@topbrains.com",
            "name": "Alex Morgan",
            "password_hash": get_password_hash("password123"),
            "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
            "role": "member",
            "is_active": True,
            "created_at": now - timedelta(days=15),
        },
        {
            "email": "emily.lead@topbrains.com",
            "name": "Emily Watson",
            "password_hash": get_password_hash("password123"),
            "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
            "role": "member",
            "is_active": True,
            "created_at": now - timedelta(days=15),
        },
        {
            "email": "dev.john@topbrains.com",
            "name": "John Developer",
            "password_hash": get_password_hash("password123"),
            "avatar_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
            "role": "member",
            "is_active": True,
            "created_at": now - timedelta(days=10),
        },
        {
            "email": "dev.jane@topbrains.com",
            "name": "Jane Developer",
            "password_hash": get_password_hash("password123"),
            "avatar_url": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
            "role": "member",
            "is_active": True,
            "created_at": now - timedelta(days=10),
        },
        {
            "email": "qa.tony@topbrains.com",
            "name": "Tony Tester",
            "password_hash": get_password_hash("password123"),
            "avatar_url": "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80",
            "role": "member",
            "is_active": True,
            "created_at": now - timedelta(days=8),
        },
        {
            "email": "pm.rachel@topbrains.com",
            "name": "Rachel Green",
            "password_hash": get_password_hash("password123"),
            "avatar_url": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
            "role": "member",
            "is_active": True,
            "created_at": now - timedelta(days=8),
        },
        {
            "email": "external.guest@gmail.com",
            "name": "Jordan Guest",
            "password_hash": get_password_hash("password123"),
            "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=JordanGuest",
            "role": "member",
            "is_active": True,
            "created_at": now - timedelta(days=2),
        },
    ]

    user_insert = await db.users.insert_many(users_data)
    u_ids = [str(uid) for uid in user_insert.inserted_ids]
    (
        super_admin_id,
        sarah_admin_id,
        bruce_admin_id,
        alex_lead_id,
        emily_lead_id,
        john_dev_id,
        jane_dev_id,
        tony_qa_id,
        rachel_pm_id,
        guest_id,
    ) = u_ids

    # =============================================
    # 2. CREATE ORGANIZATION 1: "TopBrains Tech Org"
    # =============================================
    org1_doc = {
        "name": "TopBrains Tech Org",
        "description": "Core software engineering, QA testing, and product development workspace",
        "logo_url": None,
        "created_by": super_admin_id,
        "created_at": now - timedelta(days=20),
        "updated_at": now,
    }
    org1_res = await db.organizations.insert_one(org1_doc)
    org1_id = str(org1_res.inserted_id)

    # Memberships in Org 1 with custom roles (Super Admin remains platform-level maintainer, not org member):
    org1_members = [
        {"user_id": sarah_admin_id, "roles": ["admin"]},
        {"user_id": alex_lead_id, "roles": ["lead", "engineer"]},
        {"user_id": john_dev_id, "roles": ["engineer"]},
        {"user_id": tony_qa_id, "roles": ["tester"]},
        {"user_id": rachel_pm_id, "roles": ["pm"]},
    ]
    for m in org1_members:
        await db.org_memberships.insert_one({
            "organization_id": org1_id,
            "user_id": m["user_id"],
            "roles": m["roles"],
            "joined_at": now - timedelta(days=18),
        })

    # #org Broadcast channel for Org 1
    org1_convo = {
        "type": "org_broadcast",
        "name": "#TopBrains Tech Org",
        "organization_id": org1_id,
        "created_by": super_admin_id,
        "created_at": now - timedelta(days=18),
        "updated_at": now,
    }
    convo1_res = await db.conversations.insert_one(org1_convo)
    org1_convo_id = str(convo1_res.inserted_id)

    for m in org1_members:
        await db.conversation_members.insert_one({
            "conversation_id": org1_convo_id,
            "user_id": m["user_id"],
            "joined_at": now - timedelta(days=18),
            "last_read_at": now,
        })

    # Initial broadcast message in #org1
    await db.messages.insert_one({
        "conversation_id": org1_convo_id,
        "sender_id": sarah_admin_id,
        "content": "👋 Welcome everyone to TopBrains Tech Org! All team announcements and sprint milestones will be broadcasted here.",
        "type": "text",
        "read_by": [sarah_admin_id, alex_lead_id, john_dev_id],
        "created_at": now - timedelta(days=15),
    })

    # Team in Org 1: "Core Engineering"
    team1_doc = {
        "name": "Core Engineering",
        "description": "Backend services, APIs, database architecture, and QA automation",
        "organization_id": org1_id,
        "lead_user_id": alex_lead_id,
        "created_by": sarah_admin_id,
        "created_at": now - timedelta(days=14),
    }
    team1_res = await db.teams.insert_one(team1_doc)
    team1_id = str(team1_res.inserted_id)

    team1_members = [
        {"user_id": alex_lead_id, "role": "lead"},
        {"user_id": john_dev_id, "role": "engineer"},
        {"user_id": tony_qa_id, "role": "tester"},
        {"user_id": rachel_pm_id, "role": "pm"},
    ]
    for tm in team1_members:
        await db.team_memberships.insert_one({
            "team_id": team1_id,
            "user_id": tm["user_id"],
            "role": tm["role"],
            "joined_at": now - timedelta(days=14),
        })

    # #team Broadcast channel for Team 1
    team1_convo = {
        "type": "team_broadcast",
        "name": "#Core Engineering",
        "organization_id": org1_id,
        "team_id": team1_id,
        "created_by": sarah_admin_id,
        "created_at": now - timedelta(days=14),
        "updated_at": now,
    }
    tconvo1_res = await db.conversations.insert_one(team1_convo)
    team1_convo_id = str(tconvo1_res.inserted_id)

    for tm in team1_members:
        await db.conversation_members.insert_one({
            "conversation_id": team1_convo_id,
            "user_id": tm["user_id"],
            "joined_at": now - timedelta(days=14),
            "last_read_at": now,
        })

    await db.messages.insert_one({
        "conversation_id": team1_convo_id,
        "sender_id": alex_lead_id,
        "content": "🚀 Team channel active. Let's make sure our Sprint 1 microservices tickets are moved to In Review before Friday.",
        "type": "text",
        "read_by": [alex_lead_id, john_dev_id],
        "created_at": now - timedelta(days=5),
    })

    # Jira Project in Team 1: "Cloud Backend API" (KEY: CLOUD)
    proj1_doc = {
        "name": "Cloud Backend API",
        "key": "CLOUD",
        "description": "High throughput microservices API with JWT authentication and caching",
        "lead_id": alex_lead_id,
        "avatar_url": "https://api.dicebear.com/7.x/identicon/svg?seed=CLOUD",
        "category": "Software",
        "team_id": team1_id,
        "organization_id": org1_id,
        "last_issue_number": 4,
        "created_at": now - timedelta(days=12),
    }
    proj1_res = await db.projects.insert_one(proj1_doc)
    proj1_id = str(proj1_res.inserted_id)

    for tm in team1_members:
        await db.project_memberships.insert_one({
            "project_id": proj1_id,
            "user_id": tm["user_id"],
            "role": tm["role"],
            "joined_at": now - timedelta(days=12),
        })

    # #project Broadcast channel
    proj1_convo = {
        "type": "project_broadcast",
        "name": "#Cloud Backend API",
        "organization_id": org1_id,
        "team_id": team1_id,
        "project_id": proj1_id,
        "created_by": alex_lead_id,
        "created_at": now - timedelta(days=12),
        "updated_at": now,
    }
    pconvo1_res = await db.conversations.insert_one(proj1_convo)
    proj1_convo_id = str(pconvo1_res.inserted_id)

    for tm in team1_members:
        await db.conversation_members.insert_one({
            "conversation_id": proj1_convo_id,
            "user_id": tm["user_id"],
            "joined_at": now - timedelta(days=12),
            "last_read_at": now,
        })

    # Sprints in Project 1
    sprint1_doc = {
        "project_id": proj1_id,
        "name": "CLOUD Sprint 1 (Active)",
        "goal": "Deliver Core Auth, Scoped Roles & WebSocket Messaging",
        "status": "active",
        "start_date": now - timedelta(days=7),
        "end_date": now + timedelta(days=7),
        "created_at": now - timedelta(days=7),
    }
    sprint1_res = await db.sprints.insert_one(sprint1_doc)
    sprint1_id = str(sprint1_res.inserted_id)

    sprint2_doc = {
        "project_id": proj1_id,
        "name": "CLOUD Sprint 2 (Backlog)",
        "goal": "Performance Optimization & Automated CI/CD",
        "status": "future",
        "start_date": None,
        "end_date": None,
        "created_at": now - timedelta(days=7),
    }
    sprint2_res = await db.sprints.insert_one(sprint2_doc)
    sprint2_id = str(sprint2_res.inserted_id)

    # Issues in Project 1
    issues_data = [
        {
            "project_id": proj1_id,
            "sprint_id": sprint1_id,
            "key": "CLOUD-1",
            "issue_number": 1,
            "summary": "Implement Multi-Org Permission Hierarchy and Scoped Teams",
            "description": "Super admin creates orgs, org admins manage teams, team leads manage projects.",
            "type": "story",
            "status": "done",
            "priority": "highest",
            "story_points": 8,
            "order": 1,
            "reporter_id": rachel_pm_id,
            "assignee_id": alex_lead_id,
            "created_at": now - timedelta(days=6),
            "updated_at": now - timedelta(days=1),
        },
        {
            "project_id": proj1_id,
            "sprint_id": sprint1_id,
            "key": "CLOUD-2",
            "issue_number": 2,
            "summary": "Real-time Slack Broadcast Channels for #org and #team",
            "description": "Auto-create broadcast channels when organizations and teams are created.",
            "type": "story",
            "status": "inprogress",
            "priority": "high",
            "story_points": 5,
            "order": 2,
            "reporter_id": rachel_pm_id,
            "assignee_id": john_dev_id,
            "created_at": now - timedelta(days=5),
            "updated_at": now,
        },
        {
            "project_id": proj1_id,
            "sprint_id": sprint1_id,
            "key": "CLOUD-3",
            "issue_number": 3,
            "summary": "Fix Redis Cache Invalidation on Member Role Update",
            "description": "Verify that cached permissions refresh immediately upon org admin role edit.",
            "type": "bug",
            "status": "inreview",
            "priority": "medium",
            "story_points": 3,
            "order": 3,
            "reporter_id": tony_qa_id,
            "assignee_id": tony_qa_id,
            "created_at": now - timedelta(days=3),
            "updated_at": now,
        },
        {
            "project_id": proj1_id,
            "sprint_id": sprint2_id,
            "key": "CLOUD-4",
            "issue_number": 4,
            "summary": "Automated End-to-End Test Suite for File Chunk Transfers",
            "description": "Verify SHA-256 chunk validation across large file uploads.",
            "type": "task",
            "status": "todo",
            "priority": "low",
            "story_points": 3,
            "order": 1,
            "reporter_id": rachel_pm_id,
            "assignee_id": john_dev_id,
            "created_at": now - timedelta(days=2),
            "updated_at": now,
        },
    ]
    await db.issues.insert_many(issues_data)

    # Org Group Chat in Org 1: "Lead & QA Sync"
    group1_doc = {
        "type": "group",
        "name": "Backend & QA Sync",
        "organization_id": org1_id,
        "created_by": alex_lead_id,
        "created_at": now - timedelta(days=4),
        "updated_at": now,
    }
    group1_res = await db.conversations.insert_one(group1_doc)
    group1_id = str(group1_res.inserted_id)

    for uid in [alex_lead_id, john_dev_id, tony_qa_id]:
        await db.conversation_members.insert_one({
            "conversation_id": group1_id,
            "user_id": uid,
            "joined_at": now - timedelta(days=4),
            "last_read_at": now,
        })

    first_group_msg_res = await db.messages.insert_one({
        "conversation_id": group1_id,
        "sender_id": tony_qa_id,
        "content": "Hey team, CLOUD-3 is verified on staging. Moving ticket to In Review!",
        "type": "text",
        "read_by": [tony_qa_id, alex_lead_id, john_dev_id],
        "reactions": [
            {"emoji": "🔥", "user_id": alex_lead_id, "user_name": "Alex Morgan"},
            {"emoji": "👍", "user_id": john_dev_id, "user_name": "John Developer"},
            {"emoji": "🚀", "user_id": tony_qa_id, "user_name": "Tony QA Specialist"},
        ],
        "created_at": now - timedelta(hours=3),
    })

    await db.messages.insert_one({
        "conversation_id": group1_id,
        "sender_id": alex_lead_id,
        "content": "Awesome work Tony! I'll do the final merge today.",
        "type": "text",
        "reply_to": {
            "id": str(first_group_msg_res.inserted_id),
            "content": "Hey team, CLOUD-3 is verified on staging. Moving ticket to In Review!",
            "sender_name": "Tony QA Specialist",
        },
        "reactions": [
            {"emoji": "❤️", "user_id": tony_qa_id, "user_name": "Tony QA Specialist"},
        ],
        "read_by": [alex_lead_id, tony_qa_id],
        "created_at": now - timedelta(hours=2),
    })

    # ====================================================
    # 3. CREATE ORGANIZATION 2: "Wayne Enterprises Global"
    # ====================================================
    org2_doc = {
        "name": "Wayne Enterprises Global",
        "description": "R&D, Applied Sciences, and Advanced Defense Systems Workspace",
        "logo_url": None,
        "created_by": super_admin_id,
        "created_at": now - timedelta(days=16),
        "updated_at": now,
    }
    org2_res = await db.organizations.insert_one(org2_doc)
    org2_id = str(org2_res.inserted_id)

    org2_members = [
        {"user_id": bruce_admin_id, "roles": ["admin"]},
        {"user_id": emily_lead_id, "roles": ["lead", "pm"]},
        {"user_id": jane_dev_id, "roles": ["engineer"]},
    ]
    for m in org2_members:
        await db.org_memberships.insert_one({
            "organization_id": org2_id,
            "user_id": m["user_id"],
            "roles": m["roles"],
            "joined_at": now - timedelta(days=15),
        })

    # #org Broadcast channel for Org 2
    org2_convo = {
        "type": "org_broadcast",
        "name": "#Wayne Enterprises Global",
        "organization_id": org2_id,
        "created_by": super_admin_id,
        "created_at": now - timedelta(days=15),
        "updated_at": now,
    }
    convo2_res = await db.conversations.insert_one(org2_convo)
    org2_convo_id = str(convo2_res.inserted_id)

    for m in org2_members:
        await db.conversation_members.insert_one({
            "conversation_id": org2_convo_id,
            "user_id": m["user_id"],
            "joined_at": now - timedelta(days=15),
            "last_read_at": now,
        })

    await db.messages.insert_one({
        "conversation_id": org2_convo_id,
        "sender_id": bruce_admin_id,
        "content": "🦇 Wayne Enterprises workspace is live. All R&D projects must maintain strict SLA compliance.",
        "type": "text",
        "read_by": [bruce_admin_id, emily_lead_id],
        "created_at": now - timedelta(days=10),
    })

    # Team in Org 2: "Applied Sciences"
    team2_doc = {
        "name": "Applied Sciences",
        "description": "Tactical HUD, night optics, and encrypted telemetry",
        "organization_id": org2_id,
        "lead_user_id": emily_lead_id,
        "created_by": bruce_admin_id,
        "created_at": now - timedelta(days=12),
    }
    team2_res = await db.teams.insert_one(team2_doc)
    team2_id = str(team2_res.inserted_id)

    team2_members = [
        {"user_id": emily_lead_id, "role": "lead"},
        {"user_id": jane_dev_id, "role": "engineer"},
    ]
    for tm in team2_members:
        await db.team_memberships.insert_one({
            "team_id": team2_id,
            "user_id": tm["user_id"],
            "role": tm["role"],
            "joined_at": now - timedelta(days=12),
        })

    # #team Broadcast for Team 2
    team2_convo = {
        "type": "team_broadcast",
        "name": "#Applied Sciences",
        "organization_id": org2_id,
        "team_id": team2_id,
        "created_by": bruce_admin_id,
        "created_at": now - timedelta(days=12),
        "updated_at": now,
    }
    tconvo2_res = await db.conversations.insert_one(team2_convo)
    team2_convo_id = str(tconvo2_res.inserted_id)

    for tm in team2_members:
        await db.conversation_members.insert_one({
            "conversation_id": team2_convo_id,
            "user_id": tm["user_id"],
            "joined_at": now - timedelta(days=12),
            "last_read_at": now,
        })

    # Project in Team 2: "Tactical HUD" (KEY: HUD)
    proj2_doc = {
        "name": "Tactical HUD",
        "key": "HUD",
        "description": "Augmented reality helmet display with biometric sync",
        "lead_id": emily_lead_id,
        "avatar_url": "https://api.dicebear.com/7.x/identicon/svg?seed=HUD",
        "category": "Software",
        "team_id": team2_id,
        "organization_id": org2_id,
        "last_issue_number": 2,
        "created_at": now - timedelta(days=10),
    }
    proj2_res = await db.projects.insert_one(proj2_doc)
    proj2_id = str(proj2_res.inserted_id)

    for tm in team2_members:
        await db.project_memberships.insert_one({
            "project_id": proj2_id,
            "user_id": tm["user_id"],
            "role": tm["role"],
            "joined_at": now - timedelta(days=10),
        })

    # #project Broadcast for Project 2
    proj2_convo = {
        "type": "project_broadcast",
        "name": "#Tactical HUD",
        "organization_id": org2_id,
        "team_id": team2_id,
        "project_id": proj2_id,
        "created_by": emily_lead_id,
        "created_at": now - timedelta(days=10),
        "updated_at": now,
    }
    pconvo2_res = await db.conversations.insert_one(proj2_convo)
    proj2_convo_id = str(pconvo2_res.inserted_id)

    for tm in team2_members:
        await db.conversation_members.insert_one({
            "conversation_id": proj2_convo_id,
            "user_id": tm["user_id"],
            "joined_at": now - timedelta(days=10),
            "last_read_at": now,
        })

    # Sprint & Issues in Project 2
    sprint_hud_doc = {
        "project_id": proj2_id,
        "name": "HUD Sprint 1",
        "goal": "Night Vision AR rendering",
        "status": "active",
        "start_date": now - timedelta(days=4),
        "end_date": now + timedelta(days=10),
        "created_at": now - timedelta(days=4),
    }
    sprint_hud_res = await db.sprints.insert_one(sprint_hud_doc)
    sprint_hud_id = str(sprint_hud_res.inserted_id)

    await db.issues.insert_many([
        {
            "project_id": proj2_id,
            "sprint_id": sprint_hud_id,
            "key": "HUD-1",
            "issue_number": 1,
            "summary": "Calibrate Thermal Overlay Refresh Rate",
            "description": "Target 120 FPS refresh on encrypted telemetry stream.",
            "type": "task",
            "status": "inprogress",
            "priority": "high",
            "story_points": 5,
            "order": 1,
            "reporter_id": emily_lead_id,
            "assignee_id": jane_dev_id,
            "created_at": now - timedelta(days=3),
            "updated_at": now,
        },
        {
            "project_id": proj2_id,
            "sprint_id": sprint_hud_id,
            "key": "HUD-2",
            "issue_number": 2,
            "summary": "Biometric Heart Rate Pulse Sensor UI Widget",
            "description": "HUD element displaying pilot vitals in real-time.",
            "type": "story",
            "status": "todo",
            "priority": "medium",
            "story_points": 3,
            "order": 2,
            "reporter_id": emily_lead_id,
            "assignee_id": emily_lead_id,
            "created_at": now - timedelta(days=2),
            "updated_at": now,
        },
    ])

    # ====================================================
    # 4. 1:1 DIRECT MESSAGES & CHAT REQUESTS
    # ====================================================
    # 1:1 Direct Chat between Alex Morgan and John Developer
    dm1_doc = {
        "type": "direct",
        "created_by": alex_lead_id,
        "created_at": now - timedelta(days=6),
        "updated_at": now,
    }
    dm1_res = await db.conversations.insert_one(dm1_doc)
    dm1_id = str(dm1_res.inserted_id)

    for uid in [alex_lead_id, john_dev_id]:
        await db.conversation_members.insert_one({
            "conversation_id": dm1_id,
            "user_id": uid,
            "joined_at": now - timedelta(days=6),
            "last_read_at": now,
        })

    await db.messages.insert_many([
        {
            "conversation_id": dm1_id,
            "sender_id": alex_lead_id,
            "content": "Hi John! Have you had a chance to review the Jira sprint board for CLOUD-2?",
            "type": "text",
            "read_by": [alex_lead_id, john_dev_id],
            "reactions": [
                {"emoji": "👍", "user_id": john_dev_id, "user_name": "John Developer"},
            ],
            "created_at": now - timedelta(days=2),
        },
        {
            "conversation_id": dm1_id,
            "sender_id": john_dev_id,
            "content": "Hey Alex! Yes, working on the real-time WebSocket broadcast notifications right now.",
            "type": "text",
            "read_by": [john_dev_id, alex_lead_id],
            "reactions": [
                {"emoji": "🚀", "user_id": alex_lead_id, "user_name": "Alex Morgan"},
                {"emoji": "🔥", "user_id": john_dev_id, "user_name": "John Developer"},
            ],
            "created_at": now - timedelta(hours=5),
        },
    ])

    # Chat Request from external guest Jordan to Sarah Connor
    await db.guest_chat_requests.insert_one({
        "requester_id": guest_id,
        "target_user_id": sarah_admin_id,
        "status": "pending",
        "message": "Hello Sarah, I would like to inquire about joining the TopBrains engineering team.",
        "created_at": now - timedelta(hours=12),
        "updated_at": now - timedelta(hours=12),
    })

    return {
        "status": "database_reset_and_seeded_successfully",
        "organizations": 2,
        "users": len(users_data),
        "super_admin": "admin@topbrains.com",
        "org1": "TopBrains Tech Org (Admin: sarah.admin@topbrains.com)",
        "org2": "Wayne Enterprises Global (Admin: bruce.wayne@waynecorp.com)",
    }
