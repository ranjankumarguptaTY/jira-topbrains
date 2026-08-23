# Unified Chat + Jira Collaboration Platform — Product & Technical Design

## 1. Product Vision

The application is a unified collaboration platform combining the most useful concepts of **Slack-style communication** and **Jira-style project/work management**.

The first release is a **web application**. An Electron desktop application can be introduced later without changing the core domain architecture.

The two major product modules are:

```text
                    UNIFIED APPLICATION
                           |
              +------------+------------+
              |                         |
             CHAT                      JIRA
              |                         |
       Communication             Work Management
              |                         |
              +------------+------------+
                           |
                 Notifications &
                  Activity Events
```

The central product idea is that communication and work should not feel like two disconnected applications.

A user should be able to communicate, receive work assignments, see relevant tickets, receive ticket updates, and act on work from the same platform.

---

# 2. Final Product Scope

The application has two major functional areas.

## 2.1 Chat

The chat module provides:

- Direct 1-to-1 messaging
- Team communication
- Group conversations
- Team channels
- External/guest chat
- Message requests for external users
- File sharing
- Notifications
- Jira-related notifications
- Work/ticket view inside the chat experience

## 2.2 Jira-like Work Management

The work-management module provides:

- Organizations
- Teams
- Projects
- Issues/tickets
- Stories
- Tasks
- Bugs
- Assignees
- Statuses
- Priorities
- Comments
- Project filtering
- Assigned-work views
- Created-work views
- Completed-work views
- Activity history

The exact issue types and Jira functionality can be expanded later.

---

# 3. Organization and User Hierarchy

The application begins with a Super Admin.

```text
                         SUPER ADMIN
                              |
              +---------------+---------------+
              |               |               |
          Team Head       Team Head       Team Head
              |               |               |
        +-----+-----+         |         +-----+-----+
        |           |         |         |           |
      User        User      Users     User        User
```

## 3.1 Super Admin

The Super Admin can:

- Create Team Heads
- Manage teams
- Manage users
- Manage organization settings
- Manage permissions
- View organization-level activity
- Potentially manage organization-wide projects depending on permissions

## 3.2 Team Head

A Team Head manages a team and can:

- Add team members
- Remove team members
- Manage internal communication
- Create/manage team groups or channels
- Assign work where permitted
- Monitor team activity
- Manage relevant team projects

---

# 4. Internal Team Communication

Team communication works similarly to Slack.

Example:

```text
Engineering
|
+-- #general
+-- #frontend
+-- #backend
+-- #qa
+-- #project-alpha
```

Users can communicate through:

### Direct chat

```text
RK <-> Rahul
```

### Group chat

```text
RK
Rahul
Amit
Priya
```

### Team/channel communication

```text
#frontend
#backend
#project-alpha
```

Access to team communication is controlled by team membership and permissions.

---

# 5. Guest / External Chat

External communication is intentionally separated from team membership.

A guest/external user can:

- Sign up
- Log in
- Find an allowed user
- Send a 1-to-1 chat request
- Wait for the recipient to accept
- Chat after acceptance
- Share files through an allowed 1-to-1 conversation
- Receive notifications

A guest cannot automatically access:

- Teams
- Team channels
- Group conversations
- Projects
- Jira tickets
- Internal team members
- Internal activity

unless explicitly invited/added.

---

# 6. Guest Message Request Flow

The external chat experience follows a message-request model similar to Google Chat.

```text
Guest User A
      |
      | Send chat request
      v
User B
      |
      v
+------------------------------+
| New message request           |
|                              |
| Guest A wants to chat with   |
| you.                         |
|                              |
| [Accept] [Decline] [Block]   |
+------------------------------+
```

The request states are:

```text
PENDING
   |
   +---- ACCEPTED ----> Normal 1:1 Chat
   |
   +---- DECLINED
   |
   +---- BLOCKED
```

Until accepted, the conversation remains a message request.

