# TopBrains Jira - Enterprise Issue & Project Tracking

A production-grade, full-featured clone of **Atlassian Jira Software & Work Management** built for **TopBrains**:
- **Backend:** Python (FastAPI + Async Motor)
- **Database:** MongoDB
- **Frontend:** React.js (Vite + Atlassian Design System CSS + `@hello-pangea/dnd`)

---

## 🚀 Features & Brand Updates

### 1. TopBrains Branding & Logo
- Custom **TopBrains Jira Logo** and **Favicon** (`favicon.svg`) combining neural brain lobes with agile Kanban pillars in an electric blue and purple gradient.

### 2. Default Master Administrator Account
The server and database seeder automatically initialize the Master Admin account:
- **Email:** `admin@topbrains.com`
- **Password:** `adminpassword123`
- **Role:** `admin` (Master Administrator)

### 3. Administrator Role Management
- **Public Registration Guard**: Public visitors cannot create admin accounts directly. All public signups are assigned standard team member roles.
- **Admin Management Panel**: Once logged in as an Administrator, open the user profile dropdown to access **"Team & Admin Management"** to create new Admin accounts or promote members.

---

## 🛠️ How to Run

### 1. MongoDB
```bash
mongod --dbpath "./data/db" --port 27017
```

### 2. Backend (FastAPI)
```bash
cd backend
.\.venv\Scripts\activate
uvicorn app.main:app --port 8000 --reload
```
API Documentation: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 3. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5175](http://localhost:5175) in your browser.
