import os
import gc
import uuid
import asyncio
import logging
import mimetypes
import subprocess
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, status, Request
from fastapi.responses import FileResponse, StreamingResponse
from PIL import Image, ImageOps

logger = logging.getLogger("sprintr_media")
router = APIRouter(prefix="/api/media", tags=["media"])

# Base directory for uploaded media - absolute path
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
MEDIA_DIR = BACKEND_DIR / "data" / "media"
MEDIA_DIR.mkdir(parents=True, exist_ok=True)

# Also check root data/media if running from workspace root
ROOT_MEDIA_DIR = BACKEND_DIR.parent / "data" / "media"

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/ogg"}
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB limit

def compress_image_file(file_path: Path) -> Path:
    """Compress image file to WebP / optimized format with max 1920px dimensions to save 80%+ storage."""
    ext = file_path.suffix.lower()
    if ext in [".gif", ".svg"]:
        return file_path

    try:
        with Image.open(file_path) as im:
            # Transpose EXIF orientation
            im = ImageOps.exif_transpose(im)
            
            # Downscale if resolution is larger than 1920px
            if max(im.size) > 1920:
                im.thumbnail((1920, 1920), Image.Resampling.LANCZOS)
                
            # Convert to WebP for maximum compression efficiency
            out_file = file_path.with_suffix(".webp")
            
            # If RGBA, save as transparent WebP; if RGB, save as standard WebP
            if im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info):
                im.save(out_file, "WEBP", quality=82, method=6)
            else:
                im_rgb = im.convert("RGB")
                im_rgb.save(out_file, "WEBP", quality=82, method=6)

            if out_file.exists() and out_file.stat().st_size > 0:
                # Remove original uncompressed file if different name
                if out_file != file_path and file_path.exists():
                    try:
                        os.remove(file_path)
                    except Exception:
                        pass
                return out_file
    except Exception as e:
        logger.warning("Image compression notice (falling back to original): %s", e)
    return file_path

def compress_video_file(file_path: Path) -> Path:
    """Compress video using H.264 CRF 28 and faststart header to reduce 70%+ file size."""
    try:
        import imageio_ffmpeg
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        out_file = file_path.parent / f"opt_{file_path.stem}.mp4"
        
        cmd = [
            ffmpeg_exe,
            "-y",
            "-i", str(file_path),
            "-vcodec", "libx264",
            "-crf", "28",
            "-preset", "veryfast",
            "-vf", "scale='min(1280,iw)':-2",
            "-movflags", "+faststart",
            "-acodec", "aac",
            "-b:a", "128k",
            str(out_file)
        ]
        
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=120)
        if proc.returncode == 0 and out_file.exists() and out_file.stat().st_size > 0:
            if out_file.stat().st_size <= file_path.stat().st_size:
                final_file = file_path.with_suffix(".mp4")
                if file_path.exists():
                    try:
                        os.remove(file_path)
                    except Exception:
                        pass
                if out_file != final_file:
                    if final_file.exists():
                        try:
                            os.remove(final_file)
                        except Exception:
                            pass
                    out_file.rename(final_file)
                    return final_file
                return out_file
            else:
                try:
                    os.remove(out_file)
                except Exception:
                    pass
    except Exception as e:
        logger.warning("Video compression notice (falling back to original): %s", e)
    return file_path