---

# 7. Chat Relationship vs Membership

These concepts must remain separate.

```text
Chat relationship
        !=
Team membership
        !=
Project membership
```

For example:

```text
Guest A <-> RK
External 1:1 chat = ACCEPTED

Guest A -> Engineering Team
Membership = NONE

Guest A -> Project Alpha
Membership = NONE
```

If RK or an authorized Team Head later invites the guest:

```text
Guest A
   |
   | Team invitation
   v
Engineering Team
   |
   v
Project permissions can be granted separately
```

This separation prevents accidental access escalation.

---

# 8. Guest Access Model

| Capability | External Guest | Team Member | Project Member |
|---|---:|---:|---:|
| 1-to-1 chat | Request → Accept | Yes | Yes |
| Group chat | No | Permission-based | Permission-based |
| Team channels | No | Yes | Maybe |
| Team member list | No | Yes | Limited |
| Project access | No | Permission-based | Yes |
| Jira tickets | No | Permission-based | Yes |
| Jira assignment | No | Permission-based | Yes |
| File sharing in allowed chat | Yes | Yes | Yes |
| Notifications | Yes | Yes | Yes |

---

# 9. Jira-like Project Management

The second major application module is project/work management.

```text
Projects
   |
   +-- Epics
   +-- Stories
   +-- Tasks
   +-- Bugs
   +-- Subtasks
```

Each issue can contain:

```text
Project
Issue ID
Title
Description
Creator/Reporter
Assignee
Status
Priority
Comments
Attachments
Dates
Activity
```

The exact issue hierarchy can evolve as the application grows.

---

# 10. Chat and Jira Integration

The major differentiator is that Jira activity is integrated into chat.

Example:

```text
Rahul assigns:

PROJ-123
"Implement login API"
        |
        v
Chat notification to RK
```

RK receives:

```text
+--------------------------------------+
| New Assignment                       |
|                                      |
| Rahul assigned you:                  |
| PROJ-123                             |
| Implement login API                  |
|                                      |
| Project: Authentication              |
| Priority: High                       |
|                                      |
| [Open Ticket]                        |
+--------------------------------------+
```

The chat notification should reference the actual Jira issue rather than duplicating the issue as an independent chat record.

---

# 11. Ticket Status Updates in Chat

Suppose RK receives:

```text
PROJ-123
```

and changes:

```text
TODO
  |
  v
IN PROGRESS
```

The assigner receives:

```text
+--------------------------------------+
| Ticket Updated                       |
|                                      |
| PROJ-123                             |
| Implement login API                  |
|                                      |
| TODO -> IN PROGRESS                  |
| Updated by RK                        |
|                                      |
| [Open Ticket]                        |
+--------------------------------------+
```

Later:

```text
IN PROGRESS
      |
      v
DONE
```

The relevant user receives:

```text
PROJ-123 completed by RK.
[Open Ticket]
```

---

# 12. Jira as Source of Truth

Jira/work management must remain the source of truth for ticket state.

Chat should not maintain an independent copy of:

```text
status
priority
assignee
```

Instead:

```text
Jira issue
    |
    | event
    v
Event system
    |
    +-- Chat notification
    +-- In-app notification
    +-- Activity feed
    +-- Optional push/email
```

A chat notification should reference:

```text
projectId
issueId
eventType
```

Clicking it opens the actual issue.

This prevents synchronization problems.

---

# 13. Event-Driven Integration

The application should use domain events to connect Chat and Jira.

Examples:

```text
IssueAssigned
IssueStatusChanged
IssuePriorityChanged
IssueCommentAdded
IssueMentioned
IssueCompleted
```

Example:

```text
Jira
 |
 | IssueAssigned
 v
Event System
 |
 +----> Chat Notification
 |
 +----> Notification Service
 |
 +----> Activity Feed
```

This is preferable to tightly coupling Jira directly to Chat services.

---

# 14. Notification System

