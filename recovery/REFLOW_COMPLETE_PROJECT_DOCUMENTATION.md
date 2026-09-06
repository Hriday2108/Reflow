# 1. PROJECT IDENTITY

### One-line description
An intelligent, proactive travel disruption recovery engine that parses itineraries, maps dependencies, and automatically generates recovery options using graph-based logic and AI.

### Short description
Reflow is a Next.js web application designed to help travelers and travel agents manage travel disruptions. It allows users to upload PDF or text itineraries, which are parsed by Google Gemini AI into a structured booking graph. The system monitors these bookings, computes ripple effects of delays or cancellations across downstream dependencies, and visualizes alternative recovery paths.

### Detailed description
Reflow solves the chaotic experience of travel disruptions (e.g., a delayed flight causing a missed train and a forfeited hotel night). Users upload their travel documents, and the system uses AI to extract all bookings (flights, trains, hotels, activities) and establishes chronological and logical dependencies between them (e.g., Flight A must arrive before Train B departs). 

When a disruption occurs (simulated via the UI), the `disruption-engine` performs a recursive graph walk to determine which subsequent bookings are "At Risk" or "Disrupted." It then automatically generates context-aware recovery options (e.g., "Rebook on a later train," "Cancel hotel for a partial refund"). The frontend utilizes interactive data visualization (React Flow, Recharts) to provide a clear, real-time picture of the itinerary's health and available recovery strategies.

---

# 2. COMPLETE PROJECT OVERVIEW

**What exactly is Reflow?**
It is a comprehensive dashboard and backend engine for managing complex travel itineraries and their failure points.

**What problem does it solve?**
When one leg of a trip fails, travelers often don't realize the cascading impact on the rest of their trip. Reflow calculates this "ripple effect" instantly and offers solutions.

**Who uses it?**
Travelers managing multi-leg trips or travel agents managing client itineraries.

**Why would someone use it?**
To gain peace of mind, proactively monitor risks (tight connections), and quickly recover from unexpected delays without manually calling airlines or hotels.

**What does the user do?**
The user uploads a PDF or text itinerary. They view their dashboard, simulate disruptions (like a 3-hour flight delay or a weather event), and review the calculated impact and recovery options.

**What does the system do internally?**
1. **Ingestion**: Parses text/PDF using `pdf-parse` and Google Gemini AI to create a structured JSON schema.
2. **Storage**: Saves bookings and dependencies to MongoDB.
3. **Graph Processing**: Uses a recursive algorithm to traverse booking dependencies, updating status flags (`confirmed`, `at-risk`, `disrupted`) based on time constraints and disruption severities.
4. **Recovery Generation**: Applies heuristic logic to propose alternatives (rebook, refund, wait).

**What does the user receive as output?**
An interactive visual dashboard showing their timeline, risk metrics, an interactive flow chart of their trip, and actionable recovery buttons.

**What are the major modules?**
- **AI Parser**: Ingests raw text/PDFs into structured data.
- **Disruption Engine**: The core graph-based logic algorithm.
- **Dashboard UI**: Views for Recovery, Risk Monitoring, Timeline, and Data Flow.

---

# 3. COMPLETE FEATURE INVENTORY

