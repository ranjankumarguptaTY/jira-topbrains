# TopBrains — Unified Chat + Jira Collaboration Platform

> **Build one collaboration platform where people communicate, manage work, receive updates, and track progress without constantly switching between separate tools.**

A production-grade, full-featured unified collaboration platform combining the best concepts of **Slack-style real-time communication** and **Jira-style work management**.

Built as a high-performance **PWA (Progressive Web Application)** with a modular architecture ready for future Electron desktop packaging.

---

## 🏛️ System Architecture

```text
                            UNIFIED COLLABORATION PLATFORM
                                          |
                +-------------------------+-------------------------+
                |                                                   |
              CHAT                                                JIRA
       - Direct 1:1 Messages                               - Projects & Sprints
       - Group & Team Channels                             - Interactive Kanban Board
       - Guest Message Requests                            - Backlog & Roadmap Planning
       - Temporary Resumable Files                         - Issues Table & Subtasks
       - Real-Time WebSockets                              - Activity Timeline
                |                                                   |
                +-------------------------+-------------------------+
                                          |
                                    DOMAIN EVENTS
                         (IssueAssigned, StatusChanged, etc.)
                                          |
                                          v
                              UNIFIED NOTIFICATIONS
                           (In-App, Badges & WebSocket)
```

---

## ✨ Key Features & Product Modules

### 1. 💬 Real-Time Chat (Slack-Style)
- **Direct Messaging (1:1)**: Instant private conversations between teammates.
- **Team Channels & Groups**: Multi-user channels (e.g., `#general`, `#engineering`, `#frontend`) grouped by team.
- **Real-Time WebSocket Engine**: Instant messaging with auto-reconnecting WebSocket client, heartbeat, and delivery indicators.
- **Unread Badges & Read State**: Accurate per-conversation unread message tracking and read synchronization.

### 2. 👥 Guest / External User Chat
- **Controlled Message Request Flow**: External guests can sign up and send a 1:1 chat request to allowed users.
- **Request States**: `PENDING` ➔ `ACCEPTED` (initiates 1:1 chat), `DECLINED`, or `BLOCKED`.
- **Strict Permission Boundary**: Guest acceptance creates an isolated 1:1 chat conversation **without** exposing internal teams, channels, projects, or ticket boards.

### 3. 📂 Server-Backed Resumable File Transfers
- **Resumable Chunked Upload**: 4 MB binary chunking with live upload progress tracking.
- **Resumable Downloads**: HTTP Range requests (`206 Partial Content`) for interrupted downloads.
- **SHA-256 Integrity Verification**: Cryptographic checksum computed on physical upload completion.
- **Temporary Storage Lifecycle**: Ephemeral server storage with automatic physical deletion upon delivery confirmation or 15-day expiry.

### 4. 📋 Agile Work & Project Management (Jira-Style)
- **Projects & Sprints**: Manage multiple agile projects with active and future sprint cycles.
- **Interactive Kanban Board**: Drag-and-drop issue cards across workflow states (`To Do`, `In Progress`, `In Review`, `Done`).
- **Backlog & Roadmap**: Sprint planning, backlog estimation, epic tracking, and release timelines.
- **Rich Issue Tracking**: Epics, stories, tasks, bugs, subtasks, story points, time tracking, due dates, labels, and activity audits.

### 5. 🔄 Chat ↔ Jira Event-Driven Integration
- **Automatic Domain Events**: Jira mutations (`IssueAssigned`, `IssueStatusChanged`, `IssueCommentAdded`, `IssueCompleted`) trigger domain events across the platform.
- **In-Chat Actionable Ticket Cards**: Interactive cards appear in chat with status badges, project keys, and a 1-click **[Open Ticket]** button.
- **Single Source of Truth**: Jira remains the work state authority while Chat seamlessly delivers context and notifications.

### 6. 📊 Consolidated "My Work" Dashboard
- Consolidated view across all projects with three core tabs:
  - **Assigned to Me**: Active tasks requiring your attention.
  - **Created by Me**: Track tickets you reported or delegated.
  - **Completed**: Overview of finished work.
