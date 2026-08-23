import csv
import io
import json
import logging
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response
from bson import ObjectId
from app.core.database import get_database, serialize_doc, serialize_docs
from app.core.security import get_current_user_optional

logger = logging.getLogger("topbrains_jira_import")
router = APIRouter(prefix="/api/projects/{project_id}", tags=["import-export"])

def normalize_status(raw_status: str) -> str:
    s = (raw_status or "").strip().lower()
    if s in ["done", "closed", "resolved", "completed"]:
        return "done"
    if s in ["in review", "inreview", "qa", "testing", "review"]:
        return "inreview"
    if s in ["in progress", "inprogress", "doing", "active", "development"]:
        return "inprogress"
    return "todo"

def normalize_priority(raw_priority: str) -> str:
    p = (raw_priority or "").strip().lower()
    if p in ["highest", "blocker", "critical"]:
        return "highest"
    if p in ["high", "major"]:
        return "high"
    if p in ["medium", "normal", "moderate"]:
        return "medium"
    if p in ["low", "minor"]:
        return "low"
    if p in ["lowest", "trivial"]:
        return "lowest"
    return "medium"

def normalize_type(raw_type: str) -> str:
    t = (raw_type or "").strip().lower()
    if "sub" in t:
        return "subtask"
    if "bug" in t or "defect" in t:
        return "bug"
    if "epic" in t:
        return "epic"
    if "task" in t:
        return "task"
    return "story"

@router.post("/import-jira-data")
async def import_jira_data(
    project_id: str,
    file: UploadFile = File(...),
    db=Depends(get_database),
    current_user=Depends(get_current_user_optional)
):
    # Security: Only administrators can import Jira project data
    if current_user and current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators are authorized to import Jira data into projects."
        )

    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")
        
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    content_bytes = await file.read()
    filename = file.filename.lower() if file.filename else ""
    
    parsed_issues = []
    created_sprints_count = 0
    sprint_cache = {}

    # Load existing sprints for this project
    existing_sprints = await db.sprints.find({"project_id": project_id}).to_list(length=200)
    for sp in existing_sprints:
        sprint_cache[sp["name"].strip().lower()] = str(sp["_id"])

    # Determine format: JSON or CSV
    if filename.endswith(".json") or file.content_type == "application/json":
        try:
            data = json.loads(content_bytes.decode("utf-8", errors="ignore"))
            items = data.get("issues", data) if isinstance(data, dict) else data
            if not isinstance(items, list):
                raise ValueError("JSON must contain an array of issues")
            
            for item in items:
                fields = item.get("fields", item)
                parsed_issues.append({
                    "summary": fields.get("summary") or item.get("summary", "Untitled Issue"),
                    "description": fields.get("description") or item.get("description", ""),
                    "type": normalize_type(fields.get("issuetype", {}).get("name") if isinstance(fields.get("issuetype"), dict) else fields.get("type", "story")),
                    "status": normalize_status(fields.get("status", {}).get("name") if isinstance(fields.get("status"), dict) else fields.get("status", "todo")),
                    "priority": normalize_priority(fields.get("priority", {}).get("name") if isinstance(fields.get("priority"), dict) else fields.get("priority", "medium")),
                    "story_points": float(fields.get("customfield_10026") or fields.get("story_points") or 0) if fields.get("customfield_10026") or fields.get("story_points") else None,
                    "sprint_name": fields.get("sprint_name") or (fields.get("sprint", {}).get("name") if isinstance(fields.get("sprint"), dict) else None),
                    "labels": fields.get("labels", []) if isinstance(fields.get("labels"), list) else [],
                })
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse Jira JSON: {str(e)}")
            
    else:
        # Default: CSV Parser
        try:
            csv_text = content_bytes.decode("utf-8-sig", errors="ignore")
            reader = csv.DictReader(io.StringIO(csv_text))
            
            for row in reader:
                # Flexible header matching
                summary = row.get("Summary") or row.get("summary") or row.get("Issue Summary") or ""
                if not summary.strip():
                    continue
                
                raw_type = row.get("Issue Type") or row.get("Type") or row.get("Issue type") or "story"
                raw_status = row.get("Status") or row.get("status") or "todo"
                raw_priority = row.get("Priority") or row.get("priority") or "medium"
                description = row.get("Description") or row.get("description") or ""
                
                # Story points
                points_val = (
                    row.get("Story Points") or
                    row.get("Custom field (Story Points)") or
                    row.get("Story point estimate") or
                    row.get("Points") or None
                )
                story_points = None
                if points_val:
                    try:
                        story_points = float(points_val)
                    except ValueError:
                        story_points = None

                # Sprint detection
                sprint_name = row.get("Sprint") or row.get("Sprint Name") or row.get("Custom field (Sprint)") or None
                if sprint_name and sprint_name.strip():
                    sprint_name = sprint_name.strip()
                else:
                    sprint_name = None

                # Labels
                labels_raw = row.get("Labels") or row.get("labels") or ""
                labels = [lbl.strip() for lbl in labels_raw.replace(";", ",").split(",") if lbl.strip()]

                parsed_issues.append({
                    "summary": summary.strip(),
                    "description": description.strip(),
                    "type": normalize_type(raw_type),
                    "status": normalize_status(raw_status),
                    "priority": normalize_priority(raw_priority),
                    "story_points": story_points,
                    "sprint_name": sprint_name,
                    "labels": labels,
                })
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse Jira CSV: {str(e)}")

    if not parsed_issues:
        raise HTTPException(status_code=400, detail="No valid issues found in the uploaded file. Please ensure the CSV contains a 'Summary' column.")

    # Process and import into MongoDB
    last_num = project.get("last_issue_number", 0)
    project_key = project.get("key", "JIRA")
    reporter_id = current_user["id"] if current_user else (project.get("lead_id") or None)

    created_issues_count = 0
    now = datetime.now(timezone.utc)

    for issue_data in parsed_issues:
        last_num += 1
        issue_key = f"{project_key}-{last_num}"

        sprint_id = None
        sprint_name = issue_data.get("sprint_name")
        if sprint_name:
            s_key = sprint_name.strip().lower()
            if s_key in sprint_cache:
                sprint_id = sprint_cache[s_key]
            else:
                # Create sprint automatically
                new_sprint = {
                    "project_id": project_id,
                    "name": sprint_name.strip(),
                    "goal": "Imported from Jira",
                    "status": "future",
                    "created_at": now
                }
                sp_res = await db.sprints.insert_one(new_sprint)
                sprint_id = str(sp_res.inserted_id)
                sprint_cache[s_key] = sprint_id
                created_sprints_count += 1

        doc = {
            "project_id": project_id,
            "key": issue_key,
            "summary": issue_data["summary"],
            "description": issue_data["description"],
            "type": issue_data["type"],
            "status": issue_data["status"],
            "priority": issue_data["priority"],
            "story_points": issue_data["story_points"],
            "assignee_id": None,
            "reporter_id": reporter_id,
            "sprint_id": sprint_id,
            "epic_id": None,
            "parent_id": None,
            "labels": issue_data["labels"],
            "order": float(last_num * 1000),
            "created_at": now,
            "updated_at": now
        }
        await db.issues.insert_one(doc)
        created_issues_count += 1

    # Update project last issue number
    await db.projects.update_one(
        {"_id": ObjectId(project_id)},
        {"$set": {"last_issue_number": last_num}}
    )

    return {
        "status": "success",
        "message": f"Successfully imported {created_issues_count} Jira issues into {project['name']}.",
        "imported_issues_count": created_issues_count,
        "created_sprints_count": created_sprints_count,
        "project_key": project_key,
        "last_issue_key": f"{project_key}-{last_num}"
    }