Notifications should be a first-class application service.

```text
                 NOTIFICATION SERVICE
                         |
          +--------------+--------------+
          |              |              |
        Chat           Jira         Assignment
          |              |              |
          +--------------+--------------+
                         |
             +-----------+-----------+
             |                       |
        In-app notification      Push/desktop
```

Possible notification events:

### Chat

```text
Rahul sent you a message.
```

### Assignment

```text
You were assigned PROJ-123.
```

### Status

```text
PROJ-123 moved to DONE.
```

### Mention

```text
RK mentioned you in #frontend.
```

### Comment

```text
Rahul commented on PROJ-123.
```

Notifications should reach users for relevant messages and updates.

---

# 15. Work View Inside Chat

The Chat module should include a dedicated work section.

```text
CHAT
|
+-- Messages
+-- Channels
+-- Direct Messages
+-- Guest Requests
+-- Files
|
+-- My Work
     |
     +-- Assigned to Me
     +-- Created by Me
     +-- In Progress
     +-- Completed
     +-- All
```

The work view should support filtering.

Example:

```text
My Work

Project:
[ All Projects ]

Status:
[ All ]

Type:
[ All ]

Priority:
[ All ]
```

---

# 16. Assigned Work

A user should be able to see all work assigned to them.

Example:

```text
+------------------------------------------------+
| My Assigned Work                               |
+------------------------------------------------+
| PROJ-123 | Login API       | IN PROGRESS      |
| PROJ-128 | Auth UI         | TODO             |
| PROJ-141 | Logout Bug      | DONE             |
+------------------------------------------------+
```

This should be available from the chat/work experience.

---

# 17. Created Work

A user should also see work they created/assigned.

Example:

```text
Created by Me

PROJ-101 -> Rahul
PROJ-102 -> RK
PROJ-103 -> Amit
```

This allows an assigner to monitor work without opening every project manually.

---

# 18. Completed Work

The application should support:

```text
Completed by Me
```

so an individual can see tasks they completed.

Useful filters include:

- Project
- Status
- Issue type
- Priority
- Assignee
- Date

---

# 19. Activity Timeline

Every issue should have an activity history.

Example:

```text
PROJ-123

10:32 AM
Rahul assigned this issue to RK.

11:04 AM
RK changed status:
TODO -> IN PROGRESS

12:20 PM
RK added a comment.

2:45 PM
RK changed priority:
MEDIUM -> HIGH

5:10 PM
RK changed status:
IN PROGRESS -> DONE
```

Selected events can produce chat/notification events.

---

# 20. File Sharing Architecture

The chat file-sharing design follows a server-first temporary-storage model.

The application does not permanently store file content.

```text
Permanent
----------------------------
Chat messages
File metadata
Transfer metadata


Temporary
----------------------------
Actual file bytes
```

The application uses the existing 2 TB server filesystem.

External object storage such as S3/R2 is not required for V1.

---

# 21. File Sharing Lifecycle

```text
User A selects file
        |
        v
Create file message
        |
        v
Resumable chunked upload
        |
        v
Server temporary filesystem
        |
        v
File complete + SHA-256 verified
        |
        v
Ready to download
        |
        v
User B clicks Download
        |
        v
Resumable download to B's device
        |
        v
SHA-256 verification
        |
        v
B confirms completion
        |
        v
Delete server temporary file
```

The receiver does not need to manually accept a normal file transfer.

The file message appears automatically, but the **Download** action is user-controlled.

---

# 22. Receiver Online or Offline

The V1 file flow is identical whether the receiver is online or offline.

## Online

```text
A
 |
 | upload
 v
Server
 |
 | B downloads
 v
B
```

## Offline

```text
A
 |
 | upload
 v
Server
 |
 | B returns later
 v
B
```

This avoids switching between P2P and server transfer when a receiver disconnects during a transfer.

---

# 23. File Download UX

Before the server has the complete file:

