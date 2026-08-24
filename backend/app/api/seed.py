from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from bson import ObjectId
from app.core.database import get_database
from app.core.security import get_password_hash

router = APIRouter(prefix="/api/seed", tags=["seed"])

@router.post("")
async def seed_jira_database(db=Depends(get_database)):
    """Seed complete database with organization, teams, users, chat channels, messages, projects, sprints, issues, and notifications."""
    # Clear existing collections
    await db.users.delete_many({})
    await db.organizations.delete_many({})
    await db.teams.delete_many({})
    await db.team_memberships.delete_many({})
    await db.conversations.delete_many({})
    await db.conversation_members.delete_many({})
    await db.messages.delete_many({})
    await db.guest_chat_requests.delete_many({})
    await db.notifications.delete_many({})
    await db.file_transfers.delete_many({})
    await db.domain_events.delete_many({})
    await db.projects.delete_many({})
    await db.sprints.delete_many({})
    await db.issues.delete_many({})
    await db.comments.delete_many({})
    await db.activity.delete_many({})

    now = datetime.now(timezone.utc)

    # 1. Create TopBrains Master Admin + Team Users
    users_data = [
        {
            "email": "admin@topbrains.com",
            "name": "TopBrains Admin",
            "password_hash": get_password_hash("adminpassword123"),
            "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=TopBrainsAdminMaster",
            "role": "admin",
            "is_active": True,
            "created_at": now
        },
        {
            "email": "alex.morgan@topbrains.com",
            "name": "Alex Morgan",
            "password_hash": get_password_hash("password123"),
            "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
            "role": "team_head",
            "is_active": True,
            "created_at": now
        },
        {
            "email": "sarah.chen@topbrains.com",
            "name": "Sarah Chen",
            "password_hash": get_password_hash("password123"),
            "avatar_url": "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
            "role": "member",
            "is_active": True,
            "created_at": now
        },
        {
            "email": "david.kim@topbrains.com",
            "name": "David Kim",
            "password_hash": get_password_hash("password123"),
            "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
            "role": "member",
            "is_active": True,
            "created_at": now
        },
        {
            "email": "emily.watson@topbrains.com",
            "name": "Emily Watson",
            "password_hash": get_password_hash("password123"),
            "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
            "role": "team_head",
            "is_active": True,
            "created_at": now
        },
        {
            "email": "guest.user@external.com",
            "name": "Jordan Guest",
            "password_hash": get_password_hash("password123"),
            "avatar_url": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
            "role": "member",
            "is_active": True,
            "created_at": now
        }
    ]
    user_insert = await db.users.insert_many(users_data)
    user_ids = [str(uid) for uid in user_insert.inserted_ids]
    admin_id, alex_id, sarah_id, david_id, emily_id, guest_id = user_ids

    # 2. Create Organization
    org_doc = {
        "name": "TopBrains Organization",
        "description": "Unified Collaboration, Real-Time Communication & Agile Work Management",
        "logo_url": None,
        "created_by": admin_id,
        "created_at": now,
        "updated_at": now
    }
    org_res = await db.organizations.insert_one(org_doc)
    org_id = str(org_res.inserted_id)

    # 3. Create Teams
    teams_data = [
        {"name": "Engineering", "description": "Core software architecture, backend, frontend, and DevOps", "organization_id": org_id, "created_by": admin_id, "created_at": now},
        {"name": "Product & Design", "description": "Product management, user experience, and roadmaps", "organization_id": org_id, "created_by": admin_id, "created_at": now},
        {"name": "Quality Assurance", "description": "Automated testing, security audits, and QA validations", "organization_id": org_id, "created_by": admin_id, "created_at": now},
    ]
    team_insert = await db.teams.insert_many(teams_data)
    eng_team_id, prod_team_id, qa_team_id = [str(tid) for tid in team_insert.inserted_ids]

    # Assign team memberships
    memberships = [
        {"team_id": eng_team_id, "user_id": alex_id, "role": "team_head", "joined_at": now},
        {"team_id": eng_team_id, "user_id": sarah_id, "role": "member", "joined_at": now},
        {"team_id": eng_team_id, "user_id": david_id, "role": "member", "joined_at": now},
        {"team_id": prod_team_id, "user_id": emily_id, "role": "team_head", "joined_at": now},
        {"team_id": prod_team_id, "user_id": admin_id, "role": "member", "joined_at": now},
        {"team_id": qa_team_id, "user_id": david_id, "role": "member", "joined_at": now},
    ]
    await db.team_memberships.insert_many(memberships)

    # 4. Create Chat Channels & Conversations
    channels = [
        {"type": "channel", "name": "general", "created_by": admin_id, "created_at": now - timedelta(days=5), "updated_at": now},
        {"type": "channel", "name": "engineering", "created_by": alex_id, "created_at": now - timedelta(days=4), "updated_at": now},
        {"type": "channel", "name": "frontend", "created_by": sarah_id, "created_at": now - timedelta(days=3), "updated_at": now},
        {"type": "direct", "name": None, "created_by": alex_id, "created_at": now - timedelta(days=2), "updated_at": now},
    ]
    convo_insert = await db.conversations.insert_many(channels)
    gen_convo_id, eng_convo_id, fe_convo_id, dm_convo_id = [str(cid) for cid in convo_insert.inserted_ids]

    # Add members to conversations
    all_team_ids = [admin_id, alex_id, sarah_id, david_id, emily_id]
    for uid in all_team_ids:
        await db.conversation_members.insert_one({"conversation_id": gen_convo_id, "user_id": uid, "joined_at": now, "last_read_at": now})
        await db.conversation_members.insert_one({"conversation_id": eng_convo_id, "user_id": uid, "joined_at": now, "last_read_at": now})

    for uid in [admin_id, alex_id, sarah_id]:
        await db.conversation_members.insert_one({"conversation_id": fe_convo_id, "user_id": uid, "joined_at": now, "last_read_at": now})

    for uid in [admin_id, alex_id]:
        await db.conversation_members.insert_one({"conversation_id": dm_convo_id, "user_id": uid, "joined_at": now, "last_read_at": now})

    # Sample Messages
    sample_msgs = [
        {"conversation_id": gen_convo_id, "sender_id": admin_id, "content": "Welcome to TopBrains Unified Collaboration Platform! 🚀", "type": "text", "created_at": now - timedelta(days=2)},
        {"conversation_id": gen_convo_id, "sender_id": alex_id, "content": "Awesome! All team channels and Jira ticket sync are live.", "type": "text", "created_at": now - timedelta(days=1)},
        {"conversation_id": eng_convo_id, "sender_id": sarah_id, "content": "Working on the OAuth2 PKCE auth flow for TopBrains clients.", "type": "text", "created_at": now - timedelta(hours=5)},
        {"conversation_id": eng_convo_id, "sender_id": david_id, "content": "WebSocket stream & Redis cache layers are passing performance benchmarks.", "type": "text", "created_at": now - timedelta(hours=2)},
        {
            "conversation_id": dm_convo_id,
            "sender_id": admin_id,
            "content": "Alex Morgan assigned TOP-3 to Sarah Chen",
            "type": "ticket_notification",
            "metadata": {"issue_key": "TOP-3", "project_name": "TopBrains Cloud Platform", "priority": "highest"},
            "created_at": now - timedelta(hours=1)
        }
    ]
    await db.messages.insert_many(sample_msgs)

    # 5. Create Sample Guest Chat Request
    await db.guest_chat_requests.insert_one({
        "requester_id": guest_id,
        "target_user_id": admin_id,
        "message": "Hi Admin, I'm an external contractor looking to collaborate on the API integration.",
        "status": "pending",
        "created_at": now - timedelta(hours=3),
        "updated_at": now - timedelta(hours=3)
    })

    # 6. Create Projects
    proj_doc = {
        "name": "TopBrains Cloud Platform",
        "key": "TOP",
        "description": "Next-generation distributed microservices security & agile developer control plane",
        "lead_id": admin_id,
        "avatar_url": "https://api.dicebear.com/7.x/identicon/svg?seed=TopBrainsJiraCore",
        "category": "Software",
        "last_issue_number": 14,
        "created_at": now
    }
    proj_res = await db.projects.insert_one(proj_doc)
    proj_id = str(proj_res.inserted_id)

    # 7. Create Sprints
    sprint_1_doc = {
        "project_id": proj_id,
        "name": "Sprint 1: Core Security & Auth Architecture",
        "goal": "Finalize OAuth2 PKCE token rotation and multi-tenant permission guards",
        "start_date": now - timedelta(days=5),
        "end_date": now + timedelta(days=9),
        "status": "active",
        "created_at": now - timedelta(days=6)
    }
    sprint_1_res = await db.sprints.insert_one(sprint_1_doc)
    sprint_1_id = str(sprint_1_res.inserted_id)

    sprint_2_doc = {
        "project_id": proj_id,
        "name": "Sprint 2: Real-Time Stream & Webhooks",
        "goal": "Deploy high-throughput WebSocket events and audit log exports",
        "start_date": now + timedelta(days=10),
        "end_date": now + timedelta(days=24),
        "status": "future",
        "created_at": now - timedelta(days=2)
    }
    sprint_2_res = await db.sprints.insert_one(sprint_2_doc)
    sprint_2_id = str(sprint_2_res.inserted_id)

    # 8. Create Epics
    epic_1_doc = {
        "project_id": proj_id,
        "key": "TOP-1",
        "summary": "Enterprise Identity & Multi-Tenant Access Control",
        "description": "Comprehensive security layer for organizational isolation, RBAC policies, and OAuth SSO integrations.",
        "type": "epic",
        "status": "inprogress",
        "priority": "highest",
        "story_points": 21,
        "assignee_id": alex_id,
        "reporter_id": admin_id,
        "sprint_id": None,
        "parent_id": None,
        "epic_id": None,
        "labels": ["security", "auth", "topbrains-roadmap"],
        "order": 1000.0,
        "due_date": now + timedelta(days=30),
        "created_at": now - timedelta(days=20),
        "updated_at": now - timedelta(days=1)
    }
    epic_1_res = await db.issues.insert_one(epic_1_doc)
    epic_1_id = str(epic_1_res.inserted_id)

    epic_2_doc = {
        "project_id": proj_id,
        "key": "TOP-2",
        "summary": "Live Event Dispatcher & WebSocket Architecture",
        "description": "Sub-50ms message streaming infrastructure across active browser sessions and webhook endpoints.",
        "type": "epic",
        "status": "todo",
        "priority": "high",
        "story_points": 13,
        "assignee_id": david_id,
        "reporter_id": alex_id,
        "sprint_id": None,
        "parent_id": None,
        "epic_id": None,
        "labels": ["infrastructure", "websockets", "performance"],
        "order": 2000.0,
        "due_date": now + timedelta(days=45),
        "created_at": now - timedelta(days=15),
        "updated_at": now - timedelta(days=2)
    }
    epic_2_res = await db.issues.insert_one(epic_2_doc)
    epic_2_id = str(epic_2_res.inserted_id)

    # 9. Issues in Active Sprint (Sprint 1)
    issues_sprint_1 = [
        {
            "project_id": proj_id,
            "key": "TOP-3",
            "summary": "Implement OAuth2 PKCE authorization flow for TopBrains clients",
            "description": "Secure Single-Page Apps using Proof Key for Code Exchange (RFC 7636) to prevent authorization code interception attacks.",
            "type": "story",
            "status": "inprogress",
            "priority": "highest",
            "story_points": 5,
            "assignee_id": sarah_id,
            "reporter_id": admin_id,
            "sprint_id": sprint_1_id,
            "epic_id": epic_1_id,
            "parent_id": None,
            "labels": ["auth", "frontend", "security"],
            "order": 1000.0,
            "time_original_estimate": 8.0,
            "time_spent": 4.5,
            "time_remaining": 3.5,
            "created_at": now - timedelta(days=4),
            "updated_at": now - timedelta(hours=3)
        },
        {
            "project_id": proj_id,
            "key": "TOP-4",
            "summary": "JWT Token Revocation list via Redis cluster cache",
            "description": "Maintain a high-speed distributed blacklist for invalidated access tokens upon explicit user logout or password reset.",
            "type": "task",
            "status": "inreview",
            "priority": "high",
            "story_points": 3,
            "assignee_id": david_id,
            "reporter_id": sarah_id,
            "sprint_id": sprint_1_id,
            "epic_id": epic_1_id,
            "parent_id": None,
            "labels": ["redis", "backend", "cache"],
            "order": 2000.0,
            "time_original_estimate": 6.0,
            "time_spent": 5.0,
            "time_remaining": 1.0,
            "created_at": now - timedelta(days=3),
            "updated_at": now - timedelta(hours=5)
        },
        {
            "project_id": proj_id,
            "key": "TOP-5",
            "summary": "Fix race condition in session refresh mutex lock",
            "description": "When multiple concurrent API calls fail with 401 simultaneously, multiple refresh token requests are fired causing token invalidation.",
            "type": "bug",
            "status": "todo",
            "priority": "highest",
            "story_points": 2,
            "assignee_id": sarah_id,
            "reporter_id": emily_id,
            "sprint_id": sprint_1_id,
            "epic_id": epic_1_id,
            "parent_id": None,
            "labels": ["bug", "frontend", "concurrency"],
            "order": 3000.0,
            "time_original_estimate": 4.0,
            "time_spent": 0.0,
            "time_remaining": 4.0,
            "created_at": now - timedelta(days=2),
            "updated_at": now - timedelta(days=1)
        },
        {
            "project_id": proj_id,
            "key": "TOP-6",
            "summary": "Role-Based Access Control (RBAC) middleware for TopBrains routes",
            "description": "Build decorator-based authorization checking user role hierarchy (Super Admin > Team Head > Member).",
            "type": "story",
            "status": "done",
            "priority": "high",
            "story_points": 5,
            "assignee_id": alex_id,
            "reporter_id": admin_id,
            "sprint_id": sprint_1_id,
            "epic_id": epic_1_id,
            "parent_id": None,
            "labels": ["backend", "rbac", "middleware"],
            "order": 4000.0,
            "time_original_estimate": 10.0,
            "time_spent": 9.5,
            "time_remaining": 0.0,
            "created_at": now - timedelta(days=5),
            "updated_at": now - timedelta(days=1)
        },
        {
            "project_id": proj_id,
            "key": "TOP-7",
            "summary": "Design workspace selector and TopBrains organization switcher",
            "description": "Create sleek TopBrains-style workspace switcher dropdown in the navigation header with keyboard shortcuts.",
            "type": "story",
            "status": "done",
            "priority": "medium",
            "story_points": 3,
            "assignee_id": sarah_id,
            "reporter_id": emily_id,
            "sprint_id": sprint_1_id,
            "epic_id": None,
            "parent_id": None,
            "labels": ["ui", "workspace", "frontend"],
            "order": 5000.0,
            "time_original_estimate": 6.0,
            "time_spent": 6.0,
            "time_remaining": 0.0,
            "created_at": now - timedelta(days=4),
            "updated_at": now - timedelta(days=2)
        }
    ]
    res_sprint_1 = await db.issues.insert_many(issues_sprint_1)
    top_3_id = str(res_sprint_1.inserted_ids[0])

    # 10. Subtasks for TOP-3
    subtasks = [
        {
            "project_id": proj_id,
            "key": "TOP-8",
            "summary": "Generate code_verifier (base64url encoded 43-128 chars)",
            "type": "subtask",
            "status": "done",
            "priority": "high",
            "story_points": 1,
            "assignee_id": sarah_id,
            "reporter_id": admin_id,
            "sprint_id": sprint_1_id,
            "parent_id": top_3_id,
            "labels": ["crypto", "oauth"],
            "order": 1000.0,
            "created_at": now - timedelta(days=4),
            "updated_at": now - timedelta(days=3)
        },
        {
            "project_id": proj_id,
            "key": "TOP-9",
            "summary": "Compute SHA-256 code_challenge for authorization query URL",
            "type": "subtask",
            "status": "done",
            "priority": "highest",
            "story_points": 1,
            "assignee_id": sarah_id,
            "reporter_id": admin_id,
            "sprint_id": sprint_1_id,
            "parent_id": top_3_id,
            "labels": ["sha256", "oauth"],
            "order": 2000.0,
            "created_at": now - timedelta(days=4),
            "updated_at": now - timedelta(days=2)
        },
        {
            "project_id": proj_id,
            "key": "TOP-10",
            "summary": "Implement code_verifier verification on /api/auth/token endpoint",
            "type": "subtask",
            "status": "inprogress",
            "priority": "highest",
            "story_points": 2,
            "assignee_id": sarah_id,
            "reporter_id": admin_id,
            "sprint_id": sprint_1_id,
            "parent_id": top_3_id,
            "labels": ["backend", "oauth"],
            "order": 3000.0,
            "created_at": now - timedelta(days=4),
            "updated_at": now - timedelta(hours=3)
        }
    ]
    await db.issues.insert_many(subtasks)

    # 11. Create Notifications
    notifications_data = [
        {
            "user_id": admin_id,
            "type": "guest_request",
            "title": "New Message Request",
            "body": "Jordan Guest sent you a chat request.",
            "entity_type": "chat_request",
            "is_read": False,
            "created_at": now - timedelta(hours=3)
        },
        {
            "user_id": sarah_id,
            "type": "issue_assigned",
            "title": "New Assignment",
            "body": "TopBrains Admin assigned you TOP-3: Implement OAuth2 PKCE authorization flow",
            "entity_type": "issue",
            "entity_id": top_3_id,
            "metadata": {"issue_key": "TOP-3", "project_name": "TopBrains Cloud Platform", "priority": "highest"},
            "is_read": False,
            "created_at": now - timedelta(days=4)
        },
        {
            "user_id": admin_id,
            "type": "issue_status_changed",
            "title": "Ticket Updated",
            "body": "TOP-6 moved to DONE by Alex Morgan",
            "entity_type": "issue",
            "is_read": True,
            "created_at": now - timedelta(days=1)
        }
    ]
    await db.notifications.insert_many(notifications_data)

    # 12. Create Comments on TOP-3
    comments = [
        {
            "issue_id": top_3_id,
            "user_id": admin_id,
            "content": "Ensure TopBrains OAuth PKCE endpoints match the RFC 7636 security specifications.",
            "created_at": now - timedelta(days=2, hours=4),
            "updated_at": now - timedelta(days=2, hours=4)
        },
        {
            "issue_id": top_3_id,
            "user_id": sarah_id,
            "content": "Added cryptographic SHA-256 verifier generation. Validating with the TopBrains auth service.",
            "created_at": now - timedelta(hours=6),
            "updated_at": now - timedelta(hours=6)
        }
    ]
    await db.comments.insert_many(comments)

    return {
        "status": "success",
        "message": "TopBrains Unified Collaboration database seeded successfully.",
        "master_admin": "admin@topbrains.com",
        "default_password": "password123 (or adminpassword123 for master admin)",
        "project_key": "TOP",
        "project_id": proj_id
    }
