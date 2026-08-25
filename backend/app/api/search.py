import logging
import re
from typing import Optional
from fastapi import APIRouter, Depends, Query
from bson import ObjectId
from app.core.database import get_database, serialize_doc
from app.core.security import get_current_user_optional, is_super_admin

logger = logging.getLogger("search_api")
router = APIRouter(prefix="/api/search", tags=["search"])

@router.get("")
async def unified_search(
    q: str = Query(..., min_length=2, description="Search query string (min 2 characters)"),
    scope: str = Query("all", description="'all' | 'jira' | 'chat'"),
    org_id: Optional[str] = Query(None, description="Active organization ID filter"),
    current_user=Depends(get_current_user_optional),
    db=Depends(get_database)
):
    """
    Unified context-aware search endpoint:
    - Filters by active organization (or all accessible orgs)
    - Returns grouped results: Issues (tickets), Projects, Conversations, Users, and Chat Messages
    """
    clean_q = q.strip()
    if len(clean_q) < 2:
        return {"issues": [], "projects": [], "conversations": [], "users": [], "messages": []}

    regex_pattern = re.compile(re.escape(clean_q), re.IGNORECASE)
    is_super = is_super_admin(current_user) if current_user else True

    # Determine accessible project and organization scope
    org_filter = {}
    if org_id:
        # Match both string ID and ObjectId in MongoDB
        org_ids = [org_id]
        if ObjectId.is_valid(org_id):
            org_ids.append(ObjectId(org_id))
        org_filter = {"organization_id": {"$in": org_ids}}
    elif current_user and not is_super:
        # User only sees orgs they are member of
        memberships = await db.org_memberships.find({"user_id": current_user["id"]}).to_list(100)
        accessible_org_ids = []
        for m in memberships:
            oid = m.get("organization_id")
            if oid:
                accessible_org_ids.append(oid)
                if ObjectId.is_valid(oid):
                    accessible_org_ids.append(ObjectId(oid))
        if accessible_org_ids:
            org_filter = {"organization_id": {"$in": accessible_org_ids}}

    results = {
        "issues": [],
        "projects": [],
        "conversations": [],
        "users": [],
        "messages": []
    }

    # 1. SEARCH JIRA TICKETS / ISSUES (Home, Projects, My Work, All)
    if scope in ("all", "jira"):
        # Match projects in scope
        proj_query = {"$or": [{"name": regex_pattern}, {"key": regex_pattern}]}
        matching_projects = await db.projects.find(proj_query).limit(10).to_list(10)
        results["projects"] = [serialize_doc(p) for p in matching_projects]

        # Issue query - match issues by key, summary, description, tags
        issue_query = {
            "$or": [
                {"key": regex_pattern},
                {"summary": regex_pattern},
                {"description": regex_pattern},
                {"tags": regex_pattern},
            ]
        }

        # If org_id is passed, attempt to find projects associated with that org
        if org_id:
            # Match organization by ID or prefix
            matched_orgs = await db.organizations.find({
                "$or": [
                    {"_id": ObjectId(org_id)} if ObjectId.is_valid(org_id) else {"_id": None},
                    {"id": org_id},
                    {"name": regex_pattern}
                ]
            }).to_list(10)
            valid_org_ids = [str(o["_id"]) for o in matched_orgs]
            valid_org_ids.append(org_id)

            scoped_projects = await db.projects.find({
                "$or": [
                    {"organization_id": {"$in": valid_org_ids}},
                    {"org_id": {"$in": valid_org_ids}}
                ]
            }, {"_id": 1}).to_list(200)

            if scoped_projects:
                scoped_project_ids = [str(p["_id"]) for p in scoped_projects]
                issue_query["project_id"] = {"$in": scoped_project_ids}

        matching_issues = await db.issues.find(issue_query).sort("updated_at", -1).limit(15).to_list(15)
        for iss in matching_issues:
            doc = serialize_doc(iss)
            if doc.get("assignee_id") and ObjectId.is_valid(doc["assignee_id"]):
                assignee = await db.users.find_one({"_id": ObjectId(doc["assignee_id"])}, {"password_hash": 0})
                doc["assignee"] = serialize_doc(assignee) if assignee else None
            results["issues"].append(doc)

    # 2. SEARCH CHAT USERS & CONVERSATIONS & MESSAGES (Chat, All)
    if scope in ("all", "chat"):
        # Search registered users
        user_query = {
            "is_active": True,
            "$or": [
                {"name": regex_pattern},
                {"email": regex_pattern},
                {"company_name": regex_pattern}
            ]
        }
        matching_users = await db.users.find(user_query, {"password_hash": 0}).limit(10).to_list(10)
        results["users"] = [serialize_doc(u) for u in matching_users]

        # Determine conversation scope
        my_user_id = current_user["id"] if current_user else None
        convo_query = {
            "$or": [
                {"name": regex_pattern},
                {"description": regex_pattern}
            ]
        }
        msg_query = {"content": regex_pattern}

        if my_user_id and not is_super:
            my_convo_memberships = await db.conversation_members.find({"user_id": my_user_id}).to_list(200)
            my_convo_ids = [m["conversation_id"] for m in my_convo_memberships]
            if my_convo_ids:
                convo_query["_id"] = {"$in": [ObjectId(cid) for cid in my_convo_ids if ObjectId.is_valid(cid)]}
                msg_query["conversation_id"] = {"$in": my_convo_ids}
            else:
                convo_query["_id"] = {"$in": []}
                msg_query["conversation_id"] = {"$in": []}

        matching_convos = await db.conversations.find(convo_query).limit(10).to_list(10)
        results["conversations"] = [serialize_doc(c) for c in matching_convos]

        # Search matching message history
        matching_msgs = await db.messages.find(msg_query).sort("created_at", -1).limit(15).to_list(15)
        for m in matching_msgs:
            doc = serialize_doc(m)
            if ObjectId.is_valid(m.get("sender_id")):
                sender = await db.users.find_one({"_id": ObjectId(m["sender_id"])}, {"password_hash": 0})
                doc["sender"] = serialize_doc(sender) if sender else None
            results["messages"].append(doc)

    return results
