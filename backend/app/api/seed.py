from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from bson import ObjectId
from app.core.database import get_database
from app.core.security import get_password_hash

router = APIRouter(prefix="/api/seed", tags=["seed"])

@router.post("")
async def seed_jira_database(db=Depends(get_database)):
    # Clear existing collections
    await db.users.delete_many({})
    await db.projects.delete_many({})
    await db.sprints.delete_many({})
    await db.issues.delete_many({})
    await db.comments.delete_many({})
    await db.activity.delete_many({})

    # 1. Create TopBrains Master Admin + Team Users
    users_data = [
        {
            "email": "admin@topbrains.com",
            "name": "TopBrains Admin",
            "password_hash": get_password_hash("adminpassword123"),
            "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=TopBrainsAdminMaster",
            "role": "admin",
            "created_at": datetime.now(timezone.utc)
        },
        {
            "email": "alex.morgan@topbrains.com",
            "name": "Alex Morgan",
            "password_hash": get_password_hash("password123"),
            "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
            "role": "admin",
            "created_at": datetime.now(timezone.utc)
        },
        {
            "email": "sarah.chen@topbrains.com",
            "name": "Sarah Chen",
            "password_hash": get_password_hash("password123"),
            "avatar_url": "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
            "role": "member",
            "created_at": datetime.now(timezone.utc)
        },
        {
            "email": "david.kim@topbrains.com",
            "name": "David Kim",
            "password_hash": get_password_hash("password123"),
            "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
            "role": "member",
            "created_at": datetime.now(timezone.utc)
        },
        {
            "email": "emily.watson@topbrains.com",
            "name": "Emily Watson",
            "password_hash": get_password_hash("password123"),
            "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
            "role": "member",
            "created_at": datetime.now(timezone.utc)
        }
    ]
    user_insert = await db.users.insert_many(users_data)
    user_ids = [str(uid) for uid in user_insert.inserted_ids]
    admin_id, alex_id, sarah_id, david_id, emily_id = user_ids

    # 2. Create Projects
    proj_doc = {
        "name": "TopBrains Cloud Platform",
        "key": "TOP",
        "description": "Next-generation distributed microservices security & agile developer control plane",
        "lead_id": admin_id,
        "avatar_url": "https://api.dicebear.com/7.x/identicon/svg?seed=TopBrainsJiraCore",
        "category": "Software",
        "last_issue_number": 14,
        "created_at": datetime.now(timezone.utc)
    }
    proj_res = await db.projects.insert_one(proj_doc)
    proj_id = str(proj_res.inserted_id)

    # 3. Create Sprints
    now = datetime.now(timezone.utc)
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

    # 4. Create Epics
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

    # 5. Issues in Active Sprint (Sprint 1)
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
            "description": "Build decorator-based authorization checking user role hierarchy (Admin > Lead > Member > Viewer).",
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
            "assignee_id": emily_id,
            "reporter_id": sarah_id,
            "sprint_id": sprint_1_id,
            "epic_id": epic_1_id,
            "parent_id": None,
            "labels": ["ui", "design", "navbar"],
            "order": 5000.0,
            "time_original_estimate": 5.0,
            "time_spent": 4.0,
            "time_remaining": 0.0,
            "created_at": now - timedelta(days=4),
            "updated_at": now - timedelta(days=2)
        }
    ]
    sprint_1_inserted = await db.issues.insert_many(issues_sprint_1)
    top_3_id = str(sprint_1_inserted.inserted_ids[0])

    # 6. Create Subtasks for TOP-3
    subtasks = [
        {
            "project_id": proj_id,
            "key": "TOP-8",
            "summary": "Generate cryptographically secure code_verifier and code_challenge",
            "description": "SHA-256 base64url encoded challenge helper module.",
            "type": "subtask",
            "status": "done",
            "priority": "high",
            "story_points": 1,
            "assignee_id": sarah_id,
            "reporter_id": sarah_id,
            "sprint_id": sprint_1_id,
            "epic_id": epic_1_id,
            "parent_id": top_3_id,
            "labels": ["crypto", "subtask"],
            "order": 100.0,
            "created_at": now - timedelta(days=3),
            "updated_at": now - timedelta(days=2)
        },
        {
            "project_id": proj_id,
            "key": "TOP-9",
            "summary": "Handle authorization code exchange and silent token refresh",
            "description": "Integrate refresh iframe / Web Worker background refresh loop.",
            "type": "subtask",
            "status": "inprogress",
            "priority": "high",
            "story_points": 2,
            "assignee_id": sarah_id,
            "reporter_id": sarah_id,
            "sprint_id": sprint_1_id,
            "epic_id": epic_1_id,
            "parent_id": top_3_id,
            "labels": ["auth", "subtask"],
            "order": 200.0,
            "created_at": now - timedelta(days=3),
            "updated_at": now - timedelta(hours=2)
        }
    ]
    await db.issues.insert_many(subtasks)

    # 7. Future Sprint Issues (Sprint 2)
    issues_sprint_2 = [
        {
            "project_id": proj_id,
            "key": "TOP-10",
            "summary": "Setup Redis Pub/Sub backplane for WebSocket clustering",
            "description": "Scale WebSocket connections horizontally across multi-replica container pods.",
            "type": "story",
            "status": "todo",
            "priority": "high",
            "story_points": 8,
            "assignee_id": david_id,
            "reporter_id": admin_id,
            "sprint_id": sprint_2_id,
            "epic_id": epic_2_id,
            "parent_id": None,
            "labels": ["redis", "websockets", "scaling"],
            "order": 1000.0,
            "created_at": now - timedelta(days=1),
            "updated_at": now - timedelta(days=1)
        },
        {
            "project_id": proj_id,
            "key": "TOP-11",
            "summary": "Notification bell popover with unread indicator badge",
            "description": "Interactive notification drawer with mark-all-as-read, filter by mentions, and instant sound chime.",
            "type": "story",
            "status": "todo",
            "priority": "medium",
            "story_points": 5,
            "assignee_id": sarah_id,
            "reporter_id": emily_id,
            "sprint_id": sprint_2_id,
            "epic_id": epic_2_id,
            "parent_id": None,
            "labels": ["ui", "notifications"],
            "order": 2000.0,
            "created_at": now - timedelta(days=1),
            "updated_at": now - timedelta(days=1)
        }
    ]
    await db.issues.insert_many(issues_sprint_2)

    # 8. Backlog Issues
    backlog_issues = [
        {
            "project_id": proj_id,
            "key": "TOP-12",
            "summary": "Audit log streaming to Amazon S3 & Google Cloud Storage",
            "description": "Hourly batch export of compliance audit events in compressed JSONL format.",
            "type": "task",
            "status": "todo",
            "priority": "medium",
            "story_points": 5,
            "assignee_id": None,
            "reporter_id": admin_id,
            "sprint_id": None,
            "epic_id": None,
            "parent_id": None,
            "labels": ["compliance", "storage", "cloud"],
            "order": 1000.0,
            "created_at": now - timedelta(days=6),
            "updated_at": now - timedelta(days=6)
        },
        {
            "project_id": proj_id,
            "key": "TOP-13",
            "summary": "Dark mode theme contrast accessibility audit (WCAG 2.1 AAA)",
            "description": "Review text contrast ratios across Kanban columns, dropdown menus, and modal dialogs.",
            "type": "task",
            "status": "todo",
            "priority": "low",
            "story_points": 2,
            "assignee_id": emily_id,
            "reporter_id": emily_id,
            "sprint_id": None,
            "epic_id": None,
            "parent_id": None,
            "labels": ["a11y", "ui", "darkmode"],
            "order": 2000.0,
            "created_at": now - timedelta(days=5),
            "updated_at": now - timedelta(days=5)
        },
        {
            "project_id": proj_id,
            "key": "TOP-14",
            "summary": "Memory leak when rendering 500+ cards on virtualized board",
            "description": "DOM nodes are not being unmounted correctly during rapid drag-and-drop actions on huge boards.",
            "type": "bug",
            "status": "todo",
            "priority": "highest",
            "story_points": 5,
            "assignee_id": david_id,
            "reporter_id": sarah_id,
            "sprint_id": None,
            "epic_id": None,
            "parent_id": None,
            "labels": ["performance", "memory", "kanban"],
            "order": 3000.0,
            "created_at": now - timedelta(days=2),
            "updated_at": now - timedelta(days=2)
        }
    ]
    await db.issues.insert_many(backlog_issues)

    # 9. Create Sample Comments and Activity on TOP-3
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

    # Activity history for TOP-3
    activities = [
        {
            "issue_id": top_3_id,
            "user_id": admin_id,
            "action": "created_issue",
            "details": {"summary": "Implement OAuth2 PKCE authorization flow for TopBrains clients", "key": "TOP-3"},
            "created_at": now - timedelta(days=4)
        },
        {
            "issue_id": top_3_id,
            "user_id": sarah_id,
            "action": "changed_status",
            "details": {"old_status": "todo", "new_status": "inprogress"},
            "created_at": now - timedelta(days=2)
        },
        {
            "issue_id": top_3_id,
            "user_id": sarah_id,
            "action": "added_comment",
            "details": {"preview": "Added cryptographic SHA-256 verifier generation..."},
            "created_at": now - timedelta(hours=6)
        }
    ]
    await db.activity.insert_many(activities)

    return {
        "status": "success",
        "message": "TopBrains Jira database seeded successfully with master admin (admin@topbrains.com / adminpassword123), active & future sprints, epics, stories, bugs, subtasks, users, and comments.",
        "project_key": "TOP",
        "project_id": proj_id,
        "master_admin": "admin@topbrains.com"
    }