| Feature | Description | User Interaction | Technical Implementation | Files Involved | Status |
| ------- | ----------- | ---------------- | ------------------------ | -------------- | ------ |
| **Itinerary Upload** | Upload PDF or paste text to create a trip. | Form with file input or textarea. | Reads file buffer via `pdf-parse`, sends text to Gemini AI via `@google/genai` to return JSON conforming to Mongoose schema. | `page.tsx`, `api/parse-itinerary/route.ts` | Fully Implemented |
| **Dashboard** | Main overview of trip metrics. | View active stats. | Fetches from API routes, aggregates cost and risk counts. | `dashboard-view.tsx` | Fully Implemented |
| **Disruption Simulator** | Inject artificial delays/cancellations. | Click buttons to trigger events (e.g., Flight Delay). | Updates local state, passing the disruption to the engine to recalculate graph. | `disruption-simulator.tsx` | Fully Implemented |
| **Risk Monitor** | Displays upcoming tight connections/risks. | View warnings. | Engine evaluates time deltas between dependent nodes (e.g., < 2 hours = high risk). | `risk-monitor-view.tsx` | Fully Implemented |
| **Dependency Graph** | Visualizes trip nodes and edges. | Pan/zoom nodes. | Uses `@xyflow/react` to map Mongoose documents to nodes and edges. | `network-view.tsx` | Fully Implemented |
| **Timeline View** | Chronological view of bookings. | Scroll vertically. | Sorts bookings by `startTime` and renders a timeline UI. | `itinerary-view.tsx` | Fully Implemented |
| **Recovery Options** | Suggests alternative actions. | Click "Accept" on an option. | Engine maps disruption type (delay/cancel) and booking type (flight/hotel) to heuristic solutions. | `recovery-view.tsx`, `disruption-engine.ts` | Fully Implemented |
| **Currency Formatting** | Displays all costs in INR (₹). | View UI. | Custom utility `formatCurrency` applying exchange rates. | `utils.ts` | Fully Implemented |
| **Weather API** | Fetches live weather for destination. | N/A (Currently disabled) | API route proxying OpenWeatherMap data. | `weather/provider.ts`, `api/weather/route.ts` | Partially Implemented (Hidden in UI) |

---

# 4. COMPLETE USER JOURNEY