- Multi-dimensional filters by Project, Status, Priority, Type, and text search.

### 7. 🏢 Organization & Team Hierarchy
- **Super Admin**: Workspace management, org settings, team head creation, and global privileges.
- **Team Head**: Manage team members, create channels, assign work, and monitor team activities.
- **Members**: Participate in team channels, assigned projects, and direct communication.

### 8. 📱 PWA & Electron Desktop Readiness
- **PWA Installability**: Installable on desktop and mobile (`manifest.json`, `display: standalone`, service worker offline caching).
- **Decoupled Client Architecture**: Clean separation between UI layers, API services, and WebSocket listeners for future Electron shell wrapping.

---

## 🛡️ Security Hardening

- **HTTP Security Headers**: Strict CSP, HSTS (`max-age=31536000`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection: 1; mode=block`.
- **CORS Management**: Configurable `ALLOWED_ORIGINS` via environment variables.
- **Role-Based Access Control (RBAC)**: Endpoint-level permission guards for Super Admin, Team Head, and Members.
- **Bcrypt DoS Protection**: 72-character maximum password length enforced on registration and authentication schemas.
- **Unpredictable File Paths**: Temporary storage paths generated using cryptographic UUIDs and sanitized parameters.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite 8, React Router v7, `@hello-pangea/dnd`, `lucide-react`, Axios, Vanilla CSS Design System |
| **Backend** | Python 3.11+, FastAPI, Native WebSockets, Pydantic v2, Python-JOSE (JWT), Passlib (Bcrypt) |
| **Database** | MongoDB with Async Motor & PyMongo |
| **PWA** | Service Worker (`sw.js`), Web App Manifest (`manifest.json`) |

---

## 🚀 How to Start All Servers

### Prerequisites
- **Node.js** (v18+) & **npm**
- **Python** (v3.11+)
- **MongoDB** (v6.0+) running locally or via MongoDB Atlas

---

### Option A: One-Click Startup (All-in-One)

We provide automated startup scripts that launch **MongoDB**, **FastAPI Backend (Port 8000)**, and **React Frontend (Port 5173)** simultaneously:

- **Windows (Command Prompt / PowerShell)**:
  ```powershell
  .\start.bat
  ```
- **macOS / Linux**:
  ```bash
  chmod +x start.sh
  ./start.sh
  ```

---

### Option B: Manual Startup (Individual Terminals)

If you prefer starting each service individually in separate terminals:

#### 1. Start MongoDB (Terminal 1)
```bash
# Start local MongoDB daemon
mongod --dbpath "./data/db" --port 27017
```

#### 2. Start Backend API & WebSocket Server (Terminal 2)
```powershell
cd backend

# Activate virtual environment
.\.venv\Scripts\activate          # On Windows
# source .venv/bin/activate       # On Linux/macOS

# Install dependencies (first time only)
pip install -r requirements.txt

# Start FastAPI server with live auto-reload
uvicorn app.main:app --port 8000 --reload
```
- **API Server:** [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Interactive Swagger Docs:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Health Check:** [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)
- **WebSocket Gateway:** `ws://127.0.0.1:8000/ws?token=<JWT>`

#### 3. Start Frontend Client & PWA (Terminal 3)
```powershell
cd frontend

# Install dependencies (first time only)
npm install

# Start Vite development server
npm run dev
```
- **Web App:** Open [http://localhost:5173](http://localhost:5173) in your browser.
- **PWA Installation:** Click the **Install** button in your browser's address bar to run as a native desktop application.

---

## 🗄️ Database Seeding

To populate your database with complete demo data (Organization, Teams, Channels, Chat Messages, Sprints, Epics, Stories, Bugs, Subtasks, Comments, and Guest Requests):

### Method 1: Via Swagger UI (Recommended)
1. Open [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
2. Locate the **`POST /api/seed`** endpoint under the **seed** tag.
3. Click **"Try it out"** ➔ **"Execute"**.

### Method 2: Via PowerShell / Terminal
```powershell
# Using PowerShell
Invoke-RestMethod -Method POST -Uri "http://127.0.0.1:8000/api/seed"

# Or using curl
curl -X POST http://127.0.0.1:8000/api/seed
```

### Method 3: Via App UI
On the login screen ([http://localhost:5173/login](http://localhost:5173/login)), click any of the **Demo Accounts** cards to sign in immediately.

---

## 🔑 Default Credentials in Database

| Name | Email | Password | Role | Description |
|---|---|---|---|---|
| **TopBrains Admin** | `admin@topbrains.com` | `adminpassword123` | `admin` | **Super Administrator** (Full organization, team, and global privileges) |
| **Alex Morgan** | `alex.morgan@topbrains.com` | `password123` | `team_head` | **Engineering Team Head** (Manages team members, channels, and project assignments) |
| **Emily Watson** | `emily.watson@topbrains.com` | `password123` | `team_head` | **Product Team Head** (Product roadmaps, epics, sprint planning) |
| **Sarah Chen** | `sarah.chen@topbrains.com` | `password123` | `member` | **Frontend Engineer** (Assigned active sprint tickets and subtasks) |
| **David Kim** | `david.kim@topbrains.com` | `password123` | `member` | **Backend Engineer** (Assigned infrastructure tasks and bug fixes) |
| **Jordan Guest** | `guest.user@external.com` | `password123` | `member` | **External Guest User** (Pending 1:1 chat request to test guest workflow) |

---

## 🌐 Production Server Deployment Guide

This guide covers deploying the application to a production Linux server (Ubuntu/Debian) using **Nginx**, **Systemd/Gunicorn**, and **SSL/HTTPS**.

```text
               +-------------------------------------------+
               |              Internet / Users             |
               +-------------------------------------------+
                                     |
                                HTTPS (443)
                                     v
               +-------------------------------------------+
               |              Nginx Reverse Proxy          |
               +-------------------------------------------+
                      |                            |
          Static Assets (/ & /assets)      API & WebSocket (/api & /ws)
                      v                            v
               +---------------+           +---------------+
               | Frontend Dist |           | FastAPI / Gunicorn
               |  (PWA Build)  |           | (Port 8000)   |
               +---------------+           +---------------+
                                                   |
                                                   v
                                           +---------------+
                                           |  MongoDB 6.0+ |
                                           +---------------+
```

---

### Step 1: Server Environment & Dependencies

On your target production server:
```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Python, Node.js, and Nginx
sudo apt install -y python3-pip python3-venv nodejs npm nginx certbot python3-certbot-nginx

# Install MongoDB (or connect to MongoDB Atlas)
sudo apt install -y mongodb-org
sudo systemctl enable --now mongod
```

---

### Step 2: Configure Production Environment Variables

Create `/path/to/jira-clone/backend/.env`:
```env
PROJECT_NAME="TopBrains Collaboration Platform"
MONGODB_URL="mongodb://127.0.0.1:27017"
DATABASE_NAME="topbrains_prod_db"

# Security (generate with: python -c "import secrets; print(secrets.token_urlsafe(64))")
SECRET_KEY="generate-a-strong-random-64-character-secret-key-here"
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# Production Domain(s) for CORS
ALLOWED_ORIGINS="https://app.yourdomain.com,https://yourdomain.com"

# File Storage Configuration
MAX_FILE_SIZE_MB=250
TEMP_FILE_EXPIRY_DAYS=15
TEMP_STORAGE_LIMIT_GB=1500
FILE_TRANSFER_DIR="/var/data/topbrains-file-transfers"
```

Create the storage directory and set permissions:
```bash
sudo mkdir -p /var/data/topbrains-file-transfers
sudo chown -R $USER:$USER /var/data/topbrains-file-transfers
```

---

### Step 3: Build the Frontend Production Bundle

```bash
cd /path/to/jira-clone/frontend

# Install dependencies
npm install

# Build optimized production bundle
npm run build
```
This generates the optimized production bundle in `/path/to/jira-clone/frontend/dist`.

---

### Step 4: Configure Backend Systemd Service

Create a systemd service file `/etc/systemd/system/topbrains-api.service`:
```ini
[Unit]
Description=TopBrains FastAPI Collaboration Platform Service
After=network.target mongod.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/path/to/jira-clone/backend
EnvironmentFile=/path/to/jira-clone/backend/.env
ExecStart=/path/to/jira-clone/backend/.venv/bin/gunicorn app.main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 127.0.0.1:8000 \
    --access-logfile /var/log/topbrains-access.log \
    --error-logfile /var/log/topbrains-error.log

Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now topbrains-api.service
sudo systemctl status topbrains-api.service
```

---

### Step 5: Configure Nginx (Reverse Proxy & WebSocket Support)

Create `/etc/nginx/sites-available/topbrains.conf`:
```nginx
server {
    server_name app.yourdomain.com;

    # Client body size limit for 250 MB chunked file uploads
    client_max_body_size 300M;

    # 1. Frontend Static Files (PWA)
    location / {
        root /path/to/jira-clone/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 30d;
            add_header Cache-Control "public, no-transform";
        }

        # Service worker & manifest should not be cached aggressively
        location ~* (sw\.js|manifest\.json)$ {
            expires 0;
            add_header Cache-Control "no-cache, no-store, must-revalidate";
        }
    }

    # 2. REST API Reverse Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Support HTTP Range requests for resumable downloads
        proxy_set_header Range $http_range;
        proxy_set_header If-Range $http_if_range;
        proxy_pass_header Accept-Ranges;
    }

    # 3. WebSocket Endpoint Reverse Proxy
    location /ws {
        proxy_pass http://127.0.0.1:8000/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Keep WebSocket connection open (timeouts)
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # 4. Security Headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```

Enable the site and test configuration:
```bash
sudo ln -s /etc/nginx/sites-available/topbrains.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

### Step 6: SSL / HTTPS Setup (Certbot)

Obtain a free automated SSL certificate via Let's Encrypt:
```bash
sudo certbot --nginx -d app.yourdomain.com
```
Certbot will automatically configure HTTPS and redirect all HTTP traffic to HTTPS.

---

### Step 7: Automated Storage Cleanup Cron Job

To automatically clean up expired temporary file transfers (older than 15 days):
```bash
# Add cron job (runs daily at 2:00 AM)
crontab -e
```
Add the following line:
```cron
0 2 * * * find /var/data/topbrains-file-transfers -type f -mtime +15 -delete && find /var/data/topbrains-file-transfers -type d -empty -delete
```

---

## 📁 Repository Structure

```text
jira-clone/
├── backend/
│   ├── app/
│   │   ├── api/             # API Routers (auth, chat, teams, issues, files, seed, etc.)
│   │   ├── core/            # Config, MongoDB database connection, security, events
│   │   ├── schemas/         # Pydantic data schemas
│   │   └── main.py          # FastAPI application entry & WebSocket endpoint
│   └── requirements.txt
├── frontend/
│   ├── public/              # PWA manifest (manifest.json), service worker (sw.js), icons
│   ├── src/
│   │   ├── components/      # Board, Backlog, Issue, Layout, and Modal components
│   │   ├── context/         # Auth, Project, Modal, WebSocket, Notification contexts
│   │   ├── pages/           # Route pages (Home, Chat, Projects, My Work, Settings, Admin)
│   │   ├── services/        # Centralized Axios API client & WebSocket service
│   │   ├── router.jsx       # Client-side router definition
│   │   ├── index.css        # Core design system tokens & utility classes
│   │   └── App.jsx          # Root application component
│   ├── package.json
│   └── vite.config.js
├── data/                    # Database storage and temporary file transfers
└── Unified_Chat_Jira_Application_Technical_Design.md  # Detailed technical specification
```