```text
+----------------------------------+
| project.zip                      |
| 185 MB                           |
|                                  |
| Receiving file... 64%            |
| ████████████░░░░░░               |
+----------------------------------+
```

Once the server has a complete valid file:

```text
+----------------------------------+
| project.zip                      |
| 185 MB                           |
|                                  |
| Ready to download                |
|                                  |
| [ Download ] [ Forward ]         |
+----------------------------------+
```

Clicking Download saves the file to the user's device using the normal browser download flow.

---

# 24. Resumable Upload

Files should be uploaded in chunks.

Recommended initial chunk size:

```text
4 MB – 16 MB
```

Example:

```text
200 MB file

Chunk 0
Chunk 1
Chunk 2
...
Chunk N
```

The server tracks:

```text
uploadedBytes
```

If the connection fails at 90 MB:

```text
200 MB
█████████░░░░░░░
90 MB
```

the client resumes from the saved offset.

---

# 25. Resumable Download

If B has downloaded:

```text
120 MB / 200 MB
```

and disconnects, the server still has the complete temporary file.

The next request can use HTTP Range:

```http
Range: bytes=125829120-
```

Only the remaining portion is transferred.

This prevents restarting large downloads from zero.

---

# 26. File Integrity

Use SHA-256.

```text
Original file
     |
     v
SHA-256
     |
     v
Stored metadata

Receiver download
     |
     v
SHA-256
     |
     v
Compare
```

If the hashes match:

```text
VALID
```

Otherwise:

```text
INVALID -> retry/fail
```

---

# 27. Temporary Filesystem

Recommended structure:

```text
/data/
└── file-transfers/
    ├── tr_001/
    │   ├── file.part
    │   └── metadata.json
    ├── tr_002/
    │   ├── file.part
    │   └── metadata.json
    └── tr_003/
        ├── file.part
        └── metadata.json
```

Do not create one physical file per chunk.

Keep a single temporary file and track progress in the database.

---

# 28. File Size and Storage Controls

Expected file size is approximately 200 MB.

Use a configurable limit:

```env
MAX_FILE_SIZE_MB=250
TEMP_FILE_EXPIRY_DAYS=15
TEMP_STORAGE_LIMIT_GB=1500
CLEANUP_INTERVAL=24h
```

The temporary file system should not consume the entire 2 TB disk.

Reserve capacity for:

- Operating system
- Application
- Database
- Logs
- Backups
- Other services

---

# 29. File Expiration and Cleanup

Each temporary file gets:

```text
expiresAt = createdAt + 15 days
```

Successful download:

```text
Download complete
      |
      v
Client confirmation
      |
      v
DELETE immediately
```

Undownloaded file:

```text
15 days reached
      |
      v
Daily cleanup
      |
      v
DELETE
      |
      v
Mark EXPIRED
```

The cleanup process should also detect orphaned filesystem entries.

---

# 30. File Forwarding

Forwarding uses the same temporary delivery mechanism.

Example:

```text
A -> B
```

B forwards:

```text
B -> C
```

V1 flow:

```text
B Browser
    |
    | upload forwarded file
    v
Server temporary filesystem
    |
    | C downloads
    v
C Browser
```

Each delivery should have its own `transferId`.

A logical file can retain a reusable `fileId` where appropriate.

A future optimization can allow the server to reuse an existing temporary file when it is still valid instead of requiring another upload.

---

# 31. Security Model

Never expose raw server filesystem paths.

Use:

```text
GET /api/file-transfers/{transferId}/download
```

The backend validates:

- Authentication
- Authorization
- Receiver identity
- Transfer ownership
- Transfer state
- Expiration
- File existence

Temporary filesystem names should be unpredictable.

Never derive storage paths directly from user-provided filenames.

---

# 32. Core Backend Domains

The backend should be separated by domain.

