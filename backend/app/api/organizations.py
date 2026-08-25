from typing import Optional, List
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from bson import ObjectId
from app.core.database import get_database, serialize_doc, serialize_docs
from app.core.security import (
    get_current_user,
    is_super_admin,
    is_org_admin,
    can_manage_org,
)
from app.core.channels import create_org_broadcast, sync_org_member
from app.schemas.organization import (
    OrganizationCreate, OrganizationUpdate, OrganizationResponse,
    OrgRoleCreate, OrgRoleUpdate, OrgRoleResponse,
    OrgBroadcastSend, PlatformBroadcastSend
)
from app.schemas.user import OrgMemberAdd, OrgMemberUpdate, OrgMemberResponse
from app.api.websocket import manager
from app.core.events import _create_notification

router = APIRouter(prefix="/api/organizations", tags=["organizations"])


@router.post("", response_model=OrganizationResponse)
async def create_organization(
    org_in: OrganizationCreate,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """Create organization. Super Admin only."""
    if not is_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Only Super Admins can create organizations.")

    now = datetime.now(timezone.utc)
    org_doc = {
        "name": org_in.name,
        "description": org_in.description or "",
        "logo_url": org_in.logo_url,
        "created_by": current_user["id"],
        "created_at": now,
        "updated_at": now
    }
    result = await db.organizations.insert_one(org_doc)
    org_id = str(result.inserted_id)
    org_doc["_id"] = result.inserted_id

    # If an admin_user_id is specified (and is not super admin), add that user as org admin
    if org_in.admin_user_id:
        admin_user = await db.users.find_one({"_id": ObjectId(org_in.admin_user_id)}) if ObjectId.is_valid(org_in.admin_user_id) else None
        if admin_user:
            await db.org_memberships.insert_one({
                "organization_id": org_id,
                "user_id": org_in.admin_user_id,
                "roles": ["admin"],
                "joined_at": now,
            })

    # Auto-create #org broadcast channel
    await create_org_broadcast(db, org_id, org_in.name, current_user["id"])

    doc = serialize_doc(org_doc)
    doc["member_count"] = await db.org_memberships.count_documents({"organization_id": org_id})
    doc["team_count"] = await db.teams.count_documents({"organization_id": org_id})
    doc["project_count"] = 0
    return doc


@router.get("", response_model=list[OrganizationResponse])
async def list_organizations(
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """List organizations.
    Super Admin: sees all orgs.
    Other users: sees only orgs they belong to.
    """
    if is_super_admin(current_user):
        orgs = await db.organizations.find().sort("name", 1).to_list(100)
    else:
        memberships = await db.org_memberships.find({"user_id": current_user["id"]}).to_list(100)
        org_ids = [m["organization_id"] for m in memberships]
        if not org_ids:
            return []
        orgs = await db.organizations.find(
            {"_id": {"$in": [ObjectId(oid) for oid in org_ids if ObjectId.is_valid(oid)]}}
        ).sort("name", 1).to_list(100)

    result = []
    for org in orgs:
        doc = serialize_doc(org)
        doc["member_count"] = await db.org_memberships.count_documents({"organization_id": doc["id"]})
        doc["team_count"] = await db.teams.count_documents({"organization_id": doc["id"]})
        doc["project_count"] = await db.projects.count_documents({"organization_id": doc["id"]})
        result.append(doc)
    return result


@router.get("/mine", response_model=OrganizationResponse)
async def get_my_organization(
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """Get the current user's first/default organization. Creates a default if none exists (for super admin)."""
    # Find user's org membership
    membership = await db.org_memberships.find_one({"user_id": current_user["id"]})
    if membership:
        org = await db.organizations.find_one({"_id": ObjectId(membership["organization_id"])}) if ObjectId.is_valid(membership.get("organization_id")) else None
        if org:
            doc = serialize_doc(org)
            doc["member_count"] = await db.org_memberships.count_documents({"organization_id": doc["id"]})
            doc["team_count"] = await db.teams.count_documents({"organization_id": doc["id"]})
            doc["project_count"] = await db.projects.count_documents({"organization_id": doc["id"]})
            return doc

    # For super admin, return first existing org without inserting super admin into org_memberships
    if is_super_admin(current_user):
        org = await db.organizations.find_one()
        if org:
            org_id = str(org["_id"])
            doc = serialize_doc(org)
            doc["member_count"] = await db.org_memberships.count_documents({"organization_id": org_id})
            doc["team_count"] = await db.teams.count_documents({"organization_id": org_id})
            doc["project_count"] = await db.projects.count_documents({"organization_id": org_id})
            return doc

    raise HTTPException(status_code=404, detail="You are not a member of any organization.")


@router.get("/analytics/platform")
async def get_platform_analytics(
    range_filter: str = Query("30d", description="Time range: 7d, 30d, 90d, 1y, all"),
    org_id: Optional[str] = Query(None, description="Scope analytics to specific organization ID"),
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """Platform analytics and overview metrics for Super Admin dashboard with optional organization scoping."""
    if not is_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Super Admin access required.")

    now = datetime.now(timezone.utc)
    
    # Calculate cutoff date
    if range_filter == "7d":
        start_date = now - timedelta(days=7)
    elif range_filter == "30d":
        start_date = now - timedelta(days=30)
    elif range_filter == "90d":
        start_date = now - timedelta(days=90)
    elif range_filter == "1y":
        start_date = now - timedelta(days=365)
    else:
        start_date = datetime(2020, 1, 1, tzinfo=timezone.utc)

    # Scoping logic
    scoped_org_id = org_id if (org_id and ObjectId.is_valid(org_id)) else None

    if scoped_org_id:
        # Organization-specific analytics
        total_orgs = 1
        org_doc = await db.organizations.find_one({"_id": ObjectId(scoped_org_id)})
        if not org_doc:
            raise HTTPException(status_code=404, detail="Organization not found")

        # Members in org
        org_memberships = await db.org_memberships.find({"organization_id": scoped_org_id}).to_list(1000)
        member_user_ids = [m["user_id"] for m in org_memberships if ObjectId.is_valid(m.get("user_id"))]
        total_users = len(member_user_ids)
        total_teams = await db.teams.count_documents({"organization_id": scoped_org_id})
        total_projects = await db.projects.count_documents({"organization_id": scoped_org_id})

        org_projs = await db.projects.find({"organization_id": scoped_org_id}, {"_id": 1}).to_list(500)
        proj_ids = [str(p["_id"]) for p in org_projs]
        
        issue_query = {"project_id": {"$in": proj_ids}} if proj_ids else {"_id": None}
        total_issues = await db.issues.count_documents(issue_query)
        
        # Org broadcast conversation messages
        org_broadcast = await db.conversations.find_one({"type": "org_broadcast", "organization_id": scoped_org_id})
        msg_query = {"conversation_id": str(org_broadcast["_id"])} if org_broadcast else {"_id": None}
        total_messages = await db.messages.count_documents(msg_query)

        # Range counts
        new_orgs_count = 1 if org_doc.get("created_at") and org_doc["created_at"] >= start_date else 0
        new_users_count = await db.org_memberships.count_documents({"organization_id": scoped_org_id, "joined_at": {"$gte": start_date}})
        new_projects_count = await db.projects.count_documents({"organization_id": scoped_org_id, "created_at": {"$gte": start_date}})
        new_issues_count = await db.issues.count_documents({"project_id": {"$in": proj_ids}, "created_at": {"$gte": start_date}}) if proj_ids else 0

        # Detailed org item
        admin_membership = await db.org_memberships.find_one({"organization_id": scoped_org_id, "roles": "admin"})
        admin_user_info = None
        if admin_membership and ObjectId.is_valid(admin_membership.get("user_id")):
            u = await db.users.find_one({"_id": ObjectId(admin_membership["user_id"])}, {"password_hash": 0})
            if u:
                admin_user_info = serialize_doc(u)

        serialized_org = serialize_doc(org_doc)
        serialized_org["member_count"] = total_users
        serialized_org["team_count"] = total_teams
        serialized_org["project_count"] = total_projects
        serialized_org["issue_count"] = total_issues
        serialized_org["admin_user"] = admin_user_info
        detailed_orgs = [serialized_org]

        # Status distribution
        todo_count = await db.issues.count_documents({"project_id": {"$in": proj_ids}, "status": "todo"}) if proj_ids else 0
        inprogress_count = await db.issues.count_documents({"project_id": {"$in": proj_ids}, "status": "inprogress"}) if proj_ids else 0
        inreview_count = await db.issues.count_documents({"project_id": {"$in": proj_ids}, "status": "inreview"}) if proj_ids else 0
        done_count = await db.issues.count_documents({"project_id": {"$in": proj_ids}, "status": "done"}) if proj_ids else 0

        # Daily growth for this org
        daily_growth = []
        if range_filter in ("7d", "30d"):
            days = 7 if range_filter == "7d" else 30
            for d in range(days - 1, -1, -1):
                day_start = (now - timedelta(days=d)).replace(hour=0, minute=0, second=0, microsecond=0)
                day_end = day_start + timedelta(days=1)
                u_count = await db.org_memberships.count_documents({"organization_id": scoped_org_id, "joined_at": {"$gte": day_start, "$lt": day_end}})
                iss_count = await db.issues.count_documents({"project_id": {"$in": proj_ids}, "created_at": {"$gte": day_start, "$lt": day_end}}) if proj_ids else 0
                msg_count = await db.messages.count_documents({"conversation_id": str(org_broadcast["_id"]), "created_at": {"$gte": day_start, "$lt": day_end}}) if org_broadcast else 0
                daily_growth.append({
                    "date": day_start.strftime("%b %d"),
                    "users": u_count,
                    "orgs": 0,
                    "issues": iss_count,
                    "messages": msg_count,
                })
        else:
            for m in range(5, -1, -1):
                month_start = (now - timedelta(days=m * 30)).replace(hour=0, minute=0, second=0, microsecond=0)
                month_end = month_start + timedelta(days=30)
                u_count = await db.org_memberships.count_documents({"organization_id": scoped_org_id, "joined_at": {"$gte": month_start, "$lt": month_end}})
                iss_count = await db.issues.count_documents({"project_id": {"$in": proj_ids}, "created_at": {"$gte": month_start, "$lt": month_end}}) if proj_ids else 0
                msg_count = await db.messages.count_documents({"conversation_id": str(org_broadcast["_id"]), "created_at": {"$gte": month_start, "$lt": month_end}}) if org_broadcast else 0
                daily_growth.append({
                    "date": month_start.strftime("%b %Y"),
                    "users": u_count,
                    "orgs": 0,
                    "issues": iss_count,
                    "messages": msg_count,
                })
    else:
        # Platform-wide analytics across all tenant organizations
        total_orgs = await db.organizations.count_documents({})
        total_users = await db.users.count_documents({})
        total_projects = await db.projects.count_documents({})
        total_teams = await db.teams.count_documents({})
        total_issues = await db.issues.count_documents({})
        total_messages = await db.messages.count_documents({})

        # Range counts
        new_orgs_count = await db.organizations.count_documents({"created_at": {"$gte": start_date}})
        new_users_count = await db.users.count_documents({"created_at": {"$gte": start_date}})
        new_projects_count = await db.projects.count_documents({"created_at": {"$gte": start_date}})
        new_issues_count = await db.issues.count_documents({"created_at": {"$gte": start_date}})

        # Group organizations with counts
        orgs_cursor = await db.organizations.find().sort("created_at", -1).to_list(100)
        detailed_orgs = []
        for org in orgs_cursor:
            oid = str(org["_id"])
            m_count = await db.org_memberships.count_documents({"organization_id": oid})
            t_count = await db.teams.count_documents({"organization_id": oid})
            p_count = await db.projects.count_documents({"organization_id": oid})
            org_projects_list = await db.projects.find({"organization_id": oid}, {"_id": 1}).to_list(500)
            proj_ids = [str(p["_id"]) for p in org_projects_list]
            i_count = await db.issues.count_documents({"project_id": {"$in": proj_ids}}) if proj_ids else 0
            
            # Org admin details
            admin_membership = await db.org_memberships.find_one({"organization_id": oid, "roles": "admin"})
            admin_user_info = None
            if admin_membership and ObjectId.is_valid(admin_membership.get("user_id")):
                u = await db.users.find_one({"_id": ObjectId(admin_membership["user_id"])}, {"password_hash": 0})
                if u:
                    admin_user_info = serialize_doc(u)

            serialized_org = serialize_doc(org)
            serialized_org["member_count"] = m_count
            serialized_org["team_count"] = t_count
            serialized_org["project_count"] = p_count
            serialized_org["issue_count"] = i_count
            serialized_org["admin_user"] = admin_user_info
            detailed_orgs.append(serialized_org)

        # Issue status distribution across platform
        todo_count = await db.issues.count_documents({"status": "todo"})
        inprogress_count = await db.issues.count_documents({"status": "inprogress"})
        inreview_count = await db.issues.count_documents({"status": "inreview"})
        done_count = await db.issues.count_documents({"status": "done"})

        # Activity/Growth data over past intervals for charts
        daily_growth = []
        if range_filter in ("7d", "30d"):
            days = 7 if range_filter == "7d" else 30
            for d in range(days - 1, -1, -1):
                day_start = (now - timedelta(days=d)).replace(hour=0, minute=0, second=0, microsecond=0)
                day_end = day_start + timedelta(days=1)
                u_count = await db.users.count_documents({"created_at": {"$gte": day_start, "$lt": day_end}})
                o_count = await db.organizations.count_documents({"created_at": {"$gte": day_start, "$lt": day_end}})
                iss_count = await db.issues.count_documents({"created_at": {"$gte": day_start, "$lt": day_end}})
                msg_count = await db.messages.count_documents({"created_at": {"$gte": day_start, "$lt": day_end}})
                daily_growth.append({
                    "date": day_start.strftime("%b %d"),
                    "users": u_count,
                    "orgs": o_count,
                    "issues": iss_count,
                    "messages": msg_count,
                })
        else:
            # Month-by-month for 90d / 1y / all
            for m in range(5, -1, -1):
                month_start = (now - timedelta(days=m * 30)).replace(hour=0, minute=0, second=0, microsecond=0)
                month_end = month_start + timedelta(days=30)
                u_count = await db.users.count_documents({"created_at": {"$gte": month_start, "$lt": month_end}})
                o_count = await db.organizations.count_documents({"created_at": {"$gte": month_start, "$lt": month_end}})
                iss_count = await db.issues.count_documents({"created_at": {"$gte": month_start, "$lt": month_end}})
                msg_count = await db.messages.count_documents({"created_at": {"$gte": month_start, "$lt": month_end}})
                daily_growth.append({
                    "date": month_start.strftime("%b %Y"),
                    "users": u_count,
                    "orgs": o_count,
                    "issues": iss_count,
                    "messages": msg_count,
                })

    return {
        "summary": {
            "total_orgs": total_orgs,
            "total_users": total_users,
            "total_projects": total_projects,
            "total_teams": total_teams,
            "total_issues": total_issues,
            "total_messages": total_messages,
            "new_orgs_count": new_orgs_count,
            "new_users_count": new_users_count,
            "new_projects_count": new_projects_count,
            "new_issues_count": new_issues_count,
        },
        "issues_by_status": {
            "todo": todo_count,
            "inprogress": inprogress_count,
            "inreview": inreview_count,
            "done": done_count,
        },
        "organizations": detailed_orgs,
        "growth_trends": daily_growth,
        "range": range_filter,
        "scoped_org_id": scoped_org_id,
    }


@router.post("/broadcast/platform")
async def broadcast_to_all_organizations(
    broadcast_in: PlatformBroadcastSend,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """
    Super Admin feature: Broadcasts an announcement to the specific #org broadcast channel
    of each target organization (or all organizations if target_org_ids is empty).
    Sender is displayed with name and role only (no email).
    """
    if not is_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Super Admin access required to send platform broadcasts.")

    now = datetime.now(timezone.utc)
    target_ids = broadcast_in.target_org_ids or []
    
    # Query organizations
    if target_ids:
        org_obj_ids = [ObjectId(oid) for oid in target_ids if ObjectId.is_valid(oid)]
        orgs = await db.organizations.find({"_id": {"$in": org_obj_ids}}).to_list(1000)
    else:
        orgs = await db.organizations.find({}).to_list(1000)

    if not orgs:
        raise HTTPException(status_code=404, detail="No organizations found to broadcast to.")

    sent_count = 0
    delivered_orgs = []

    for org in orgs:
        org_id = str(org["_id"])
        org_name = org.get("name", "Organization")
        
        # Ensure #org broadcast channel exists
        convo = await db.conversations.find_one({
            "type": "org_broadcast",
            "organization_id": org_id
        })
        if not convo:
            convo = await create_org_broadcast(db, org_id, org_name, current_user["id"])
            convo_id = convo["id"]
        else:
            convo_id = str(convo["_id"])

        # Insert broadcast message into conversation
        msg_doc = {
            "conversation_id": convo_id,
            "sender_id": current_user["id"],
            "content": broadcast_in.content,
            "type": "text",
            "read_by": [current_user["id"]],
            "created_at": now,
        }
        res = await db.messages.insert_one(msg_doc)
        msg_doc["_id"] = res.inserted_id

        # Update conversation's updated_at
        await db.conversations.update_one(
            {"_id": ObjectId(convo_id)},
            {"$set": {"updated_at": now}}
        )

        doc = serialize_doc(msg_doc)
        # Populate sender with name, role, avatar only — NO email
        doc["sender"] = {
            "id": current_user["id"],
            "name": current_user.get("name", "Super Admin"),
            "role": current_user.get("role", "super_admin"),
            "avatar_url": current_user.get("avatar_url"),
        }

        # Deliver to all conversation members via WebSocket & notification
        members = await db.conversation_members.find({"conversation_id": convo_id}).to_list(1000)
        channel_name = convo.get("name") if isinstance(convo, dict) else f"#{org_name}"
        sender_name = current_user.get("name", "Super Admin")

        for m in members:
            uid = m.get("user_id")
            if uid and uid != current_user["id"]:
                # WebSocket push
                await manager.send_to_user(uid, {
                    "type": "CHAT_MESSAGE_CREATED",
                    "conversation_id": convo_id,
                    "message": doc,
                })

                # In-app notification
                snippet = broadcast_in.content[:80] + ("..." if len(broadcast_in.content) > 80 else "")
                await _create_notification(
                    db=db,
                    user_id=uid,
                    notif_type="chat_message",
                    title=f"Broadcast from {sender_name} in {channel_name}",
                    body=snippet,
                    entity_type="conversation",
                    entity_id=convo_id,
                    metadata={"sender_id": current_user["id"], "message_id": doc["id"]}
                )

        sent_count += 1
        delivered_orgs.append({"id": org_id, "name": org_name})

    return {
        "status": "success",
        "message": f"Broadcast sent to {sent_count} organization(s).",
        "sent_count": sent_count,
        "organizations": delivered_orgs,
    }


@router.post("/{org_id}/broadcast")
async def broadcast_to_single_organization(
    org_id: str,
    broadcast_in: OrgBroadcastSend,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """
    Broadcast a message directly into a specific organization's #org broadcast channel.
    Authorized for Super Admin or Organization Admin.
    Sender shows only Name and Role (no email).
    """
    if not ObjectId.is_valid(org_id):
        raise HTTPException(status_code=400, detail="Invalid organization ID")

    org = await db.organizations.find_one({"_id": ObjectId(org_id)})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    is_super = is_super_admin(current_user)
    is_admin = await is_org_admin(db, current_user["id"], org_id)

    if not is_super and not is_admin:
        raise HTTPException(status_code=403, detail="Only Super Admin or Org Admin can broadcast to this organization.")

    now = datetime.now(timezone.utc)
    org_name = org.get("name", "Organization")

    # Find or create #org broadcast channel
    convo = await db.conversations.find_one({
        "type": "org_broadcast",
        "organization_id": org_id
    })
    if not convo:
        convo = await create_org_broadcast(db, org_id, org_name, current_user["id"])
        convo_id = convo["id"]
    else:
        convo_id = str(convo["_id"])

    # Insert message
    msg_doc = {
        "conversation_id": convo_id,
        "sender_id": current_user["id"],
        "content": broadcast_in.content,
        "type": "text",
        "read_by": [current_user["id"]],
        "created_at": now,
    }
    res = await db.messages.insert_one(msg_doc)
    msg_doc["_id"] = res.inserted_id

    # Update conversation's updated_at
    await db.conversations.update_one(
        {"_id": ObjectId(convo_id)},
        {"$set": {"updated_at": now}}
    )

    doc = serialize_doc(msg_doc)
    # Populate sender with name, role, avatar only — NO email
    doc["sender"] = {
        "id": current_user["id"],
        "name": current_user.get("name", "Admin"),
        "role": current_user.get("role", "org_admin"),
        "avatar_url": current_user.get("avatar_url"),
    }

    # Deliver to all members
    members = await db.conversation_members.find({"conversation_id": convo_id}).to_list(1000)
    channel_name = convo.get("name") if isinstance(convo, dict) else f"#{org_name}"
    sender_name = current_user.get("name", "Admin")

    for m in members:
        uid = m.get("user_id")
        if uid and uid != current_user["id"]:
            await manager.send_to_user(uid, {
                "type": "CHAT_MESSAGE_CREATED",
                "conversation_id": convo_id,
                "message": doc,
            })

            snippet = broadcast_in.content[:80] + ("..." if len(broadcast_in.content) > 80 else "")
            await _create_notification(
                db=db,
                user_id=uid,
                notif_type="chat_message",
                title=f"Broadcast from {sender_name} in {channel_name}",
                body=snippet,
                entity_type="conversation",
                entity_id=convo_id,
                metadata={"sender_id": current_user["id"], "message_id": doc["id"]}
            )

    return {
        "status": "success",
        "message": f"Broadcast sent to #{org_name}",
        "conversation_id": convo_id,
        "delivered_to_count": len([m for m in members if m.get("user_id") != current_user["id"]])
    }


@router.get("/{org_id}", response_model=OrganizationResponse)
async def get_organization(
    org_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """Get organization details."""
    if not ObjectId.is_valid(org_id):
        raise HTTPException(status_code=400, detail="Invalid organization ID")

    org = await db.organizations.find_one({"_id": ObjectId(org_id)})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    doc = serialize_doc(org)
    doc["member_count"] = await db.org_memberships.count_documents({"organization_id": org_id})
    doc["team_count"] = await db.teams.count_documents({"organization_id": org_id})
    doc["project_count"] = await db.projects.count_documents({"organization_id": org_id})
    return doc


@router.patch("/{org_id}", response_model=OrganizationResponse)
async def update_organization(
    org_id: str,
    org_in: OrganizationUpdate,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    if not ObjectId.is_valid(org_id):
        raise HTTPException(status_code=400, detail="Invalid organization ID")

    if not await can_manage_org(db, current_user, org_id):
        raise HTTPException(status_code=403, detail="Only Super Admins or Org Admins can update organization settings.")

    update_data = {k: v for k, v in org_in.model_dump().items() if v is not None}
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc)
        await db.organizations.update_one({"_id": ObjectId(org_id)}, {"$set": update_data})

    org = await db.organizations.find_one({"_id": ObjectId(org_id)})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    doc = serialize_doc(org)
    doc["member_count"] = await db.org_memberships.count_documents({"organization_id": org_id})
    doc["team_count"] = await db.teams.count_documents({"organization_id": org_id})
    doc["project_count"] = await db.projects.count_documents({"organization_id": org_id})
    return doc


@router.delete("/{org_id}")
async def delete_organization(
    org_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """Delete an organization. Super Admin only. Cascades to teams, projects, memberships."""
    if not is_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Only Super Admins can delete organizations.")

    if not ObjectId.is_valid(org_id):
        raise HTTPException(status_code=400, detail="Invalid organization ID")

    # Cascade delete
    # Delete org memberships
    await db.org_memberships.delete_many({"organization_id": org_id})

    # Get all teams in this org
    teams = await db.teams.find({"organization_id": org_id}).to_list(500)
    team_ids = [str(t["_id"]) for t in teams]

    # Delete team memberships
    if team_ids:
        await db.team_memberships.delete_many({"team_id": {"$in": team_ids}})

    # Get all projects in this org
    projects = await db.projects.find({"organization_id": org_id}).to_list(500)
    project_ids = [str(p["_id"]) for p in projects]

    # Delete project memberships
    if project_ids:
        await db.project_memberships.delete_many({"project_id": {"$in": project_ids}})
        # Delete issues and sprints for those projects
        for pid in project_ids:
            await db.issues.delete_many({"project_id": pid})
            await db.sprints.delete_many({"project_id": pid})

    # Delete projects
    await db.projects.delete_many({"organization_id": org_id})

    # Delete teams
    await db.teams.delete_many({"organization_id": org_id})

    # Delete broadcast conversations
    await db.conversations.delete_many({"organization_id": org_id})

    # Delete the org itself
    await db.organizations.delete_one({"_id": ObjectId(org_id)})

    return {"status": "deleted"}


# =============================================
# ORG MEMBERSHIP MANAGEMENT
# =============================================

@router.get("/{org_id}/members", response_model=list[OrgMemberResponse])
async def list_org_members(
    org_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """List all members of an organization."""
    memberships = await db.org_memberships.find({"organization_id": org_id}).to_list(500)
    result = []
    for m in memberships:
        doc = serialize_doc(m)
        # Populate user info
        if ObjectId.is_valid(m.get("user_id")):
            user = await db.users.find_one({"_id": ObjectId(m["user_id"])}, {"password_hash": 0})
            if user:
                doc["user"] = serialize_doc(user)
        result.append(doc)
    return result


@router.post("/{org_id}/members", response_model=OrgMemberResponse)
async def add_org_member(
    org_id: str,
    member_in: OrgMemberAdd,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """Add a user to an organization with specific roles. Only org admins or super admins can add members."""
    if not await can_manage_org(db, current_user, org_id):
        raise HTTPException(status_code=403, detail="Only Super Admins or Org Admins can add members to this organization.")

    # Verify org exists
    if not ObjectId.is_valid(org_id):
        raise HTTPException(status_code=400, detail="Invalid organization ID")
    org = await db.organizations.find_one({"_id": ObjectId(org_id)})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Verify user exists
    if not ObjectId.is_valid(member_in.user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")
    user = await db.users.find_one({"_id": ObjectId(member_in.user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if already a member
    existing = await db.org_memberships.find_one({
        "organization_id": org_id,
        "user_id": member_in.user_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="User is already a member of this organization.")

    now = datetime.now(timezone.utc)
    membership_doc = {
        "organization_id": org_id,
        "user_id": member_in.user_id,
        "roles": member_in.roles,
        "joined_at": now,
    }
    result = await db.org_memberships.insert_one(membership_doc)
    membership_doc["_id"] = result.inserted_id

    # Auto-add to org broadcast channel
    await sync_org_member(db, org_id, member_in.user_id, action="add")

    doc = serialize_doc(membership_doc)
    doc["user"] = serialize_doc(user)
    return doc


@router.patch("/{org_id}/members/{user_id}", response_model=OrgMemberResponse)
async def update_org_member_roles(
    org_id: str,
    user_id: str,
    member_in: OrgMemberUpdate,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """Update a member's roles within an organization."""
    if not await can_manage_org(db, current_user, org_id):
        raise HTTPException(status_code=403, detail="Only Super Admins or Org Admins can update member roles.")

    result = await db.org_memberships.update_one(
        {"organization_id": org_id, "user_id": user_id},
        {"$set": {"roles": member_in.roles}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Membership not found")

    membership = await db.org_memberships.find_one({"organization_id": org_id, "user_id": user_id})
    doc = serialize_doc(membership)
    if ObjectId.is_valid(user_id):
        user = await db.users.find_one({"_id": ObjectId(user_id)}, {"password_hash": 0})
        if user:
            doc["user"] = serialize_doc(user)
    return doc


@router.delete("/{org_id}/members/{user_id}")
async def remove_org_member(
    org_id: str,
    user_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """Remove a user from an organization. Also removes from all teams/projects in the org."""
    if not await can_manage_org(db, current_user, org_id):
        raise HTTPException(status_code=403, detail="Only Super Admins or Org Admins can remove members.")

    # Remove org membership
    result = await db.org_memberships.delete_one({"organization_id": org_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Membership not found")

    # Remove from org broadcast channel
    await sync_org_member(db, org_id, user_id, action="remove")

    # Remove from all teams in this org
    teams = await db.teams.find({"organization_id": org_id}).to_list(500)
    for team in teams:
        team_id = str(team["_id"])
        await db.team_memberships.delete_one({"team_id": team_id, "user_id": user_id})
        # Remove from team broadcast channel
        from app.core.channels import sync_team_member
        await sync_team_member(db, team_id, user_id, action="remove")

    # Remove from all projects in this org
    projects = await db.projects.find({"organization_id": org_id}).to_list(500)
    for project in projects:
        project_id = str(project["_id"])
        await db.project_memberships.delete_one({"project_id": project_id, "user_id": user_id})
        from app.core.channels import sync_project_member
        await sync_project_member(db, project_id, user_id, action="remove")

    return {"status": "removed"}


# =============================================
# ORGANIZATION CUSTOM ROLES
# =============================================

DEFAULT_ORG_ROLES = [
    {"id": "admin", "name": "Organization Admin", "description": "Full administrative access to manage the organization, teams, roles, and members.", "color": "#DE350B", "is_system": True},
    {"id": "lead", "name": "Team Lead", "description": "Can manage team boards, sprints, create projects, and coordinate team members.", "color": "#00875A", "is_system": True},
    {"id": "engineer", "name": "Software Engineer", "description": "Develops features, implements code changes, and works on sprint issues.", "color": "#0052CC", "is_system": True},
    {"id": "tester", "name": "QA / Tester", "description": "Validates features, performs regression testing, and logs defect reports.", "color": "#403294", "is_system": True},
    {"id": "pm", "name": "Product Manager", "description": "Plans roadmaps, writes specifications, and prioritizes product backlog.", "color": "#FF8B00", "is_system": True},
    {"id": "member", "name": "Member", "description": "General organization member with access to assigned teams and channels.", "color": "#42526E", "is_system": True},
]


@router.get("/{org_id}/roles", response_model=list[OrgRoleResponse])
async def list_org_roles(
    org_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """List all available roles (system + custom) for the specified organization."""
    if not ObjectId.is_valid(org_id):
        raise HTTPException(status_code=400, detail="Invalid organization ID")
    
    org = await db.organizations.find_one({"_id": ObjectId(org_id)})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Get all memberships in this org to calculate role member counts
    memberships = await db.org_memberships.find({"organization_id": org_id}).to_list(500)
    role_counts = {}
    for m in memberships:
        for r in m.get("roles", []):
            role_counts[r] = role_counts.get(r, 0) + 1

    custom_roles = org.get("custom_roles", [])
    roles_dict = {r["id"]: {**r, "member_count": role_counts.get(r["id"], 0)} for r in DEFAULT_ORG_ROLES}
    
    for cr in custom_roles:
        roles_dict[cr["id"]] = {
            "id": cr["id"],
            "name": cr["name"],
            "description": cr.get("description", ""),
            "color": cr.get("color", "#0052CC"),
            "is_system": cr.get("is_system", False),
            "member_count": role_counts.get(cr["id"], 0),
        }
        
    return list(roles_dict.values())


@router.post("/{org_id}/roles", response_model=OrgRoleResponse)
async def create_org_role(
    org_id: str,
    role_in: OrgRoleCreate,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """Create a new custom role for an organization. Super Admin or Org Admin only."""
    if not await can_manage_org(db, current_user, org_id):
        raise HTTPException(status_code=403, detail="Only Organization Admins and Super Admins can create custom roles.")
        
    if not ObjectId.is_valid(org_id):
        raise HTTPException(status_code=400, detail="Invalid organization ID")
    
    org = await db.organizations.find_one({"_id": ObjectId(org_id)})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
        
    import re
    role_id = role_in.id.strip().lower() if role_in.id else re.sub(r'[^a-z0-9_]', '_', role_in.name.strip().lower()).strip('_')
    if not role_id:
        raise HTTPException(status_code=400, detail="Invalid role ID")
        
    custom_roles = org.get("custom_roles", [])
    if any(r["id"] == role_id for r in DEFAULT_ORG_ROLES) or any(r["id"] == role_id for r in custom_roles):
        raise HTTPException(status_code=400, detail=f"A role with ID/key '{role_id}' already exists in this organization.")
        
    new_role = {
        "id": role_id,
        "name": role_in.name.strip(),
        "description": role_in.description or "",
        "color": role_in.color or "#0052CC",
        "is_system": False,
    }
    
    await db.organizations.update_one(
        {"_id": ObjectId(org_id)},
        {"$push": {"custom_roles": new_role}}
    )
    
    return {**new_role, "member_count": 0}


@router.put("/{org_id}/roles/{role_id}", response_model=OrgRoleResponse)
async def update_org_role(
    org_id: str,
    role_id: str,
    role_update: OrgRoleUpdate,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """Update a custom role's name, description, or color."""
    if not await can_manage_org(db, current_user, org_id):
        raise HTTPException(status_code=403, detail="Only Organization Admins and Super Admins can update roles.")
        
    if not ObjectId.is_valid(org_id):
        raise HTTPException(status_code=400, detail="Invalid organization ID")
    
    org = await db.organizations.find_one({"_id": ObjectId(org_id)})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
        
    custom_roles = org.get("custom_roles", [])
    role_idx = next((i for i, r in enumerate(custom_roles) if r["id"] == role_id), None)
    
    if role_idx is None:
        sys_role = next((r for r in DEFAULT_ORG_ROLES if r["id"] == role_id), None)
        if sys_role:
            updated_role = {
                "id": role_id,
                "name": role_update.name.strip() if role_update.name else sys_role["name"],
                "description": role_update.description if role_update.description is not None else sys_role["description"],
                "color": role_update.color if role_update.color else sys_role["color"],
                "is_system": True,
            }
            await db.organizations.update_one(
                {"_id": ObjectId(org_id)},
                {"$push": {"custom_roles": updated_role}}
            )
            member_count = await db.org_memberships.count_documents({"organization_id": org_id, "roles": role_id})
            return {**updated_role, "member_count": member_count}
        raise HTTPException(status_code=404, detail=f"Role '{role_id}' not found.")
        
    if role_update.name is not None:
        custom_roles[role_idx]["name"] = role_update.name.strip()
    if role_update.description is not None:
        custom_roles[role_idx]["description"] = role_update.description
    if role_update.color is not None:
        custom_roles[role_idx]["color"] = role_update.color
        
    await db.organizations.update_one(
        {"_id": ObjectId(org_id)},
        {"$set": {"custom_roles": custom_roles}}
    )
    
    member_count = await db.org_memberships.count_documents({"organization_id": org_id, "roles": role_id})
    return {**custom_roles[role_idx], "member_count": member_count}


@router.delete("/{org_id}/roles/{role_id}")
async def delete_org_role(
    org_id: str,
    role_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """Delete a custom role. If assigned to any member in this organization, deletion is blocked."""
    if not await can_manage_org(db, current_user, org_id):
        raise HTTPException(status_code=403, detail="Only Organization Admins and Super Admins can delete roles.")
        
    if not ObjectId.is_valid(org_id):
        raise HTTPException(status_code=400, detail="Invalid organization ID")
    
    org = await db.organizations.find_one({"_id": ObjectId(org_id)})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
        
    if role_id in ("admin", "member"):
        raise HTTPException(status_code=400, detail=f"The core system role '{role_id}' cannot be deleted.")
        
    # Check if ANY member in this organization is assigned this role
    assigned_count = await db.org_memberships.count_documents({
        "organization_id": org_id,
        "roles": role_id
    })
    
    if assigned_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete role '{role_id}' because it is currently assigned to {assigned_count} member(s) in this organization. Please reassign those members before deleting."
        )
        
    custom_roles = org.get("custom_roles", [])
    updated_roles = [r for r in custom_roles if r["id"] != role_id]
    
    await db.organizations.update_one(
        {"_id": ObjectId(org_id)},
        {"$set": {"custom_roles": updated_roles}}
    )
    
    return {"status": "deleted", "role_id": role_id}