```text
User opens Application (Root page)
↓
User uploads a PDF itinerary and clicks "Parse"
↓
Frontend sends FormData to `/api/parse-itinerary`
↓
Backend extracts text via `pdf-parse`
↓
Backend prompts Google Gemini AI with schema requirements
↓
Gemini returns structured JSON
↓
Backend saves to MongoDB (Trips, Bookings, Dependencies)
↓
Frontend redirects to `/dashboard`
↓
Dashboard fetches all data via `useEffect` hooks calling `/api/*`
↓
User views Timeline and Risk Monitor
↓
User opens "Disruption Simulator" and selects "3 Hour Flight Delay"
↓
Frontend passes disruption to `disruption-engine.ts` (Client-side execution)
↓
Engine recursively walks the dependency graph, marking downstream bookings as "at-risk"
↓
Engine generates Recovery Options
↓
UI updates immediately to show red/yellow alerts and recovery strategies
↓
User clicks "Accept" on a recovery option (Mocked resolution)
```

---

# 5. SYSTEM ARCHITECTURE

```text
                    ┌─────────────────────────┐
                    │      User Browser       │
                    │  (React 19 / Next.js)   │
                    └──────┬───────────┬──────┘
                           │           │
                 (UI State)│           │ (API Requests)
                           │           ↓
                    ┌──────┴───────────┴──────┐
                    │      Next.js Server     │
                    │      (App Router)       │
                    └──────┬───────────┬──────┘
                           │           │
                 (AI Prompt)│           │ (Mongoose Queries)
                           ↓           ↓
                 ┌─────────┴─┐   ┌─────┴──────────┐
                 │ Google    │   │ MongoDB        │
                 │ Gemini AI │   │ (Local/Atlas)  │
                 └───────────┘   └────────────────┘
```

- **Frontend**: Next.js App Router (Client Components heavily used for interactivity), Tailwind CSS for styling, React Flow for diagramming.
- **Backend**: Next.js API Routes acting as a REST API.
- **Database**: MongoDB with Mongoose ORM.
- **AI**: `@google/genai` SDK used exclusively in the backend parsing route.

---

# 6. COMPLETE FOLDER STRUCTURE

```text
Reflow/
├── .env.local                  # Environment variables
├── package.json                # Dependencies and scripts
├── src/
│   ├── app/
│   │   ├── api/                # Backend API Routes
│   │   │   ├── bookings/
│   │   │   ├── dependencies/
│   │   │   ├── disruptions/
│   │   │   ├── parse-itinerary/# AI Ingestion endpoint
│   │   │   ├── recovery-options/
│   │   │   ├── trips/
│   │   │   └── weather/        # Weather proxy endpoint
│   │   ├── dashboard/          # Dashboard page
│   │   ├── globals.css         # Global Tailwind styles & theme variables
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Landing/Upload page
│   ├── components/             # React UI Components
│   │   ├── views/              # Complex dashboard views (Timeline, Risk, etc)
│   │   └── ...                 # Reusable components (Radar, Simulator, etc)
│   ├── lib/                    # Core logic and utilities
│   │   ├── db.ts               # MongoDB connection
│   │   ├── disruption-engine.ts# Core graph resolution algorithm
│   │   ├── queries.ts          # Mongoose fetch wrappers
│   │   ├── utils.ts            # Formatting utilities
│   │   └── weather/            # Weather API service
│   ├── models/                 # Mongoose Database Schemas
│   │   └── index.ts
│   └── types/                  # TypeScript interface definitions
│       └── index.ts
└── tailwind.config.js          # Tailwind v4 config (Not present, using @tailwindcss/postcss)
```

---

# 7. FILE-BY-FILE DOCUMENTATION

| File Path | File Type | Purpose | Important Functions/Classes | Dependencies | Used By |
| --------- | --------- | ------- | --------------------------- | ------------ | ------- |
| `src/app/api/parse-itinerary/route.ts` | Backend Route | Core ingestion engine. Receives PDF/Text, parses, calls Gemini, and writes to MongoDB. | `POST` | `pdf-parse`, `@google/genai`, `mongoose` | Landing Page Upload |
| `src/lib/disruption-engine.ts` | Core Logic | The "brain" of the application. Calculates ripple effects across a graph of bookings. | `calculateRippleEffects`, `computeRiskWarnings`, `generateRecoveryOptions` | None (Pure TS) | Client-side views |
| `src/lib/db.ts` | Utility | Establishes cached connection to MongoDB to prevent hot-reload connection leaks. | `connectToDatabase` | `mongoose` | All API routes |
| `src/models/index.ts` | DB Schema | Defines the schema structure for `Trip`, `Booking`, `BookingDependency`, and `Disruption`. | Mongoose schemas | `mongoose` | API routes |
| `src/app/globals.css` | Styles | Defines root CSS variables (cream/terracotta theme), custom animations, and layout resets. | None | Entire app |
| `src/lib/utils.ts` | Utility | Tailwind merge wrapper and `formatCurrency` (INR formatting). | `cn`, `formatCurrency` | `clsx`, `tailwind-merge` | UI Components |
| `src/app/page.tsx` | Frontend | Landing page with Hero section and File/Text upload form. | `Home` | React, Framer Motion | User |
| `src/app/dashboard/page.tsx` | Frontend | Main application shell. Fetches data and holds state for all sub-views. | `Dashboard` | API routes | User |

---

# 8. FRONTEND — COMPLETE DOCUMENTATION

- **Framework**: Next.js 16.3 (App Router)
- **Language**: TypeScript
- **State Management**: React `useState`, `useMemo`, `useEffect`
- **Styling**: Tailwind CSS v4, custom theme variables in `globals.css`
- **Animation**: `framer-motion`
- **Data Visualization**: `recharts` (charts), `@xyflow/react` (node graphs)
- **Icons**: `lucide-react`

## FRONTEND PAGE INVENTORY

| Page | Route | Purpose | Components | API Calls | User Actions |
| ---- | ----- | ------- | ---------- | --------- | ------------ |
| **Landing** | `/` | Introduction and itinerary ingestion. | Hero, Upload Form, Legend | `POST /api/parse-itinerary` | Upload PDF, paste text. |
| **Dashboard** | `/dashboard` | Main app interface, tab navigation. | Sidebar, Views, Simulator | `GET` on all entity APIs | Switch tabs, trigger disruptions. |

## FRONTEND COMPONENT INVENTORY

| Component | File | Purpose | Props/Input | State | API/Logic |
| --------- | ---- | ------- | ----------- | ----- | --------- |
| **DisruptionSimulator** | `disruption-simulator.tsx` | Allows user to inject fake delays. | `bookings`, `onDisrupt` | `isOpen`, `selectedEvent` | Calls callback to update parent state. |
| **NetworkView** | `views/network-view.tsx` | Interactive flowchart of bookings. | `bookings`, `dependencies` | `nodes`, `edges` | Uses `xyflow` to map relationships. |
| **RecoveryView** | `views/recovery-view.tsx` | Shows solutions for disrupted bookings. | `options`, `bookings` | `activeTab` | Renders output from Disruption Engine. |
| **RiskMonitorView** | `views/risk-monitor-view.tsx` | Shows proactive warnings. | `bookings`, `deps` | `selectedRisk` | Calls `computeRiskWarnings`. |

---

# 9. BACKEND — COMPLETE DOCUMENTATION

- **Framework**: Next.js Route Handlers (`app/api/*`)
- **Database**: MongoDB (via Mongoose)
- **Architecture**: REST-like endpoints serving JSON. The backend is relatively thin, primarily serving as a CRUD layer over MongoDB and a proxy for the Gemini AI parsing logic. Most heavy lifting (graph processing) is pushed to the client (`disruption-engine.ts`) for immediate UI responsiveness.

---

# 10. COMPLETE API DOCUMENTATION

| Method | Endpoint | Purpose | Authentication | Request | Response | File |
| ------ | -------- | ------- | -------------- | ------- | -------- | ---- |
| `POST` | `/api/parse-itinerary` | AI ingestion of itinerary documents. | None | `FormData` (file or text) | `{ tripId }` | `api/parse-itinerary/route.ts` |
| `GET` | `/api/bookings` | Fetch bookings for a trip. | None | `?tripId=123` | `Booking[]` | `api/bookings/route.ts` |
| `GET` | `/api/dependencies` | Fetch graph edges. | None | `?tripId=123` | `Dependency[]` | `api/dependencies/route.ts` |
| `GET` | `/api/weather` | Fetch weather for a city. | None | `?location=Rome` | `{ temp, description... }` | `api/weather/route.ts` |

### Endpoint: `/api/parse-itinerary`
- **Purpose**: The most complex endpoint. Receives raw text or a PDF blob.
- **Processing**: If PDF, uses `pdf-parse` to extract text buffer. Connects to `GoogleGenerativeAI` using `GEMINI_API_KEY`.
- **AI Integration**: Uses a massive system prompt demanding strict JSON conforming to the Mongoose schema (arrays of bookings, dependencies, trips).
- **Database operations**: Parses the AI JSON, creates a `Trip`, inserts `Bookings`, resolves internal ID mapping, inserts `Dependencies`.
- **Error Cases**: Returns 400 on empty input, 500 on Gemini hallucination/JSON parse failure.

---

# 11. EXTERNAL API & THIRD-PARTY SERVICES

| Service | Purpose | SDK/Library | Endpoint | Authentication | Used In | Status |
| ------- | ------- | ----------- | -------- | -------------- | ------- | ------ |
| **Google Gemini AI** | NLP Parsing of raw itineraries into JSON. | `@google/genai` | `gemini-2.5-flash` | `GEMINI_API_KEY` | `/api/parse-itinerary` | Fully Implemented |
| **OpenWeatherMap** | Live weather data for destination risk assessment. | Native `fetch` | `api.openweathermap.org` | `WEATHER_API_KEY` | `weather/provider.ts` | Implemented (UI Hidden) |

---

# 12. DATABASE DOCUMENTATION

- **Database**: MongoDB
- **ORM**: Mongoose v9.9
- **Connection**: Managed via singleton pattern in `src/lib/db.ts` to prevent hot-reload exhaustion (`MONGODB_URI`).

### Database Schema

```text
Trip
 │ (1:N)
 ├──> Booking
 │     (Contains type, location, startTime, endTime, cost, status)
 │
 └──> BookingDependency
       (Contains sourceId, targetId, type: 'tight-connection'|'hard-requirement')
```

---

# 13. AI / ML / INTELLIGENT SYSTEM DOCUMENTATION

- **Provider**: Google DeepMind (Gemini)
- **Model**: `gemini-2.5-flash`
- **Usage**: Extraction and structuring. The AI does NOT calculate disruptions; it merely translates unstructured human text (emails, PDFs) into a strict relational database format.
- **Prompting Strategy**: One-shot structured output. The prompt explicitly defines the TypeScript interfaces and requires output in a ` ```json ` block. It is instructed to infer logical dependencies (e.g., a hotel check-in depends on the flight landing).
- **Fallback**: If the model hallucinates non-JSON, standard `JSON.parse` will throw and return a 500 error to the client.

---

# 14. BUSINESS LOGIC

**The Disruption Engine (`src/lib/disruption-engine.ts`)**
- **Condition**: A booking is disrupted manually by the user.
- **Ripple Effect (Recursive Walk)**:
  1. Find all `BookingDependency` where `sourceId === disruptedBooking._id`.
  2. Evaluate the downstream booking.
  3. If downstream `startTime` < `disrupted.endTime` + `buffer`, mark downstream as `disrupted`.
  4. If downstream `startTime` is close, mark as `at-risk`.
  5. Recursively process newly disrupted nodes.
- **Recovery Heuristics**: Generates predefined options based on booking type. E.g., if a flight is disrupted, propose "Rebook next available." If a hotel is disrupted, propose "Late check-in notification."

---

# 15. DATA FLOW

```text
Upload PDF 
↓
Backend extracts text 
↓
Gemini AI structures JSON 
↓
MongoDB stores records
↓
Dashboard requests GET /api/bookings 
↓
Client-side state hydration
↓
User injects Disruption 
↓
Client-side Engine traverses graph
↓
React components re-render with new colors (Red/Yellow/Green)
```

---

# 16. AUTHENTICATION & AUTHORIZATION

**Status**: Not Implemented / Placeholder.
- There is no login, signup, or JWT handling.
- The system assumes a single-tenant or open architecture for demonstration purposes.

---

# 17. SECURITY ANALYSIS

### Implemented Security
- **API Key Masking**: `WEATHER_API_KEY` and `GEMINI_API_KEY` are kept strictly in `.env.local` and executed only on the server environment. Frontend uses proxy API routes to prevent exposing secrets.

### Potential Security Improvements
- Add authentication (NextAuth/Clerk) to isolate trips per user.
- Add input sanitization to the `/api/parse-itinerary` text payload.
- Implement rate limiting on the heavy Gemini AI route.

---

# 18. CONFIGURATION & ENVIRONMENT VARIABLES

| Variable | Purpose | Required | Service | Sensitive? |
| -------- | ------- | -------- | ------- | ---------- |
| `MONGODB_URI` | Database connection string. | Yes | MongoDB | Yes |
| `GEMINI_API_KEY` | Authentication for AI parsing. | Yes | Google AI | Yes |
| `WEATHER_API_KEY` | Authentication for weather data. | No | OpenWeatherMap| Yes |

---

# 19. DEPENDENCIES

| Dependency | Version | Purpose | Actually Used? |
| ---------- | ------- | ------- | -------------- |
| `next` | 16.3.4 | Core framework | Yes |
| `@google/genai` | ^2.21.0 | Gemini API client | Yes |
| `mongoose` | ^9.9.4 | MongoDB ORM | Yes |
| `pdf-parse` | ^2.4.5 | Extract text from PDF buffer | Yes |
| `@xyflow/react` | ^12.11.6 | Interactive node graphs | Yes |
| `framer-motion` | ^13.1.1 | Fluid UI animations | Yes |
| `recharts` | ^3.10.1 | Data dashboards/charts | Yes |

---

# 20. IMPORTANT FUNCTIONS & CLASSES

| Name | Type | File | Purpose | Inputs | Outputs |
| ---- | ---- | ---- | ------- | ------ | ------- |
| `calculateRippleEffects` | Function | `disruption-engine.ts` | Recursively walks the dependency graph to propagate delays. | `bookings`, `deps`, `disruption` | `updatedBookings` |
| `generateRecoveryOptions` | Function | `disruption-engine.ts` | Creates solutions for affected nodes. | `booking`, `downstream`, `all` | `RecoveryOption[]` |
| `parse-itinerary/POST` | API Route| `api/parse-itinerary/route.ts`| Core ingestion pipeline. | `FormData` | `{ tripId }` |
| `formatCurrency` | Utility | `utils.ts` | Converts raw DB cost to INR. | `number` | `string` (e.g., `₹4,200`) |

---

# 21. ERROR HANDLING

- **AI Parsing Errors**: Wraps the Gemini call in a `try/catch`. If JSON mapping fails, returns `500 Internal Server Error`.
- **Weather API**: Handles invalid cities gracefully, returning `null` or `{ error: ... }` to prevent frontend crashes.
- **Frontend**: Minimal error boundaries. Relies on standard React state (`isLoading`, `error` strings) displayed as text to the user.

---

# 22. LOGGING & MONITORING

- Standard `console.log` and `console.error` in API routes for debugging AI payload responses and DB connection states.
- No structured telemetry (Datadog/Sentry) is implemented.

---

# 23. TESTING

**Status**: No automated tests implemented.
- The project relies entirely on manual verification.

---

# 24. PERFORMANCE

- **Optimizations Implemented**: MongoDB connections are cached globally in development to prevent memory leaks (`lib/db.ts`). Weather API route utilizes Next.js `revalidate: 1800` (30 minute cache) to prevent excessive external requests.
- **Limitations**: Parsing a large itinerary via Gemini can take 10-15 seconds. The UI does not implement streaming responses, so the user must wait staring at the loader until the entire JSON is generated.

---

# 25. SCALABILITY

### Existing scalability mechanisms
- The disruption engine is entirely client-side. Offloading the recursive graph mathematics to the user's browser saves server CPU.
- Vercel/Next.js serverless functions allow the API routes to scale horizontally.

### Current scalability limitations
- MongoDB is currently local (`127.0.0.1`). Needs Atlas for production.
- No pagination on the Dashboard (loads all bookings at once).

---

# 26. DEPLOYMENT

The project is configured as a standard Next.js application. 
- Can be deployed directly to **Vercel** with zero configuration (provided ENV vars are set).
- Docker configuration is not present.

---

# 27. LOCAL DEVELOPMENT SETUP

1. **Clone repository**.
2. **Install dependencies**: `npm install`
3. **Database Setup**: Ensure local MongoDB instance is running on port `27017`.
4. **Environment Variables**: Copy `.env.example` to `.env.local` and add valid `GEMINI_API_KEY`.
5. **Run Server**: `npm run dev`
6. Open `http://localhost:3000`.

---

# 28. BUILD & EXECUTION COMMANDS

| Command | Purpose | Directory |
| ------- | ------- | --------- |
| `npm run dev` | Starts development server | Root |
| `npm run build` | Compiles for production | Root |
| `npm run start` | Runs production build | Root |
| `npm run seed` | Injects mock data into DB | Root |

---

# 29. GIT & VERSION CONTROL STRUCTURE

- Standard Next.js `.gitignore` is assumed (ignoring `node_modules`, `.next`, `.env.local`).

---

# 30. ASSETS & STATIC RESOURCES

- Background images (e.g., Rome/travel scenery) used on the landing page for visual impact.
- Lucide React SVG icons used extensively for UI mapping.

---

# 31. THIRD-PARTY LIBRARIES — ACTUAL USAGE

- **`@xyflow/react`**: Used strictly in `src/components/views/network-view.tsx` to render the dependency graph. Crucial for understanding chronological booking risks.
- **`pdf-parse`**: Used in `src/app/api/parse-itinerary/route.ts` to extract text from a binary PDF upload buffer before sending it to the LLM.

---

# 32. IMPLEMENTATION STATUS AUDIT

| Component | Expected Purpose | Actual Implementation | Status | Evidence/File |
| --------- | ---------------- | --------------------- | ------ | ------------- |
| Ingestion Engine | Read PDFs and make DB records. | Gemini AI parsing works and populates DB. | Fully Implemented | `parse-itinerary/route.ts` |
| Disruption Engine | Calculate ripple effects. | Graph walking algorithm works client-side. | Fully Implemented | `disruption-engine.ts` |
| Weather API | Show live destination weather. | API and provider built, but UI component removed from view. | Partially Implemented | `weather/provider.ts` |
| Authentication | User accounts. | None exists. | Placeholder | N/A |

---

# 33. PROJECT LIMITATIONS

- **Hardcoded Types**: The `Booking` interface lacks some fields (like `traveler_name`), leading to `as any` casting in some UI components.
- **Weather Deactivated**: Weather UI was removed by user request.
- **Mocked Resolutions**: Clicking "Accept" on a recovery option does not actually call an airline API to rebook; it simply removes the warning from the UI.

---

# 34. TECHNICAL DEBT

- **Type Safety**: Some usage of `any` when handling Gemini's arbitrary JSON output.
- **Missing Tests**: No Jest or Playwright tests exist to verify the disruption engine math.

---

# 35. FUTURE IMPROVEMENTS

### Immediate Improvements
- Re-enable and style the Weather Widget based on new UI themes.
- Add strict Zod validation to the Gemini AI JSON output to prevent 500 errors.

### Medium-Term Improvements
- Integrate actual supplier APIs (Amadeus, Sabre) to make the "Recovery" buttons perform real re-booking actions.

### Long-Term Improvements
- Add multi-user authentication and trip sharing functionalities.

---

# 36. COMPLETE PROJECT DEPENDENCY MAP

```text
User Interface (Client Components)
   ↓ calls
Next.js Route Handlers (API Layer)
   ↓ orchestrates
AI Service (Gemini) <--> Document Parser (pdf-parse)
   ↓ stores
MongoDB (Mongoose)
```

---

# 37. COMPLETE PROJECT FLOW — MASTER VIEW

**User** uploads itinerary → **Frontend** `FormData` → **API** `/api/parse-itinerary` → **Backend** `pdf-parse` text extraction → **AI** Gemini JSON Schema mapping → **Database** Mongoose `create()` → **Frontend** Redirects to `/dashboard` → **Business Logic** `disruption-engine.ts` aggregates data → **User** simulates delay → **Processing** Graph walk calculates downstream effects → **Response** UI updates with red/yellow alerts and recovery strategies.

---

# 38. TECHNICAL GLOSSARY

| Term | Meaning in Reflow |
| ---- | ----------------- |
| **Ripple Effect** | The cascading impact of a single delay on all subsequent chronological bookings. |
| **Booking Dependency** | A directed graph edge mapping a source booking to a target booking (e.g., Flight -> Hotel). |
| **Tight Connection** | A calculated risk where the buffer time between two dependent bookings is dangerously low. |

---

# 39. QUICK REFERENCE

- **Project Name**: Reflow
- **Languages**: TypeScript, HTML, CSS
- **Frontend**: Next.js App Router, React 19, Tailwind v4
- **Backend**: Next.js API Routes
- **Database**: MongoDB (Mongoose)
- **AI/ML**: Google Gemini (gemini-2.5-flash)
- **Authentication**: None
- **Important Files**: `disruption-engine.ts`, `api/parse-itinerary/route.ts`
- **Current Status**: MVP fully functional for simulation and ingestion.