```text
Identity / Auth
|
+-- Users
+-- Organizations
+-- Teams
+-- Roles

Chat
|
+-- Conversations
+-- Channels
+-- Messages
+-- Guest communication
+-- Files

Project Management
|
+-- Projects
+-- Issues
+-- Assignments
+-- Status
+-- Comments

Notification
|
+-- In-app
+-- Push
+-- Email

Activity / Events
|
+-- Issue events
+-- Chat events
+-- Audit events
```

This prevents a single large service from becoming responsible for the whole application.

---

# 33. Database Concept

Core entities:

```text
User
Organization
Team
TeamMembership

Conversation
ConversationMember
Message

GuestChatRequest

Project
ProjectMember
Issue
IssueAssignment
IssueComment
IssueActivity

Notification
DomainEvent

File
FileTransfer
```

The exact schema can evolve as implementation begins.

---

# 34. Important Relationship Rules

Keep these relationships independent:

```text
Chat relationship
        !=
Team membership
        !=
Project membership
```

Similarly:

```text
Jira issue state
        !=
Chat notification
```

Jira remains the source of truth for work state.

Chat surfaces the relevant communication and events.

---

# 35. Suggested API Areas

## Authentication

```text
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/logout
```

## Teams

```text
POST /api/teams
POST /api/teams/{teamId}/members
DELETE /api/teams/{teamId}/members/{userId}
```

## Chat

```text
GET  /api/conversations
POST /api/conversations
GET  /api/conversations/{conversationId}/messages
POST /api/conversations/{conversationId}/messages
```

## Guest requests

```text
POST /api/chat-requests
GET  /api/chat-requests
POST /api/chat-requests/{id}/accept
POST /api/chat-requests/{id}/decline
POST /api/chat-requests/{id}/block
```

## Jira

```text
POST /api/projects
POST /api/projects/{projectId}/issues
GET  /api/projects/{projectId}/issues
PATCH /api/issues/{issueId}
POST /api/issues/{issueId}/comments
```

## Files

```text
POST /api/file-transfers/initiate
GET  /api/file-transfers/{transferId}/status
PUT  /api/file-transfers/{transferId}/upload
POST /api/file-transfers/{transferId}/upload/complete
GET  /api/file-transfers/{transferId}/download
POST /api/file-transfers/{transferId}/download/complete
POST /api/file-transfers/{transferId}/cancel
```

---

# 36. WebSocket Events

Recommended event categories:

```text
CHAT_MESSAGE_CREATED
CHAT_MESSAGE_READ
GUEST_REQUEST_RECEIVED
GUEST_REQUEST_ACCEPTED

FILE_UPLOAD_PROGRESS
FILE_READY
FILE_DOWNLOAD_PROGRESS
FILE_TRANSFER_COMPLETED
FILE_TRANSFER_EXPIRED

ISSUE_ASSIGNED
ISSUE_STATUS_CHANGED
ISSUE_COMMENT_ADDED
ISSUE_MENTIONED

NOTIFICATION_CREATED
```

---

# 37. React Frontend Structure

A possible structure:

```text
src/
|
+-- features/
|   |
|   +-- auth/
|   +-- organization/
|   +-- teams/
|   |
|   +-- chat/
|   |   +-- components/
|   |   +-- conversations/
|   |   +-- channels/
|   |   +-- guestRequests/
|   |   +-- files/
|   |   +-- notifications/
|   |
|   +-- jira/
|       +-- projects/
|       +-- issues/
|       +-- assignments/
|       +-- comments/
|       +-- activity/
|
+-- services/
|   +-- api/
|   +-- websocket/
|   +-- notifications/
|
+-- shared/
|   +-- components/
|   +-- hooks/
|   +-- utils/
|   +-- types/
```

The frontend should keep Chat and Jira modules logically separate while sharing common authentication, notifications, events, and UI infrastructure.

---

# 38. Notification Architecture

A unified notification service receives domain events.

