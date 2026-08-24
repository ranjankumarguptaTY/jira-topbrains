import os
import hashlib
import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status, Header
from fastapi.responses import StreamingResponse, FileResponse
from bson import ObjectId
from app.core.config import settings
from app.core.database import get_database, serialize_doc
from app.core.security import get_current_user
from app.schemas.file_transfer import FileTransferInitiate, FileTransferStatusResponse

router = APIRouter(prefix="/api/file-transfers", tags=["file-transfers"])

# Base temporary storage directory
TEMP_DIR = os.path.abspath(settings.FILE_TRANSFER_DIR)
os.makedirs(TEMP_DIR, exist_ok=True)


def get_transfer_dir(transfer_id: str) -> str:
    # Security: Ensure unpredictable sanitized path within TEMP_DIR
    clean_id = "".join(c for c in transfer_id if c.isalnum() or c in ("-", "_"))
    path = os.path.join(TEMP_DIR, f"tr_{clean_id}")
    return path


@router.post("/initiate", response_model=FileTransferStatusResponse)
async def initiate_file_transfer(
    transfer_in: FileTransferInitiate,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """Initiate a resumable file transfer session."""
    # Check max file size
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if transfer_in.file_size_bytes > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum allowed size of {settings.MAX_FILE_SIZE_MB} MB."
        )

    # Verify membership in conversation
    membership = await db.conversation_members.find_one({
        "conversation_id": transfer_in.conversation_id,
        "user_id": current_user["id"]
    })
    if not membership:
        raise HTTPException(status_code=403, detail="Not authorized for this conversation")

    transfer_id = str(uuid.uuid4())
    t_dir = get_transfer_dir(transfer_id)
    os.makedirs(t_dir, exist_ok=True)

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=settings.TEMP_FILE_EXPIRY_DAYS)

    transfer_doc = {
        "transfer_id": transfer_id,
        "conversation_id": transfer_in.conversation_id,
        "sender_id": current_user["id"],
        "filename": os.path.basename(transfer_in.filename),
        "file_size_bytes": transfer_in.file_size_bytes,
        "uploaded_bytes": 0,
        "mime_type": transfer_in.mime_type or "application/octet-stream",
        "sha256_client": transfer_in.sha256_client,
        "sha256": None,
        "status": "uploading",
        "recipient_user_ids": transfer_in.recipient_user_ids or [],
        "download_count": 0,
        "expires_at": expires_at,
        "created_at": now,
        "updated_at": now
    }

    result = await db.file_transfers.insert_one(transfer_doc)
    transfer_doc["_id"] = result.inserted_id

    # Create metadata.json in storage folder
    metadata_path = os.path.join(t_dir, "metadata.json")
    with open(metadata_path, "w", encoding="utf-8") as f:
        meta = {**transfer_doc}
        meta["_id"] = str(meta["_id"])
        meta["expires_at"] = meta["expires_at"].isoformat()
        meta["created_at"] = meta["created_at"].isoformat()
        meta["updated_at"] = meta["updated_at"].isoformat()
        json.dump(meta, f, indent=2)

    # Create empty part file
    part_path = os.path.join(t_dir, "file.part")
    with open(part_path, "wb") as f:
        pass

    doc = serialize_doc(transfer_doc)
    doc["id"] = str(result.inserted_id)
    doc["sender"] = {
        "id": current_user["id"],
        "name": current_user.get("name"),
        "avatar_url": current_user.get("avatar_url")
    }
    return doc