@router.post("/upload")
async def upload_media(file: UploadFile = File(...)):
    """Upload and automatically compress image or video file to minimize server storage."""
    content_type = file.content_type or ""
    
    # Check if content type is allowed
    is_image = content_type in ALLOWED_IMAGE_TYPES or any(file.filename.lower().endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"])
    is_video = content_type in ALLOWED_VIDEO_TYPES or any(file.filename.lower().endswith(ext) for ext in [".mp4", ".webm", ".mov", ".avi", ".ogg"])
    
    if not (is_image or is_video):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Please upload an image (.png, .jpg, .gif, .webp) or video (.mp4, .webm, .mov)."
        )
    
    # Generate unique filename
    ext = Path(file.filename).suffix.lower() if file.filename else ".dat"
    unique_name = f"media_{uuid.uuid4().hex[:12]}{ext}"
    file_path = MEDIA_DIR / unique_name
    
    # Read and save in chunks
    file_size = 0
    with open(file_path, "wb") as buffer:
        while chunk := await file.read(1024 * 1024):  # 1MB chunk
            file_size += len(chunk)
            if file_size > MAX_FILE_SIZE:
                buffer.close()
                if file_path.exists():
                    os.remove(file_path)
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="File size exceeds maximum allowed limit (100MB)."
                )
            buffer.write(chunk)
            
    # Perform automated smart compression
    orig_size = file_size
    if is_image:
        compressed_file = compress_image_file(file_path)
        final_filename = compressed_file.name
        file_size = compressed_file.stat().st_size
        media_type = "image"
        final_mime = "image/webp" if compressed_file.suffix == ".webp" else (content_type or "image/jpeg")
    else:
        compressed_file = compress_video_file(file_path)
        final_filename = compressed_file.name
        file_size = compressed_file.stat().st_size
        media_type = "video"
        final_mime = "video/mp4"

    relative_url = f"/api/media/{final_filename}"
    reduction_pct = round((1 - (file_size / max(orig_size, 1))) * 100, 1)
    logger.info("Uploaded %s compressed: %d -> %d bytes (saved %s%%)", final_filename, orig_size, file_size, reduction_pct)

    return {
        "url": relative_url,
        "file_name": file.filename,
        "file_type": final_mime,
        "media_type": media_type,
        "file_size": file_size,
        "original_size": orig_size,
        "savings_percent": f"{reduction_pct}%" if reduction_pct > 0 else "0%",
    }

@router.get("/{filename}")
async def get_media(filename: str, request: Request):
    """Serve uploaded image or video with range streaming support for HTML5 video playback."""
    safe_filename = Path(filename).name
    
    # Check primary media directory
    file_path = MEDIA_DIR / safe_filename
    if not file_path.exists() and ROOT_MEDIA_DIR.exists():
        fallback_path = ROOT_MEDIA_DIR / safe_filename
        if fallback_path.exists():
            file_path = fallback_path

    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Media file not found")
        
    mime_type, _ = mimetypes.guess_type(str(file_path))
    mime_type = mime_type or "application/octet-stream"
    file_size = file_path.stat().st_size

    # Handle HTTP Range Header (Required by Chrome/Edge for HTML5 video playback)
    range_header = request.headers.get("range")
    if range_header:
        try:
            byte_range = range_header.replace("bytes=", "").strip()
            parts = byte_range.split("-")
            start = int(parts[0]) if parts[0] else 0
            end = int(parts[1]) if len(parts) > 1 and parts[1] else file_size - 1
            if end >= file_size:
                end = file_size - 1
            content_length = end - start + 1

            def iter_file():
                with open(file_path, "rb") as f:
                    f.seek(start)
                    bytes_remaining = content_length
                    while bytes_remaining > 0:
                        chunk_size = min(bytes_remaining, 1024 * 1024)
                        data = f.read(chunk_size)
                        if not data:
                            break
                        bytes_remaining -= len(data)
                        yield data

            headers = {
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(content_length),
                "Content-Type": mime_type,
                "Cache-Control": "public, max-age=86400",
            }
            return StreamingResponse(iter_file(), status_code=206, headers=headers)
        except Exception:
            pass

    # Standard non-range response
    headers = {
        "Accept-Ranges": "bytes",
        "Content-Length": str(file_size),
        "Content-Type": mime_type,
        "Cache-Control": "public, max-age=86400",
    }
    return FileResponse(
        path=file_path,
        media_type=mime_type,
        filename=safe_filename,
        headers=headers
    )

async def _delayed_remove(path: Path):
    """Attempt removal with retries if file is locked by streaming video connection on Windows."""
    for _ in range(6):
        await asyncio.sleep(0.5)
        try:
            gc.collect()
            if path.exists() and path.is_file():
                os.remove(path)
                return
        except Exception:
            pass

@router.delete("/{filename}")
async def delete_media(filename: str):
    """Delete an uploaded image or video file from server disk."""
    safe_filename = Path(filename).name
    deleted = False

    gc.collect()

    for dir_path in [MEDIA_DIR, ROOT_MEDIA_DIR]:
        if dir_path.exists():
            file_path = dir_path / safe_filename
            if file_path.exists() and file_path.is_file():
                try:
                    os.remove(file_path)
                    deleted = True
                except (PermissionError, OSError):
                    # Windows WinError 32 file lock from streaming socket - schedule background cleanup
                    asyncio.create_task(_delayed_remove(file_path))
                    deleted = True
                except Exception:
                    asyncio.create_task(_delayed_remove(file_path))
                    deleted = True

    return {
        "status": "ok",
        "deleted": deleted,
        "filename": safe_filename,
        "message": f"File {safe_filename} removed from storage"
    }
