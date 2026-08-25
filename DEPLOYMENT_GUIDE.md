# 🚀 TopBrains Collaboration Platform — Production Server Deployment Guide

This guide provides complete, production-ready instructions for deploying the **TopBrains Unified Collaboration Platform (Jira Clone + Real-time Chat + Organization Management)** to a cloud server (Ubuntu VPS, AWS EC2, DigitalOcean, Hetzner, GCP, or on-premise).

---

## 📋 Table of Contents
1. [Super Admin Auto-Initialization](#1-super-admin-auto-initialization)
2. [MongoDB Database Seeding Options](#2-mongodb-database-seeding-options)
3. [Deployment Method A: Docker & Docker Compose (Recommended)](#3-deployment-method-a-docker--docker-compose-recommended)
4. [Deployment Method B: Bare-Metal Ubuntu Linux Server (Systemd + Nginx + SSL)](#4-deployment-method-b-bare-metal-ubuntu-linux-server-systemd--nginx--ssl)
5. [Configuring Free SSL Certificate (Let's Encrypt)](#5-configuring-free-ssl-certificate-lets-encrypt)
6. [Automated Database Backups](#6-automated-database-backups)
7. [Environment Variables Reference](#7-environment-variables-reference)

---

## 1. Super Admin Auto-Initialization

When the server starts up for the first time, it **automatically checks MongoDB** and creates the master **Super Admin** account if it doesn't already exist.

### Configuration (`.env`)
You can define the super admin credentials in your environment file:
```ini
SUPER_ADMIN_EMAIL=admin@yourcompany.com
SUPER_ADMIN_PASSWORD=YourStrongSecretPassword123!
SUPER_ADMIN_NAME=Platform Super Admin
```

> **Note**: If not provided, it defaults to `admin@topbrains.com` with password `adminpassword123`.

---

## 2. MongoDB Database Seeding Options

You have 3 flexible ways to initialize and seed the MongoDB database on your server:

### Option 1: Automatic Startup Seeding (`AUTO_SEED=true`)
Add `AUTO_SEED=true` to your backend `.env` file.  
When the backend starts up, if the database is completely empty (no organizations), it automatically generates sample organizations (TopBrains Tech Org, Wayne Enterprises), sample teams, active board tickets, and chat channels.

```ini
AUTO_SEED=true
```

---

### Option 2: Clean Production Start (Admin Only)
If you are launching for a real organization and **do not want dummy sample data**:
Run the CLI seed script in admin-only mode:

```bash
cd backend
# Linux / macOS
source .venv/bin/activate
python seed.py --admin-only

# Or inside Docker container
docker compose exec backend python seed.py --admin-only
```
*This creates the Super Admin account and verifies all database indexes with zero dummy tickets.*

---

### Option 3: Manual Full Demo Seeding
To populate demo teams and tickets on demand for testing:

```bash
cd backend
python seed.py
```

---

## 3. Deployment Method A: Docker & Docker Compose (Recommended)

Docker Compose containerizes MongoDB 7, FastAPI (Python 3.11 with 4 Uvicorn workers), and the React frontend with an optimized Nginx server.

### Prerequisites:
- Server with **Docker** and **Docker Compose** installed.
- Open ports: `80` (HTTP), `443` (HTTPS), and `8000` (optional if direct API access needed).

### Step 1: Clone the repository
```bash
git clone https://github.com/your-org/jira-clone.git
cd jira-clone
```

### Step 2: Create environment configuration
Create `.env` in the root folder:
```bash
cat << 'EOF' > .env
# Security
SECRET_KEY=9f823a8c1e4d7b6f2a0e5c8d1b4a7f0e3c6a9d2b5e8f1a4d7c0b3e6a9f2d5c8
ALLOWED_ORIGINS=*

# Super Admin Account
SUPER_ADMIN_EMAIL=admin@yourdomain.com
SUPER_ADMIN_PASSWORD=SuperSecurePassword2026!
SUPER_ADMIN_NAME=System Super Admin

# Auto Seed (set to false for production)
AUTO_SEED=false
EOF
```

### Step 3: Build and Start Containers
```bash
docker compose up -d --build
```

### Step 4: Verify Deployment
Check the status of running containers:
```bash
docker compose ps
docker compose logs -f backend
```

Your platform is now live at `http://your-server-ip`!

---

## 4. Deployment Method B: Bare-Metal Ubuntu Linux Server (Systemd + Nginx + SSL)

Follow these steps for running directly on an Ubuntu 22.04 or 24.04 LTS VPS without Docker.

### Step 1: Update Server & Install Prerequisites
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3-pip python3-venv nodejs npm nginx certbot python3-certbot-nginx curl git ufw
```

### Step 2: Install MongoDB Community Server
```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
   sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

sudo apt update
sudo apt install -y mongodb-org
sudo systemctl enable --now mongod
```

### Step 3: Clone Code & Setup Backend
```bash
cd /var/www
sudo git clone https://github.com/your-org/jira-clone.git topbrains
cd /var/www/topbrains/backend

# Create virtual environment & install requirements
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Create .env configuration
cp .env.example .env
nano .env  # Update your SECRET_KEY and SUPER_ADMIN credentials
```

### Step 4: Create Systemd Service for FastAPI Backend
```bash
sudo nano /etc/systemd/system/topbrains-backend.service
```

Paste the following configuration:
```ini
[Unit]
Description=TopBrains Collaboration Platform Backend API
After=network.target mongod.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/topbrains/backend
EnvironmentFile=/var/www/topbrains/backend/.env
ExecStart=/var/www/topbrains/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 4

Restart=always
RestartSec=5s

[Install]
WantedBy=multi-user.target
```

Enable and start the backend service:
```bash
sudo chown -R www-data:www-data /var/www/topbrains
sudo systemctl daemon-reload
sudo systemctl enable --now topbrains-backend
sudo systemctl status topbrains-backend
```

---

### Step 5: Build Frontend
```bash
cd /var/www/topbrains/frontend
npm install
npm run build
```

---

### Step 6: Configure Nginx Reverse Proxy
```bash
sudo nano /etc/nginx/sites-available/topbrains
```

Paste the following Nginx server block:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    root /var/www/topbrains/frontend/dist;
    index index.html;

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket Proxy
    location /ws {
        proxy_pass http://127.0.0.1:8000/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

Enable site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/topbrains /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 5. Configuring Free SSL Certificate (Let's Encrypt)

Obtain free automated SSL certificates with Certbot:

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Select the option to automatically redirect HTTP traffic to HTTPS. Certbot will configure renewal cron jobs automatically.

---

## 6. Automated Database Backups

Set up a daily automated MongoDB backup:

```bash
sudo mkdir -p /var/backups/mongodb
sudo nano /usr/local/bin/backup-topbrains-db.sh
```

Add backup script:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/mongodb"
DATE=$(date +"%Y-%m-%d_%H%M%S")
mongodump --db=topbrains_jira_db --out="${BACKUP_DIR}/backup_${DATE}"
# Keep last 7 days only
find ${BACKUP_DIR}/* -mtime +7 -exec rm -rf {} \;
```

Make it executable and add to crontab:
```bash
sudo chmod +x /usr/local/bin/backup-topbrains-db.sh
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-topbrains-db.sh") | crontab -
```

---

## 7. Environment Variables Reference

| Variable | Description | Default |
| :--- | :--- | :--- |
| `MONGODB_URL` | MongoDB connection string | `mongodb://localhost:27017` |
| `DATABASE_NAME` | Database name | `topbrains_jira_db` |
| `SECRET_KEY` | JWT signing secret key (32+ chars) | Required in production |
| `SUPER_ADMIN_EMAIL` | Master Super Admin email | `admin@topbrains.com` |
| `SUPER_ADMIN_PASSWORD`| Master Super Admin password | `adminpassword123` |
| `SUPER_ADMIN_NAME` | Display name of Super Admin | `TopBrains Super Admin` |
| `AUTO_SEED` | Auto-populate demo teams & tickets on empty DB | `false` |
| `ALLOWED_ORIGINS` | Comma-separated CORS allowed origins | `*` |
| `MAX_FILE_SIZE_MB` | Maximum allowed attachment file size (MB) | `250` |
| `TEMP_FILE_EXPIRY_DAYS`| Retention policy for transient file transfers | `15` |