```text
                 Domain Event
                      |
                      v
             Notification Service
                      |
          +-----------+-----------+
          |           |           |
       In-app       Push        Email
          |
          v
       Chat UI
```

The notification service should decide:

- Recipient
- Notification type
- Priority
- Read/unread state
- Delivery channel
- Related entity

---

# 39. Work and Chat Navigation

A recommended main application layout:

```text
+-------------------------------------------------------------+
| Logo | Search | Notifications | User                       |
+------+------------------------------------------------------+
|      |                                                      |
| Chat |                  Main Content                        |
|      |                                                      |
| Home |                                                      |
| DMs  |                                                      |
| Teams|                                                      |
|      |                                                      |
| My   |                                                      |
| Work |                                                      |
|      |                                                      |
| Jira |                                                      |
|      |                                                      |
+------+------------------------------------------------------+
```

The exact UI can evolve, but Chat and Work should feel like two integrated areas of the same product.

---

# 40. User Work Dashboard

The user should have a consolidated work view.

```text
My Work

+------------------+------------------+------------------+
| Assigned         | In Progress      | Completed        |
| 8                | 4                | 21               |
+------------------+------------------+------------------+

Project: [All]
Status:  [All]
Type:    [All]
Priority:[All]
```

This is particularly useful because users do not need to search through multiple projects to understand their work.

---

# 41. Example End-to-End Assignment Flow

```text
Team Head / Assigner
        |
        | Assign PROJ-123 to RK
        v
      Jira
        |
        | IssueAssigned event
        v
   Event System
        |
        +------> Chat notification
        |
        +------> Notification service
        |
        +------> Activity history
```

RK receives:

```text
PROJ-123
Implement login API

Assigned by Rahul
[Open Ticket]
```

RK changes status:

```text
TODO -> IN PROGRESS
```

Then:

```text
Jira
  |
  | IssueStatusChanged
  v
Event System
  |
  +--> Rahul notification
  +--> Activity
```

---

# 42. Example External Chat Flow

```text
Guest A
   |
   | search/contact request
   v
User B
   |
   v
Message Request
   |
   +---- Accept ----> 1:1 chat
   |
   +---- Decline
   |
   +---- Block
```

After acceptance:

```text
Guest A <----------> User B
       1-to-1 chat
```

The guest still has no team/project access.

---

# 43. Application Architecture Map

```text
                           UNIFIED PLATFORM
                                  |
             +--------------------+--------------------+
             |                    |                    |
          IDENTITY              CHAT                 JIRA
             |                    |                    |
      +------+------+       +-----+------+       +-----+------+
      |      |      |       |     |      |       |     |      |
    Users  Teams  Roles    DMs  Teams  Guest   Projects Issues Work
                                Channels Chat          |
                                      |                |
                                      +-------+--------+
                                              |
                                         Domain Events
                                              |
                                  +-----------+-----------+
                                  |           |           |
                                Chat    Notifications  Activity
                                  |
                                  v
                             User devices
```

---

# 44. Implementation Roadmap

## Phase 1 — Identity and organization

Implement:

- Authentication
- Users
- Organization
- Super Admin
- Team Heads
- Teams
- Team membership
- Roles and permissions

## Phase 2 — Core Chat

Implement:

- Direct messages
- Group conversations
- Team channels
- Message history
- Read state
- WebSocket messaging
- Notifications

## Phase 3 — Guest Chat

Implement:

- External user search
- Chat request
- Accept
- Decline
- Block
- External 1-to-1 conversations
- Access restrictions

## Phase 4 — File Sharing

Implement:

- Temporary filesystem
- Chunked upload
- Resumable upload
- File metadata
- SHA-256
- Ready state
- Resumable download
- Completion confirmation
- Immediate deletion
- 15-day expiry
- Daily cleanup

## Phase 5 — Jira Core

Implement:

- Projects
- Issues
- Issue types
- Assignees
- Status
- Priority
- Comments
- Activity

## Phase 6 — Chat/Jira Integration

