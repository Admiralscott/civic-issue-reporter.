# CivicTrack — Civic Issue Reporting & Resolution Platform

CivicTrack is a web-based civic issue reporting platform that connects citizens with government/department teams through a structured, location-aware and real-time workflow.

Citizens can submit civic issues with descriptions, categories, photos and location information. Department users can process reports, update their status and provide resolution information. Administrators have separate overview, department-management and analytics areas.

> **Project status:** Academic/working project. The repository contains the implemented web application and a separate AI/ML service prototype. The FastAPI service exposes image classification and AI chat-intake endpoints. Automatic image-classification integration into the citizen form should only be considered complete where it is enabled in the deployed build.

---

## 1. Problem Statement

Civic complaints are commonly received through fragmented channels such as phone calls, messages, social media and in-person visits. This can make it difficult to capture complete issue information, identify exact locations, route complaints to the correct department, track progress and communicate updates.

CivicTrack addresses this by providing a centralized digital workflow:

\`\`\`
Citizen
   ↓
Issue Report + Photo + Location
   ↓
Central Database / PostGIS
   ↓
Department Queue
   ↓
Status Updates + Resolution Evidence
   ↓
Citizen Tracking
   ↓
Realtime Updates + Admin Analytics
\`\`\`

---

## 2. Main Features

### Citizen Portal

- Account registration and sign-in using Supabase Auth
- Civic issue reporting
- Title and description capture
- Issue category selection
- Photo/evidence upload
- Location selection through an interactive map/location picker
- My Reports view
- Report status tracking
- Map-based civic report view
- Upvote/report engagement functionality
- Notifications

### Department Portal

- Department-specific report queue
- Report processing
- Priority-oriented report handling
- Status updates
- Status/history records
- Notes and resolution information
- Resolution/proof photo support where implemented
- Realtime refresh of relevant report information

### Admin Portal

- Report overview
- Department management
- Analytics
- Role-aware administrative access

---

## 3. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React 18 |
| Language | TypeScript |
| UI | Tailwind CSS |
| PWA | @ducanh2912/next-pwa |
| Forms | React Hook Form + Zod |
| Backend/BaaS | Supabase |
| Authentication | Supabase Auth |
| Database | PostgreSQL |
| Geospatial | PostGIS |
| Storage | Supabase Storage |
| Realtime | Supabase Realtime |
| Maps | Leaflet |
| Map data | OpenStreetMap |
| Geocoding | Nominatim |
| Charts | Recharts |
| Icons | Lucide React |
| AI API | FastAPI |
| Image ML | PyTorch + Torchvision |
| Image model | ResNet18 |
| AI chat | Anthropic Claude |
| Deployment workflow | GitHub + Vercel |

The frontend dependencies and versions are defined in \`package.json\`.

---

## 4. System Architecture

\`\`\`
                         CIVICTRACK
                              |
        +---------------------+---------------------+
        |                     |                     |
  Citizen Portal       Department Portal      Admin Portal
        |                     |                     |
        +---------------------+---------------------+
                              |
                       Supabase Platform
                              |
       +----------------------+----------------------+
       |                      |                      |
  Supabase Auth       PostgreSQL / PostGIS       Storage
                              |
                         Realtime Events
                              |
                  Reports / Status / Notifications
                              |
                       FastAPI ML Service
                         /             \\
                  /classify           /chat
                      |                  |
                 ResNet18          Claude Intake
\`\`\`

The Next.js application separates the major application surfaces into:

- \`app/(citizen)\` — citizen-facing pages
- \`app/(department)\` — department workflow
- \`app/(admin)\` — administrative pages

Middleware is used for surface/role-aware routing.

---

## 5. Core Reporting Workflow

### Step 1 — Authentication
The citizen signs in through Supabase Auth.

### Step 2 — Capture the Issue
The citizen enters a title and description, selects a category, attaches evidence and selects the issue location.

### Step 3 — Store the Report
Report data is stored in PostgreSQL through Supabase. Spatial information is supported with PostGIS, and uploaded files use storage.

### Step 4 — Department Processing
Reports are made available to the appropriate department workflow/queue.

### Step 5 — Status Management
Department users can process reports and update their status. Status history records provide a timeline of changes.

### Step 6 — Resolution
Resolution notes and proof information can be attached as part of the department workflow.

### Step 7 — Citizen Tracking
Citizens can view their submitted reports and follow their current status.

### Step 8 — Realtime Synchronization
Supabase Realtime is used for relevant report, status-history and notification changes.

### Step 9 — Administration
Administrators can access overview, department-management and analytics surfaces.

---

## 6. Geospatial Features

CivicTrack is location-aware.

- **Leaflet** provides interactive maps.
- **OpenStreetMap** provides map data.
- **Nominatim** supports geocoding/search.
- **PostGIS** provides spatial database capabilities.
- The repository contains a location picker and citizen map components.

This allows reports to be associated with geographic information and viewed spatially.

---

## 7. Realtime Features

Supabase Realtime is used with PostgreSQL change events.

The application uses realtime functionality around:

- \`reports\`
- \`status_history\`
- \`notifications\`

Citizen and department components subscribe to relevant changes so that report information can propagate to the UI without requiring a complete manual page reload.

---

## 8. AI / ML Service

The AI service is located in:

\`fastapi-service/\`

### Image Classification

Endpoint:

\`POST /classify\`

Technology:

- FastAPI
- PyTorch
- Torchvision
- ResNet18
- Pillow

The classifier returns:

- predicted category;
- human-readable label;
- confidence score; and
- scores for all configured categories.

Supported categories:

- \`road_damage\` — Road / Pothole Damage
- \`water_leak\` — Water Leak / Flooding
- \`electrical\` — Electrical Issue
- \`garbage\` — Garbage / Illegal Dumping
- \`graffiti\` — Graffiti / Vandalism
- \`noise\` — Noise Complaint
- \`emergency\` — Emergency
- \`other\` — Other

The classifier loads \`civic_classifier.pth\` when the trained weights file is available.

### AI Chat Intake

Endpoint:

\`POST /chat\`

The service uses the Anthropic API with Claude to help citizens describe local issues. When enough information is available, the service can return a suggested report structure containing:

- title;
- description; and
- category.

### Health Check

Endpoint:

\`GET /health\`

Returns the service health/status response.

---

## 9. Authentication and Security

The project uses:

- Supabase Authentication;
- PostgreSQL Row Level Security (RLS);
- role-aware middleware/routing;
- department-aware database access;
- controlled database function privileges; and
- environment variables for secrets.

Important deployment rules:

1. Never expose \`SUPABASE_SERVICE_ROLE_KEY\` to the browser.
2. Never commit real API keys or secrets.
3. Review RLS policies whenever tables/workflows change.
4. Restrict database functions to the roles that require them.
5. Validate uploaded file type and size in production.
6. Configure FastAPI CORS for the actual production origins.
7. Treat AI classifications and AI-generated report suggestions as assistance, not authoritative decisions.
8. Avoid exposing unnecessary citizen personal information through public queries.

---

## 10. Database Concepts

The application works with core entities including:

- \`users\` — application users, roles and department associations
- \`departments\` — government/organizational departments
- \`reports\` — civic issue reports
- \`report_upvotes\` — report engagement/upvote records
- \`status_history\` — report status-change history
- \`notifications\` — user notifications

PostGIS provides spatial database support for location-aware functionality.

---

## 11. Project Structure

\`\`\`
civic-issue-reporter/
│
├── app/
│   ├── (citizen)/
│   │   ├── map/
│   │   ├── my-reports/
│   │   └── report/
│   │
│   ├── (department)/
│   │   ├── queue/
│   │   └── reports/
│   │
│   └── (admin)/
│       ├── analytics/
│       ├── departments/
│       └── overview/
│
├── components/
│   ├── citizen/
│   │   ├── LocationPickerModal.tsx
│   │   ├── MapView.tsx
│   │   ├── MyReportsList.tsx
│   │   ├── NotificationBell.tsx
│   │   ├── NotificationDrawer.tsx
│   │   ├── ReportCard.tsx
│   │   └── ReportForm.tsx
│   │
│   └── department/
│       ├── ReportQueue.tsx
│       └── StatusUpdateModal.tsx
│
├── fastapi-service/
│   ├── main.py
│   ├── models/
│   │   └── classifier.py
│   └── requirements.txt
│
├── lib/
├── public/
├── middleware.ts
├── next.config.mjs
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── .env.local.example
\`\`\`

---

## 12. Getting Started

### Prerequisites

Install:

- Node.js
- npm
- Python 3.x for the FastAPI service
- A Supabase project

### Frontend

\`\`\`bash
git clone https://github.com/Admiralscott/civic-issue-reporter..git
cd civic-issue-reporter.
npm install
\`\`\`

Create your local environment file from \`.env.local.example\`.

Example:

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

ANTHROPIC_API_KEY=your-anthropic-key-here
FASTAPI_URL=http://localhost:8000
\`\`\`

Run the Next.js application:

\`\`\`bash
npm run dev
\`\`\`

The repository also provides separate development commands:

\`\`\`bash
npm run dev:citizen
npm run dev:admin
\`\`\`

Build and run production:

\`\`\`bash
npm run build
npm start
\`\`\`

---

## 13. Running the FastAPI Service

\`\`\`bash
cd fastapi-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
\`\`\`

Available endpoints:

\`\`\`
GET  /health
POST /classify
POST /chat
\`\`\`

---

## 14. API Examples

### Health

\`\`\`http
GET /health
\`\`\`

Example:

\`\`\`json
{
  "status": "ok",
  "version": "1.0.0"
}
\`\`\`

### Image Classification

\`\`\`http
POST /classify
Content-Type: multipart/form-data
\`\`\`

Upload an image using the \`file\` form field.

Response structure:

\`\`\`json
{
  "category": "road_damage",
  "label": "Road / Pothole Damage",
  "confidence": 91.2,
  "all_scores": {
    "road_damage": 91.2
  }
}
\`\`\`

Actual scores depend on the image and model prediction.

### Chat Intake

\`\`\`http
POST /chat
Content-Type: application/json
\`\`\`

Example request:

\`\`\`json
{
  "message": "There is a large pothole near the main road.",
  "conversation_history": []
}
\`\`\`

The service returns a conversational reply and may include a suggested report object.

---

## 15. Deployment Architecture

A typical deployment is:

\`\`\`
GitHub
  ↓
Vercel
  ↓
Next.js Application
  ↓
Supabase
  ├── Auth
  ├── PostgreSQL
  ├── PostGIS
  ├── Storage
  └── Realtime

FastAPI ML Service
  ├── /classify
  └── /chat
\`\`\`

The Next.js application can be deployed through GitHub-to-Vercel workflows. The Python FastAPI service requires a Python-compatible hosting environment if deployed separately.

---

## 16. Design Goals

### Accessibility
Provide a simple digital way for citizens to report local problems.

### Transparency
Allow citizens to follow the progress of submitted reports.

### Accountability
Create a structured workflow and status history for department processing.

### Location Awareness
Use geographic information to understand where issues occur.

### Realtime Communication
Propagate relevant report and status changes to connected interfaces.

### Data-Driven Administration
Provide structured civic data for monitoring and analytics.

### AI Assistance
Use image ML and conversational AI to assist with report intake and classification.

---

## 17. Future Enhancements

Possible future improvements include:

- full automatic image-classification integration in the citizen report form;
- larger and more representative civic-image training datasets;
- duplicate-report detection;
- geospatial clustering and civic issue hotspot analysis;
- multilingual citizen reporting;
- SMS/WhatsApp notification integration;
- advanced SLA monitoring;
- richer administrative analytics;
- stronger production-grade upload validation;
- AI confidence thresholds and human review workflows;
- automated unit/integration testing; and
- CI/CD quality checks.

---

## 18. Academic Project Summary

**Project Title:** CivicTrack — AI-Assisted Civic Issue Reporting & Resolution Platform

**Domain:** Smart City / E-Governance / Web Application / AI / GIS

**Objective:**  
To provide a centralized platform where citizens can report civic issues with structured descriptions, evidence and location data, while department users can process, update and resolve those reports through a role-based workflow.

**Core workflow:**

\`\`\`
Authenticate
    ↓
Report Civic Issue
    ↓
Category + Description + Photo + Location
    ↓
Supabase / PostgreSQL / PostGIS
    ↓
Department Queue
    ↓
Process + Update Status
    ↓
Resolution / Proof
    ↓
Realtime Synchronization
    ↓
Citizen Tracking + Admin Analytics
\`\`\`

**Key technologies:** Next.js, React, TypeScript, Tailwind CSS, Supabase, PostgreSQL, PostGIS, Leaflet, OpenStreetMap, Nominatim, FastAPI, PyTorch, Torchvision, ResNet18 and Anthropic Claude.

---

## 19. Repository

GitHub repository:

**Admiralscott/civic-issue-reporter.**

The repository contains the CivicTrack source code, frontend application, citizen/department/admin surfaces and FastAPI AI/ML service.

## License

No explicit open-source license is currently declared in this repository. Add a license file if you intend to distribute the project under specific reuse terms.