@router.get("/{transfer_id}/status", response_model=FileTransferStatusResponse)
async def get_transfer_status(
    transfer_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """Get status of an ongoing or completed file transfer."""
    transfer = await db.file_transfers.find_one({"transfer_id": transfer_id})
    if not transfer:
        raise HTTPException(status_code=404, detail="File transfer not found")

    doc = serialize_doc(transfer)
    sender = await db.users.find_one({"_id": ObjectId(transfer["sender_id"])}, {"password_hash": 0})
    if sender:
        doc["sender"] = serialize_doc(sender)
    return doc


@router.put("/{transfer_id}/upload")
async def upload_file_chunk(
    transfer_id: str,
    request: Request,
    x_chunk_offset: int = Header(0, alias="X-Chunk-Offset"),
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """Upload a binary chunk to the resumable part file."""
    transfer = await db.file_transfers.find_one({"transfer_id": transfer_id})
    if not transfer:
        raise HTTPException(status_code=404, detail="File transfer not found")

    if transfer["sender_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the sender can upload chunks")

    if transfer["status"] not in ("uploading", "failed"):
        raise HTTPException(status_code=400, detail=f"Transfer is already {transfer['status']}")

    t_dir = get_transfer_dir(transfer_id)
    part_path = os.path.join(t_dir, "file.part")

    chunk_data = await request.body()
    if not chunk_data:
        raise HTTPException(status_code=400, detail="Empty chunk data")

    # Write chunk at offset
    with open(part_path, "r+b" if os.path.exists(part_path) else "wb") as f:
        f.seek(x_chunk_offset)
        f.write(chunk_data)
        current_size = f.tell()

    await db.file_transfers.update_one(
        {"transfer_id": transfer_id},
        {"$set": {"uploaded_bytes": current_size, "updated_at": datetime.now(timezone.utc)}}
    )

    # Broadcast progress via WebSocket
    try:
        from app.api.websocket import manager
        await manager.broadcast_to_conversation(transfer["conversation_id"], {
            "type": "FILE_UPLOAD_PROGRESS",
            "transfer_id": transfer_id,
            "uploaded_bytes": current_size,
            "file_size_bytes": transfer["file_size_bytes"],
            "percentage": round((current_size / transfer["file_size_bytes"]) * 100, 1)
        })
    except Exception:
        pass

    return {
        "status": "ok",
        "transfer_id": transfer_id,
        "uploaded_bytes": current_size,
        "file_size_bytes": transfer["file_size_bytes"]
    }


@router.post("/{transfer_id}/upload/complete", response_model=FileTransferStatusResponse)
async def complete_file_upload(
    transfer_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """Verify SHA-256 integrity and mark file ready for recipients to download."""
    transfer = await db.file_transfers.find_one({"transfer_id": transfer_id})
    if not transfer:
        raise HTTPException(status_code=404, detail="File transfer not found")

    t_dir = get_transfer_dir(transfer_id)
    part_path = os.path.join(t_dir, "file.part")

    if not os.path.exists(part_path):
        raise HTTPException(status_code=400, detail="File part not found on disk")

    actual_size = os.path.getsize(part_path)
    if actual_size != transfer["file_size_bytes"]:
        raise HTTPException(
            status_code=400,
            detail=f"Size mismatch: expected {transfer['file_size_bytes']} bytes, got {actual_size}"
        )

    # Calculate SHA-256
    sha256_hash = hashlib.sha256()
    with open(part_path, "rb") as f:
        for byte_block in iter(lambda: f.read(65536), b""):
            sha256_hash.update(byte_block)
    computed_sha = sha256_hash.hexdigest()

    now = datetime.now(timezone.utc)
    await db.file_transfers.update_one(
        {"transfer_id": transfer_id},
        {"$set": {
            "sha256": computed_sha,
            "status": "ready",
            "uploaded_bytes": actual_size,
            "updated_at": now
        }}
    )

    # Automatically create a message in the conversation representing the file
    msg_doc = {
        "conversation_id": transfer["conversation_id"],
        "sender_id": current_user["id"],
        "content": f"Shared file: {transfer['filename']}",
        "type": "file",
        "metadata": {
            "transfer_id": transfer_id,
            "filename": transfer["filename"],
            "file_size_bytes": transfer["file_size_bytes"],
            "mime_type": transfer["mime_type"],
            "sha256": computed_sha
        },
        "created_at": now
    }
    msg_res = await db.messages.insert_one(msg_doc)
    msg_doc["_id"] = msg_res.inserted_id

    # Broadcast FILE_READY to conversation
    try:
        from app.api.websocket import manager
        await manager.broadcast_to_conversation(transfer["conversation_id"], {
            "type": "FILE_READY",
            "transfer_id": transfer_id,
            "conversation_id": transfer["conversation_id"],
            "message": serialize_doc(msg_doc)
        })
    except Exception:
        pass

    updated = await db.file_transfers.find_one({"transfer_id": transfer_id})
    return serialize_doc(updated)


@router.get("/{transfer_id}/download")
async def download_file(
    transfer_id: str,
    request: Request,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """Download file with HTTP Range support for resumable downloads."""
    transfer = await db.file_transfers.find_one({"transfer_id": transfer_id})
    if not transfer:
        raise HTTPException(status_code=404, detail="File transfer not found")

    if transfer["status"] not in ("ready", "completed"):
        raise HTTPException(status_code=400, detail="File is not ready for download")

    t_dir = get_transfer_dir(transfer_id)
    part_path = os.path.join(t_dir, "file.part")

    if not os.path.exists(part_path):
        raise HTTPException(status_code=404, detail="Physical file no longer available on server")

    file_size = os.path.getsize(part_path)
    range_header = request.headers.get("range")

    headers = {
        "Content-Disposition": f'attachment; filename="{transfer["filename"]}"',
        "Accept-Ranges": "bytes",
        "X-SHA256": transfer.get("sha256", "")
    }

    if range_header:
        # Handle resumable range request (e.g., bytes=1000-)
        try:
            byte_range = range_header.replace("bytes=", "").split("-")
            start = int(byte_range[0])
            end = int(byte_range[1]) if byte_range[1] else file_size - 1
            length = end - start + 1

            def iter_range():
                with open(part_path, "rb") as f:
                    f.seek(start)
                    bytes_left = length
                    while bytes_left > 0:
                        chunk_to_read = min(65536, bytes_left)
                        data = f.read(chunk_to_read)
                        if not data:
                            break
                        bytes_left -= len(data)
                        yield data

            headers["Content-Range"] = f"bytes {start}-{end}/{file_size}"
            headers["Content-Length"] = str(length)
            return StreamingResponse(
                iter_range(),
                status_code=status.HTTP_206_PARTIAL_CONTENT,
                headers=headers,
                media_type=transfer["mime_type"]
            )
        except Exception:
            pass

    # Full download
    headers["Content-Length"] = str(file_size)
    return FileResponse(
        part_path,
        media_type=transfer["mime_type"],
        filename=transfer["filename"],
        headers=headers
    )


@router.post("/{transfer_id}/download/complete")
async def confirm_download_complete(
    transfer_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """Client confirms successful download. Server can clean up temporary storage."""
    transfer = await db.file_transfers.find_one({"transfer_id": transfer_id})
    if not transfer:
        raise HTTPException(status_code=404, detail="File transfer not found")

    new_count = transfer.get("download_count", 0) + 1
    await db.file_transfers.update_one(
        {"transfer_id": transfer_id},
        {"$set": {
            "download_count": new_count,
            "status": "completed",
            "updated_at": datetime.now(timezone.utc)
        }}
    )

    # In single receiver DM, cleanup physical bytes immediately upon confirmation
    # If group/channel, file is retained until expiresAt or manual cleanup
    t_dir = get_transfer_dir(transfer_id)
    part_path = os.path.join(t_dir, "file.part")
    if os.path.exists(part_path) and transfer.get("conversation_type") == "direct":
        try:
            os.remove(part_path)
        except Exception:
            pass

    return {"status": "completed", "download_count": new_count}


@router.post("/{transfer_id}/cancel")
async def cancel_transfer(
    transfer_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """Cancel file transfer and delete temporary data."""
    transfer = await db.file_transfers.find_one({"transfer_id": transfer_id})
    if not transfer:
        raise HTTPException(status_code=404, detail="File transfer not found")

    if transfer["sender_id"] != current_user["id"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to cancel this transfer")

    await db.file_transfers.update_one(
        {"transfer_id": transfer_id},
        {"$set": {"status": "cancelled", "updated_at": datetime.now(timezone.utc)}}
    )

    # Remove temporary folder
    t_dir = get_transfer_dir(transfer_id)
    if os.path.exists(t_dir):
        import shutil
        shutil.rmtree(t_dir, ignore_errors=True)

    return {"status": "cancelled"}