Implement:

- Assignment events
- Status-change events
- Comment events
- Mention events
- Chat notifications
- Open-ticket actions
- My Work
- Created Work
- Completed Work

## Phase 7 — Unified Notification System

Implement:

- In-app notifications
- Push/desktop notification capability
- Notification preferences
- Read/unread state
- Event routing

## Phase 8 — Reports and Advanced Workflows

Add:

- Project dashboards
- Team reports
- Individual work reports
- Activity analytics
- Advanced filtering
- Search
- Automation

## Phase 9 — Electron

After the web application is stable:

- Electron shell
- Desktop notifications
- Native file handling
- Native integrations
- Optional advanced local storage

---

# 45. Important Architectural Principles

## Principle 1 — Jira is the source of truth for work

Chat displays work-related events but does not maintain a second independent issue state.

## Principle 2 — Messages are permanent

Chat history remains available according to application retention policy.

## Principle 3 — File bytes are temporary

Actual files are removed after successful delivery or expiration.

## Principle 4 — Membership is explicit

Chat acceptance does not automatically grant team/project access.

## Principle 5 — Events connect domains

Jira and Chat communicate through domain events rather than tight direct coupling.

## Principle 6 — Notifications are centralized

All important user-facing events pass through a common notification system.

## Principle 7 — Transfers are resumable

Network interruptions should not require users to restart large uploads/downloads.

## Principle 8 — V1 prioritizes reliability

Server-backed temporary file delivery is preferred over P2P complexity for V1. WebRTC/P2P can be introduced later as an optimization.

---

# 46. Final Overall Scope

The application is a unified **communication + work-management platform**.

Its primary scope is:

```text
                    UNIFIED COLLABORATION
                           PLATFORM
                              |
              +---------------+---------------+
              |                               |
            CHAT                             JIRA
              |                               |
       Communication                    Work Management
              |                               |
      +-------+-------+              +--------+--------+
      |       |       |              |        |        |
     DMs    Teams   Guest         Projects Issues   Reports
      |       |       |              |        |
      +-------+-------+              +--------+
              |                               |
              +---------------+---------------+
                              |
                       Events & Notifications
```

The platform should let a user:

- Communicate with teammates
- Communicate with external users through controlled 1-to-1 chat
- Participate in team channels
- Share files
- Receive notifications
- See assigned work
- Create and manage projects
- Create tickets/stories/tasks
- Receive assignment notifications in chat
- Receive ticket status updates in chat
- Open Jira work directly from notifications
- Filter assigned/created/completed work by project and other criteria
- Track activity and progress from one application

---

# 47. Final Purpose of the Application

The purpose of the application is to reduce the separation between **communication and execution**.

Traditional collaboration often requires users to move between:

```text
Slack
   +
Jira
   +
Email
   +
Notification systems
```

This platform brings those workflows together.

The intended experience is:

```text
Someone assigns work
       |
       v
You receive a chat notification
       |
       v
You open the ticket
       |
       v
You work on it
       |
       v
You change its status
       |
       v
The assigner is notified
       |
       v
The activity is recorded
```

Communication, work management, notifications, and activity history therefore become parts of one connected workflow.

---

# 48. Final Product Principle

> **Build one collaboration platform where people communicate, manage work, receive updates, and track progress without constantly switching between separate tools.**

The first version is a web application.

The architecture should remain modular enough to support a future Electron application without redesigning the core domains.

The two major product pillars are:

```text
CHAT
Communication
Teams
Channels
DMs
Guest Requests
Files
Notifications


JIRA
Projects
Issues
Assignments
Statuses
Comments
Activity
Reports
```

They are connected through:

```text
DOMAIN EVENTS
      +
NOTIFICATIONS
      +
SHARED IDENTITY
      +
SHARED PERMISSIONS
```

This is the foundation for a broader collaboration platform that can later add automation, analytics, integrations, desktop capabilities, and additional productivity features.