@router.get("/export-jira-csv")
async def export_jira_csv(project_id: str, db=Depends(get_database)):
    """Export project issues in standard Jira-compatible CSV format"""
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")
        
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    issues = await db.issues.find({"project_id": project_id}).sort("order", 1).to_list(length=2000)
    sprints = await db.sprints.find({"project_id": project_id}).to_list(length=200)
    users = await db.users.find().to_list(length=200)

    sprint_map = {str(s["_id"]): s["name"] for s in sprints}
    user_map = {str(u["_id"]): u["name"] for u in users}

    output = io.StringIO()
    writer = csv.writer(output)

    # Standard Jira CSV Headers
    headers = [
        "Issue Type",
        "Issue key",
        "Summary",
        "Status",
        "Priority",
        "Assignee",
        "Reporter",
        "Story Points",
        "Sprint",
        "Labels",
        "Description",
        "Created"
    ]
    writer.writerow(headers)

    for iss in issues:
        writer.writerow([
            iss.get("type", "Story").capitalize(),
            iss.get("key", ""),
            iss.get("summary", ""),
            iss.get("status", "To Do").capitalize(),
            iss.get("priority", "Medium").capitalize(),
            user_map.get(iss.get("assignee_id"), "Unassigned"),
            user_map.get(iss.get("reporter_id"), "Admin"),
            iss.get("story_points") if iss.get("story_points") is not None else "",
            sprint_map.get(iss.get("sprint_id"), ""),
            ",".join(iss.get("labels", [])),
            iss.get("description", ""),
            iss.get("created_at", "").isoformat() if hasattr(iss.get("created_at"), "isoformat") else str(iss.get("created_at", ""))
        ])

    csv_content = output.getvalue()
    filename = f"{project.get('key', 'JIRA')}_Export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/export-json")
async def export_json_backup(project_id: str, db=Depends(get_database)):
    """Export complete project backup in JSON format"""
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")
        
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    issues = await db.issues.find({"project_id": project_id}).to_list(length=2000)
    sprints = await db.sprints.find({"project_id": project_id}).to_list(length=200)

    backup = {
        "project": serialize_doc(project),
        "sprints": serialize_docs(sprints),
        "issues": serialize_docs(issues),
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "format": "TopBrains Jira Backup v1.0"
    }

    json_content = json.dumps(backup, indent=2)
    filename = f"{project.get('key', 'JIRA')}_Backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

    return Response(
        content=json_content,
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
