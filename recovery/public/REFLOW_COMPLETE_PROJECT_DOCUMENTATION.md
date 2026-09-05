# REFLOW — Complete Project Documentation & Technical Source of Truth

> **System Name:** Reflow (Travel Disruption Recovery Engine)  
> **Repository Root:** `c:/Users/hrida/Travel-Disruption-Recovery-Engine-1`  
> **Application Directory:** `recovery/`  
> **Documentation Generation Date:** September 5, 2026  
> **Document Status:** Complete, Exhaustive System Audit & Technical Reference  

---

## 1. PROJECT IDENTITY

### One-Line Description
Reflow is an intelligent, reactive travel disruption engine that models multi-modal travel itineraries as directed acyclic dependency graphs (DAGs) to automatically detect booking failures, calculate cascading downstream financial and logistical impacts, and generate optimized, one-click recovery plans.

### Short Description
Reflow eliminates the chaos of disrupted travel itineraries. When a flight, train, hotel, or transfer is delayed, cancelled, or broken, Reflow traverses the traveler's connected itinerary using breadth-first search (BFS) graph propagation. It immediately isolates all downstream reservations put at risk, calculates the total capital at stake, and computes ranking recovery strategies across cost, arrival time, and traveler convenience. In addition, Reflow features an integrated multimodal AI ingestion pipeline that allows travelers to upload real airline e-ticket PDFs or raw PNR confirmations to dynamically extract and simulate custom journeys.

### Detailed Description
Modern multi-leg travel involves fragmented reservations across independent airlines, railway operators, regional shuttle transfers, car rentals, hotels, and excursion operators. When a single segment experiences a delay, cancellation, schedule change, or missed connection, the failure ripples through all subsequent bookings—often leading to forfeited non-refundable deposits, stranded travelers, and hours spent negotiating re-bookings across disparate customer support channels.

Reflow solves this systemic fragmentation by treating the entire journey as an interconnected directed dependency graph. Powered by Next.js 16 (App Router), React 19, TypeScript, MongoDB (via Mongoose), `@xyflow/react` (React Flow), and the `@google/genai` Gemini SDK, Reflow provides:
1. **Visual Itinerary Graph Modeling:** Renders every leg of a journey as an interactive visual node with bi-directional dependency edges displaying real-time operational states (`confirmed`, `at-risk`, `disrupted`, `rebooked`, `cancelled`).
2. **Deterministic Cascading Impact Engine:** Executes topological dependency traversal to pinpoint direct failures and downstream ripple effects, calculating cumulative dollar amounts at risk based on contractual cancellation and refund policies.
3. **Multi-Criteria Recovery Planning:** Automatically generates multi-path resolution options (e.g., "Wait It Out", "Rebook Next Flight", "Switch to Rail/Transit", "Cancel & Refund") with quantitative trade-offs across cost deltas, arrival time deltas, and convenience ratings (1–5 scale).
4. **Proactive Risk Intelligence:** Continually monitors scheduled itineraries to detect hazardous transfer windows (<60 minutes buffer) and alerts travelers to high-value non-refundable reservations downstream of high-risk legs.
5. **Dynamic Multimodal AI Itinerary Ingestion:** Accepts arbitrary airline PDF e-tickets (e.g., Air India, ITA Airways) or raw booking confirmations, parses document buffers on the server using `pdf-parse`, and extracts structured schema-validated itinerary topologies using Google Gemini 2.5 Flash.

### Project Purpose & Main Objective
To automate travel disruption response by replacing manual, high-stress re-planning with automated cascade impact analysis and one-click recovery orchestration.

### Target Users
- **Independent Business & Leisure Travelers:** Managing multi-leg international journeys with tight connections across multiple carriers.
- **Corporate Travel Managers & Travel Management Companies (TMCs):** Overseeing high-value employee itineraries that require rapid contingency planning during weather ground stops or carrier strikes.
- **Airline & Travel Agency Customer Support Agents:** Needing an instant visual diagnostic tool to assess which downstream bookings are compromised when re-booking delayed passengers.

### Main Use Cases
1. **Flight Delay / Ground Stop:** An inbound international flight is delayed by 3 hours, causing a traveler to miss their domestic high-speed connection and private airport shuttle.
2. **Carrier Strike or Cancellation:** An airline or rail network abruptly cancels service, instantly endangering hotel reservations and non-refundable tour deposits in the destination city.
3. **Adverse Weather Ingestion:** Local severe weather grounds regional flights; the engine provides indoor alternatives or full-refund weather policy cancellations.
4. **Arbitrary Ticket Upload & Risk Audit:** A traveler uploads a newly booked airline PDF e-ticket to audit connection feasibility and monitor potential failure points prior to departure.

### Current Implementation Status
- **Core Disruption Engine & Cascade Propagation:** Fully Implemented (Deterministic Graph Traversal).
- **Interactive Visual Flow Dashboard:** Fully Implemented (`@xyflow/react` + Framer Motion).
- **MongoDB Database Persistence & CRUD Actions:** Fully Implemented (Mongoose models for Trips, Bookings, Dependencies, Disruptions, Recovery Options).
- **Dynamic AI Itinerary Parser:** Implemented & Wired (Server endpoint `/api/parse-itinerary` using `@google/genai` Gemini 2.5 Flash and `pdf-parse`; requires runtime `GEMINI_API_KEY`).
- **Live Flight Radar / GDS Feeds:** Mocked / Simulated (Engine simulates real-world flight/train delay scenarios through an interactive control panel rather than live FAA/Cirium webhook integrations).
- **User Authentication / Multi-Tenant IAM:** Planned / Placeholder (Currently runs in demo single-tenant mode with direct URL parameter routing `?tripId=...`).

---

## 2. COMPLETE PROJECT OVERVIEW

### Conceptual Explanation (Simple Language)
Imagine booking a vacation to Italy: you fly into Rome, take a private shuttle to your hotel, tour the Colosseum the next morning, take a high-speed train to Florence, and then take a water taxi to Venice. 

If your first flight into Rome is delayed by 3 hours, you don't just arrive late at Rome airport—you miss your airport shuttle, arrive at your hotel past midnight, miss your morning Colosseum tour, and might miss your train to Florence. In the real world, you would have to frantically call the shuttle company, the hotel, the tour guide, and the train company separately while waiting on the tarmac.

Reflow links all these bookings together like a chain. The moment a disruption happens to one link in the chain, Reflow highlights every other booking down the line that is in danger, tells you exactly how much money you might lose, and gives you 3 or 4 clear recovery plans (for example: *"Rebook the next flight for $85 extra and keep everything else on track"* or *"Cancel today, get a refund, and take the morning train"*). With one click, Reflow fixes the entire chain.

### Technical Explanation
Under the hood, Reflow models travel plans as an in-memory and database-persisted Directed Acyclic Graph (DAG) $G = (V, E)$, where vertices $V$ represent discrete travel bookings ($b \in V$) and directed edges $E$ represent sequential temporal and logistical dependencies ($e = (u, v) \in E$, meaning booking $v$ depends on the successful completion of booking $u$).

When an operational disruption event $D$ is attached to booking $b_{\text{source}}$, the Reflow Disruption Engine (`recovery/src/lib/disruption-engine.ts`) executes a Breadth-First Search (BFS) traversal over edge set $E$ to compute the reachable set $V_{\text{downstream}} = \{v \in V \mid b_{\text{source}} \rightsquigarrow v\}$. 
1. The database status of $b_{\text{source}}$ transitions from `confirmed` $\rightarrow$ `disrupted`.
2. All bookings in $V_{\text{downstream}}$ currently in `confirmed` status transition to `at-risk`.
3. An `ImpactAnalysis` record is constructed containing direct failure rationales, cascade impact rationales, and the aggregate capital at risk:
   $$\text{Cost}_{\text{at-risk}} = \text{Cost}(b_{\text{source}}) + \sum_{v \in V_{\text{downstream}}} \text{Cost}(v)$$
4. The strategy generator synthesizes deterministic recovery solutions based on the disruption archetype (`delay`, `cancellation`, `weather`, `transfer-failure`, `missed-connection`, `traveler-initiated`). Each option specifies exact atomic state mutations (changes array), cost deltas ($\Delta C$), time arrival deltas ($\Delta T$), and qualitative convenience scores (1–5).
5. When a user accepts a recovery option, the backend performs atomic updates across the affected documents, restoring the itinerary graph to a balanced, viable state (`rebooked` or `confirmed`).

---

## 3. COMPLETE FEATURE INVENTORY

| Feature | Description | User Interaction | Technical Implementation | Files Involved | Status |
|---|---|---|---|---|---|
| **Interactive Landing Page** | High-aesthetic marketing & entry page displaying platform value proposition, features, dynamic journey preview, and architecture metrics. | Scroll, click "Get Started", click "Try Interactive Demo", click preset sample buttons. | Next.js client component with Framer Motion entry animations, glassmorphism CSS, and responsive hero orbs. | `src/app/page.tsx`, `src/app/globals.css` | Fully Implemented |
| **Itinerary Ingestion Modal** | Modal allowing users to upload PDF e-tickets or paste PNR JSON confirmation blocks. | Click "Import Itinerary", drag-and-drop PDF, select local file, paste JSON text, or click preset sample tickets. | Controlled state modal in `page.tsx` with drag-and-drop event handlers and mode toggles (`pdf` vs `text`). | `src/app/page.tsx` | Fully Implemented |
| **Sample Preset Injection** | One-click preloading of sample tickets (Indian Air India multi-city vs European Rome-Naples journey). | Click preset badges in upload modal. | Injects static mock filenames or JSON data structures into the active form state. | `src/app/page.tsx`, `scripts/seed.ts` | Fully Implemented |
| **Dynamic AI Itinerary Parser** | Server-side extraction of arbitrary travel itineraries from PDF documents or text using Gemini 2.5 Flash. | Click "Start Risk Analysis" after uploading custom file or pasting text. | Next.js API route receiving `FormData`, extracting text via `pdf-parse`, schema-prompting `@google/genai` Gemini 2.5 Flash, generating MongoDB Trip, Bookings, and Dependencies. | `src/app/api/parse-itinerary/route.ts`, `src/app/page.tsx` | Fully Implemented (Requires API Key) |
| **Interactive Itinerary Graph (DAG)** | 2D visual dependency graph displaying travel legs, chronological flow, and live operational statuses. | Pan, zoom, click nodes to inspect, drag view, view animated edge pulses on disrupted links. | `@xyflow/react` (React Flow) implementation with custom node renderer (`BookingNode`), automated layout computation, and custom animated SVG edge paths. | `src/components/itinerary-graph.tsx`, `src/components/booking-node.tsx` | Fully Implemented |
| **Draggable & Resizable Booking Detail Panel** | Floating inspection card showing comprehensive booking metadata, location, timeline, costs, and refund rules. | Click any graph node to open; drag via top header; resize via bottom-right handle; expand/collapse or close. | Custom pointer tracking math with `useRef`, `useState`, and bounded min/max dimensions. | `src/components/booking-detail-panel.tsx` | Fully Implemented |
| **Disruption Simulation Studio** | Comprehensive side drawer allowing users to inject 12 distinct failure scenarios across 6 category tabs. | Switch tabs (All, Flights, Transfers, Trains, Hotels, Activities); click scenario card; click target node in graph. | Target selection mode state machine; validates booking type eligibility; dispatches `POST /api/actions/disruptions`. | `src/components/disruption-simulator.tsx`, `src/app/dashboard/page.tsx` | Fully Implemented |
| **Cascading Impact Analysis Bar** | Collapsible bottom HUD displaying real-time financial exposure, primary root cause, and downstream cascade list. | Expand/collapse via toggle; view per-booking breakdown; close via dismiss button; restore via header button. | Inline CSS max-height transitions, computed BFS impact data via `computeImpactAnalysis()`. | `src/components/impact-analysis.tsx` | Fully Implemented |
| **Recovery Strategy Engine & Ranking** | Multi-option contingency recommendation engine presenting cards with cost, time, and convenience metrics. | Switch between "Cards" view and "Compare" table view; inspect plan details; click "Apply Recovery Plan". | Evaluates disruption category; generates 3 distinct strategies; sorts options based on user preference profile; applies mutations via `POST /api/actions/recovery`. | `src/components/recovery-options.tsx`, `src/components/recovery-chart.tsx`, `src/lib/disruption-engine.ts` | Fully Implemented |
| **Recovery Strategy Radar Comparison** | Multi-attribute radar/bar chart visualization comparing recovery options across cost, time, convenience, and impact. | Toggle "Compare" tab in Recovery view. | Custom SVG/Recharts visualization rendering metric trade-offs. | `src/components/recovery-chart.tsx` | Fully Implemented |
| **Proactive Risk Monitor** | Rule-based diagnostic scanner flagging high-risk operational windows before disruptions occur. | Navigate to "Risk Monitor" tab in sidebar; click warning card to inspect. | Evaluates consecutive booking dependencies; flags connection gaps <60 min or non-refundable downstream items. | `src/components/views/risk-monitor-view.tsx`, `src/lib/disruption-engine.ts` | Fully Implemented |
| **Real-Time Operational Alerts Center** | Notification inbox aggregating active disruptions, cascade risks, and system update logs. | Navigate to "Alerts" tab; filter by All, Unread, Alerts, Updates; click item to view modal details; mark as read. | Client-side filtering and read-state management using TypeScript `Set` and modal dialogs. | `src/components/views/alerts-view.tsx` | Fully Implemented |
| **Personalized Recovery Preferences** | User-configurable ranking engine altering how recovery plans are sorted and budget-constrained. | Select priority (Lowest Cost, Minimum Disruption, Fastest Arrival, Best Convenience); adjust budget slider; toggle transport modes. | React Context (`PreferencesContext`) persisted across browser sessions via `localStorage`. | `src/context/preferences-context.tsx`, `src/components/views/preferences-view.tsx` | Fully Implemented |
| **Dashboard Executive Overview** | High-level operations center showing Trip Health gauge, stat cards, route timeline, and quick actions. | View ring gauge; click quick navigation cards; view upcoming legs. | Calculated health score formula; Framer Motion animated SVG ring stroke gauge. | `src/components/views/dashboard-overview.tsx` | Fully Implemented |
| **Global Itinerary Search** | Live text filter filtering bookings across the graph and views. | Type booking title, provider, confirmation code, or transport type into header search input. | Memoized array filtering passed down to React Flow node states and subviews. | `src/app/dashboard/page.tsx` | Fully Implemented |
| **One-Click Demo State Reset** | Development & demo reset control restoring all database records to clean initial confirmed state. | Click "Reset Demo" button in sidebar. | Calls `POST /api/actions/reset?tripId=...`; wipes disruptions and recovery options; resets all booking statuses to `confirmed`. | `src/app/api/actions/reset/route.ts`, `src/components/sidebar.tsx` | Fully Implemented |
| **3D Reflow Branding Loader** | Custom geometric glassmorphism loading animation for route transitions and initial data fetching. | Automatic display during data fetching or page initialization. | CSS 3D perspective scene with animated shine keyframes and atmospheric blur backdrops. | `src/components/reflow-loader.tsx` | Fully Implemented |

---

## 4. COMPLETE USER JOURNEY

### Master User Flow Architecture
```text
                  ┌──────────────────────────────────────────────┐
                  │                 Landing Page                 │
                  │             (http://localhost:3000)          │
                  └──────────────────────┬───────────────────────┘
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   ↓                                           ↓
         [Get Started / Direct Demo]                 [Import Itinerary]
                   │                                           │
                   │                                 ┌─────────┴─────────┐
                   │                                 ↓                   ↓
                   │                          [Upload PDF]        [Paste PNR / JSON]
                   │                                 └─────────┬─────────┘
                   │                                           ↓
                   │                              [POST /api/parse-itinerary]
                   │                                           │
                   │                              Google Gemini 2.5 Flash Ingestion
                   │                                           │
                   │                                 MongoDB Documents Created
                   │                                           ↓
                   └─────────────────────┬─────────────────────┘
                                         ↓
                  ┌──────────────────────────────────────────────┐
                  │              Dashboard Gateway               │
                  │         (/dashboard?tripId={tripId})         │
                  └──────────────────────┬───────────────────────┘
                                         │
        ┌───────────────────┬────────────┴───────────┬───────────────────┐
        ↓                   ↓                        ↓                   ↓
   [Overview]          [Itinerary]            [Risk Monitor]         [Preferences]
  Health gauge       Interactive DAG          Connection audits     Set priority &
  Stat cards         Node inspection          Non-refundable caps   transport modes
  Timeline           Simulate Disruption
                            │
                            ↓
               [Disruption Triggered / Injected]
                            │
                            ↓
               [Topological BFS Impact Analysis]
               - Primary node marked "disrupted"
               - Downstream nodes marked "at-risk"
               - Total capital at risk computed
                            │
                            ↓
               [Multi-Path Recovery Strategies]
               - Wait it out / Rebook / Alternative transit
               - Cost Δ, Time Δ, Convenience Rating
                            │
                            ↓
               [User Selects & Applies Recovery Plan]
                            │
                            ↓
               [Atomic Database State Mutation]
               - Statuses updated to "rebooked" / "confirmed"
               - Visual DAG clears alert pulses
```

### Detailed Interaction Workflows

#### Workflow 1: Custom Document Ingestion & AI Parsing
1. **Initiation:** User clicks "Import Itinerary" on the landing page hero section.
2. **Input Selection:** User drops an airline e-ticket PDF (`Air_India_Delhi_Mumbai_Goa_E-Ticket.pdf` or custom ticket) into the dropzone, or pastes confirmation text.
3. **Transmission:** User clicks "Start Risk Analysis". The frontend dispatches a `multipart/form-data` request to `POST /api/parse-itinerary`.
4. **Server Processing:**
   - Server validates presence of file/text and retrieves `GEMINI_API_KEY`.
   - `pdf-parse` extracts raw text from the uploaded PDF binary buffer.
   - Text is passed to Gemini 2.5 Flash with a strict JSON schema requirement (`traveler_name`, `destination`, `start_date`, `end_date`, `bookings`).
5. **Graph Synthesis:**
   - Backend creates a new `Trip` document with a unique UUID.
   - Iterates through extracted bookings, assigns visual coordinates (`position: { x, y }`), and persists them via `BookingModel.insertMany()`.
   - Automatically computes sequential dependency edges and persists them via `DependencyModel.insertMany()`.
6. **Navigation:** Server returns `{ tripId }`. The client router executes `router.push('/dashboard?tripId=' + tripId)`.

#### Workflow 2: Disruption Simulation & Cascade Propagation
1. **Navigation:** Traveler navigates to the **Itinerary** tab (`/dashboard?tripId=...`).
2. **Scenario Selection:** In the right-hand Disruption Simulator panel, traveler clicks a scenario (e.g., "Flight Delay" under Flights tab).
3. **Interactive Targeting:** The simulator enters target selection mode. The banner alerts the user: *"Click a flight node to simulate Flight Delay"*. Nodes that match the target booking type pulse with an active target aura.
4. **Execution:** User clicks the JFK $\rightarrow$ FCO flight node (`b0000001-...-0001`).
5. **Backend Mutation:** Dispatches `POST /api/actions/disruptions?tripId=...` with payload `{ bookingId, type: 'delay', severity: 'high', description: 'Flight AA 110 delayed...' }`.
6. **Cascade Propagation:**
   - Database creates a `DisruptionEvent`.
   - Updates target booking to `status: 'disrupted'`.
   - Runs BFS downstream traversal: finds airport shuttle, Rome hotel, Colosseum tour, Florence train, etc.
   - Updates all downstream nodes to `status: 'at-risk'`.
   - Generates and stores 3 distinct recovery options in `RecoveryOptionModel`.
7. **UI Notification:** Impact analysis bar slides up from the bottom showing **$1,247 Total Cost at Risk**, direct failure explanation, and cascade warnings. React Flow graph edges illuminate in animated amber.

#### Workflow 3: Multi-Criteria Recovery Resolution
1. **Review:** User clicks "Show Recovery Plans" or navigates to the **Recovery Plans** sidebar tab.
2. **Comparison:** User reviews recommended strategies:
   - **Plan 1 (Best Match):** Rebook next flight (+$85, +45m arrival, Convenience 4/5).
   - **Plan 2:** Switch to alternative rail (+$45, +90m arrival, Convenience 3/5).
   - **Plan 3:** Wait it out ($0 cost, +120m delay, Convenience 2/5).
3. **Selection:** User clicks "Apply Plan" on Plan 1.
4. **Application:** Frontend dispatches `POST /api/actions/recovery` with `{ optionId }`.
5. **Database Commit:** The server marks the recovery option as `selected: true` and applies the change mutations: target booking transitions to `rebooked`, downstream bookings revert to `confirmed`.
6. **Graph Resolution:** Dashboard polls or refreshes data; the graph nodes turn green (`confirmed`) and blue (`rebooked`), impact warnings dismiss, and trip health returns to 100%.

---

## 5. SYSTEM ARCHITECTURE

Reflow is architected as a modern, full-stack Next.js application adhering to the App Router conventions, decoupling deterministic algorithmic logic from database transactions and client-side graphical representations.

### Architectural Blueprint (ASCII Diagram)
```text
========================================================================================================
                                         CLIENT TIER (Browser)
========================================================================================================
 [ Next.js App Router: React 19 Client Components ]
    │
    ├── Landing Page (src/app/page.tsx)
    │     └── Itinerary Ingestion Modal (File Upload / Drag-and-Drop / PNR JSON)
    │
    └── Dashboard (src/app/dashboard/page.tsx)
          ├── Sidebar Navigation (src/components/sidebar.tsx)
          ├── View Orchestrator (Overview / Itinerary / Recovery / Risk / Alerts / Preferences)
          ├── Interactive DAG Canvas (src/components/itinerary-graph.tsx - @xyflow/react)
          ├── Draggable Detail Panel (src/components/booking-detail-panel.tsx)
          ├── Disruption Simulator (src/components/disruption-simulator.tsx)
          ├── Impact Analysis HUD (src/components/impact-analysis.tsx)
          └── State Management:
                ├── React Hooks (useState, useEffect, useMemo, useCallback)
                ├── Polling Synchronization Engine (5-second polling interval)
                └── Preferences Context (src/context/preferences-context.tsx -> LocalStorage)
                                                  │
                                                  │ HTTP Fetch (REST / JSON / FormData)
                                                  ▼
========================================================================================================
                                     SERVER TIER (Next.js API Routes)
========================================================================================================
 [ API Controllers / Route Handlers (src/app/api/*) ]
    │
    ├── Data Ingestion:
    │     └── POST /api/parse-itinerary ──────────┐
    │                                             │
    ├── Query Endpoints:                          │
    │     ├── GET /api/trips                      │
    │     ├── GET /api/bookings                   │
    │     ├── GET /api/dependencies               │
    │     ├── GET /api/disruptions                │
    │     └── GET /api/recovery-options           │
    │                                             │
    └── Action Controllers:                       │
          ├── POST /api/actions/disruptions ──────┼────────┐
          ├── POST /api/actions/recovery          │        │
          └── POST /api/actions/reset             │        │
                                                  │        │
==================================================┼========┼============================================
                   EXTERNAL AI & LIBS             │        │          PURE ALGORITHMIC ENGINE
==================================================┼========┼============================================
 [ External Services ]                            │        │ [ Pure Logic (src/lib/disruption-engine.ts) ]
    ├── Google Gemini 2.5 Flash ◄─────────────────┘        │   ├── BFS Downstream Traversal
    │     (@google/genai SDK)                              │   ├── Cumulative Cost-at-Risk Aggregation
    ├── PDF Buffer Parser                                  │   ├── Dynamic Recovery Strategy Generation
    │     (pdf-parse library)                              │   ├── Proactive Connection Risk Auditing
    │                                                      │   └── Booking Type Constraint Validation
    ▼                                                      │
===========================================================┼============================================
                                     DATABASE TIER (MongoDB)
========================================================================================================
 [ MongoDB Database Connection Pool (src/lib/db.ts) ]
    │
    └── Mongoose Object Modeling Layer (src/models/index.ts)
          ├── TripModel            (`trips` collection)
          ├── BookingModel         (`bookings` collection)
          ├── DependencyModel      (`dependencies` collection)
          ├── DisruptionModel      (`disruptions` collection)
          └── RecoveryOptionModel  (`recoveryoptions` collection)
```

### Architectural Subsystem Breakdown
1. **Frontend Presentation Layer:** Built using Next.js 16 and React 19. Renders modular views via dynamic client-side tab switching within `/dashboard`. Employs `@xyflow/react` for GPU-accelerated canvas rendering of directed graphs with custom nodes and animated bezier/straight edges.
2. **Data Access & State Synchronization Layer:** Implemented in `src/lib/queries.ts`. Operates via declarative async functions calling standard REST endpoints. The dashboard executes an initial multi-resource `Promise.all` fetch and subsequently maintains state coherence through an active 5-second polling loop.
3. **Pure Disruption Engine:** Located in `src/lib/disruption-engine.ts`. Written as deterministic, pure TypeScript functions without side effects or database dependencies. Houses graph algorithms (BFS downstream traversal), scenario generation, and risk heuristics.
4. **Backend Controllers:** Next.js Route Handlers (`route.ts`) executing in Node.js server environments. Enforces database connection caching via `global.mongoose`, parses incoming payloads, executes Mongoose CRUD operations, and bridges database records with the pure engine.
5. **Multimodal Ingestion Pipeline:** Integrates `pdf-parse` and `@google/genai`. Receives uploaded PDF binaries, decodes text streams, and prompts the Gemini 2.5 Flash model with structured JSON Schema output constraints.
6. **Data Storage Layer:** Standalone MongoDB database accessed via Mongoose schemas using explicit String UUID identifiers (`_id: { type: String, required: true }`) to ensure compatibility with pre-seeded datasets and deterministic foreign key referencing.

---

## 6. COMPLETE FOLDER STRUCTURE

```text
Travel-Disruption-Recovery-Engine-1/
├── .git/                                         # Git version control directory
├── .gitignore                                    # Root Git ignore rules
├── .vscode/                                      # VS Code workspace settings
│   └── settings.json                             # Editor configuration
├── Air_India_Delhi_Mumbai_Goa_E-Ticket.pdf       # Test asset: Air India PDF ticket
├── ITA_Airways_Rome_Naples_Confirmed_Tickets.pdf # Test asset: ITA Airways PDF ticket
├── package-lock.json                             # Root lockfile
├── recovery/                                     # Main Next.js Web Application Project
│   ├── .env.example                              # Template environment configuration
│   ├── .env.local                                # Local runtime secrets (MONGODB_URI, GEMINI_API_KEY)
│   ├── .gitignore                                # Application-level Git ignore rules
│   ├── .next/                                    # Compiled Next.js build artifact cache
│   ├── .vscode/                                  # App-level VS Code configuration
│   │   └── settings.json
│   ├── AGENTS.md                                 # Next.js agent rule specifications
│   ├── CLAUDE.md                                 # Claude rule pointer file
│   ├── README.md                                 # Standard Next.js bootstrap documentation
│   ├── components.json                           # Shadcn UI configuration schema
│   ├── eslint.config.mjs                         # ESLint 9 flat configuration
│   ├── next-env.d.ts                             # Next.js TypeScript declarations
│   ├── next.config.ts                            # Next.js configuration (Turbopack settings)
│   ├── node_modules/                             # Installed NPM dependencies
│   ├── package-lock.json                         # Primary application package lockfile
│   ├── package.json                              # Project manifest, scripts, and dependencies
│   ├── postcss.config.mjs                        # PostCSS Tailwind configuration
│   ├── public/                                   # Static web assets served at root /
│   │   ├── Air_India_Delhi_Mumbai_Goa_E-Ticket.pdf
│   │   ├── ITA_Airways_Rome_Naples_Confirmed_Tickets.pdf
│   │   ├── file.svg                              # Static vector asset
│   │   ├── globe.svg                             # Static vector asset
│   │   ├── next.svg                              # Next.js logo
│   │   ├── vercel.svg                            # Vercel logo
│   │   └── window.svg                            # Static vector asset
│   ├── scripts/                                  # Operational, seeding, and generation scripts
│   │   ├── generate_europe_pdf.py                # Python ReportLab generator for European ticket
│   │   ├── generate_pdf.py                       # Python ReportLab generator for Indian ticket
│   │   └── seed.ts                               # TypeScript database seeder for MongoDB
│   ├── src/                                      # Application source code
│   │   ├── app/                                  # Next.js App Router routes and pages
│   │   │   ├── api/                              # REST API Route Handlers
│   │   │   │   ├── actions/                      # State-mutating operational endpoints
│   │   │   │   │   ├── disruptions/route.ts      # Injects disruption event & propagates risk
│   │   │   │   │   ├── recovery/route.ts         # Applies selected recovery plan mutations
│   │   │   │   │   └── reset/route.ts            # Resets all bookings to confirmed state
│   │   │   │   ├── bookings/route.ts             # Fetches bookings for a trip
│   │   │   │   ├── dependencies/route.ts         # Fetches booking dependency edges
│   │   │   │   ├── disruptions/route.ts          # Fetches active disruption events
│   │   │   │   ├── parse-itinerary/route.ts      # AI PDF & PNR parser endpoint (Gemini)
│   │   │   │   ├── recovery-options/route.ts     # Fetches recovery plans for disruptions
│   │   │   │   └── trips/route.ts                # Fetches high-level trip metadata
│   │   │   ├── dashboard/                        # Dashboard application interface
│   │   │   │   ├── loading.tsx                   # Dashboard route loading state
│   │   │   │   └── page.tsx                      # Main interactive operations dashboard
│   │   │   ├── favicon.ico                       # Application favicon
│   │   │   ├── globals.css                       # Global Tailwind CSS, theme tokens, styling
│   │   │   ├── layout.tsx                        # Root HTML structure, fonts, providers, toaster
│   │   │   ├── loading.tsx                       # Root loading state (ReflowLoader)
│   │   │   ├── page.tsx                          # Landing marketing page & upload gateway
│   │   │   └── providers.tsx                     # React Context Provider wrapper
│   │   ├── components/                           # Reusable UI and domain components
│   │   │   ├── booking-detail-panel.tsx          # Draggable, resizable booking inspector HUD
│   │   │   ├── booking-node.tsx                  # Standalone React Flow custom node definition
│   │   │   ├── disruption-simulator.tsx          # Disruption scenario generator & filter tabs
│   │   │   ├── impact-analysis.tsx               # Collapsible impact & cost-at-risk panel
│   │   │   ├── itinerary-graph.tsx               # Canvas controller for @xyflow/react
│   │   │   ├── recovery-chart.tsx                # Radar/metric visualization for recovery plans
│   │   │   ├── recovery-options.tsx              # Cards & comparison view for recovery plans
│   │   │   ├── reflow-loader.tsx                 # 3D animated glassmorphism loader
│   │   │   ├── risk-radar.tsx                    # Risk visualization component
│   │   │   ├── sidebar.tsx                       # Application navigation sidebar
│   │   │   ├── status-badge.tsx                  # Standardized color-coded status pills
│   │   │   ├── ui/                               # Shadcn / Base UI primitives
│   │   │   │   ├── badge.tsx                     # Variant badge primitive
│   │   │   │   ├── button.tsx                    # Variant button primitive
│   │   │   │   ├── card.tsx                      # Card container primitive
│   │   │   │   ├── dialog.tsx                    # Modal dialog primitive
│   │   │   │   ├── scroll-area.tsx               # Styled scroll area primitive
│   │   │   │   ├── separator.tsx                 # Visual divider primitive
│   │   │   │   ├── sheet.tsx                     # Slide-over panel primitive
│   │   │   │   ├── sonner.tsx                    # Toast notification container
│   │   │   │   ├── tabs.tsx                      # Tab navigation primitive
│   │   │   │   └── tooltip.tsx                   # Tooltip popover primitive
│   │   │   └── views/                            # Dashboard multi-view components
│   │   │       ├── alerts-view.tsx               # Operational alerts and updates inbox
│   │   │       ├── dashboard-overview.tsx        # High-level overview & trip health ring
│   │   │       ├── preferences-view.tsx          # Recovery ranking priority & budget settings
│   │   │       └── risk-monitor-view.tsx         # Proactive connection & refund risk audits
│   │   ├── context/                              # React Context providers
│   │   │   └── preferences-context.tsx           # User preferences state & local storage sync
│   │   ├── lib/                                  # Core business logic and shared utilities
│   │   │   ├── db.ts                             # Cached MongoDB Mongoose connection client
│   │   │   ├── disruption-engine.ts              # Pure graph BFS traversal & strategy logic
│   │   │   ├── queries.ts                        # Data access client communicating with /api/*
│   │   │   └── utils.ts                          # Tailwind clsx/twMerge utility (cn function)
│   │   ├── models/                               # Mongoose database models and schemas
│   │   │   └── index.ts                          # Trip, Booking, Dependency, Disruption, Option
│   │   └── types/                                # Core TypeScript type definitions
│   │       └── index.ts                          # Interfaces for all domain entities
│   ├── tsconfig.json                             # TypeScript compiler configuration
│   └── tsconfig.tsbuildinfo                      # Incremental TypeScript build cache
```

---

## 7. FILE-BY-FILE DOCUMENTATION

| File Path | File Type | Purpose | Important Functions / Classes / Exports | Dependencies | Used By |
|---|---|---|---|---|---|
| `recovery/package.json` | JSON Config | Node.js project manifest defining metadata, scripts, and runtime dependencies. | `dev`, `build`, `start`, `lint`, `seed` | npm ecosystem | Node.js, Vercel, Next.js CLI |
| `recovery/next.config.ts` | TypeScript Config | Next.js server and Turbopack bundler configuration. | `nextConfig` | `next` | Next.js build runtime |
| `recovery/tsconfig.json` | JSON Config | TypeScript compiler configuration and path aliases (`@/*`). | `compilerOptions`, `paths` | `typescript` | TypeScript compiler |
| `recovery/.env.example` | Env Template | Example environment variable template showing MongoDB connection URI. | `MONGODB_URI` | None | Developers / Deployment |
| `recovery/.env.local` | Env Local | Local runtime configuration storing database credentials and API keys. | `MONGODB_URI`, `GEMINI_API_KEY` | None | Server-side API handlers |
| `recovery/scripts/seed.ts` | TypeScript Script | Standalone database initialization script seeding trips, bookings, and edges. | `seed()` | `mongoose`, `dotenv` | Developer setup via `npm run seed` |
| `recovery/scripts/generate_pdf.py` | Python Script | Generates professional Air India e-ticket PDF asset using ReportLab. | `create_itinerary_pdf()` | `reportlab` | Asset generation |
| `recovery/scripts/generate_europe_pdf.py` | Python Script | Generates professional ITA Airways European e-ticket PDF asset. | `create_itinerary_pdf()` | `reportlab` | Asset generation |
| `recovery/src/types/index.ts` | TypeScript Definitions | Central domain types, booking statuses, disruption types, and interfaces. | `Trip`, `Booking`, `BookingDependency`, `DisruptionEvent`, `RecoveryOption`, `ImpactAnalysis`, `RiskWarning` | None | Universally imported |
| `recovery/src/models/index.ts` | Mongoose Models | Database schemas and compiled models for MongoDB persistence. | `TripModel`, `BookingModel`, `DependencyModel`, `DisruptionModel`, `RecoveryOptionModel` | `mongoose` | All API route handlers |
| `recovery/src/lib/db.ts` | Database Client | Manages cached MongoDB connections across serverless and development reloads. | `dbConnect()` (default export) | `mongoose` | All API route handlers |
| `recovery/src/lib/utils.ts` | Utility | Class-variance and Tailwind class merge helper. | `cn()` | `clsx`, `tailwind-merge` | All UI components |
| `recovery/src/lib/disruption-engine.ts` | Domain Engine | Pure graph traversal, cascade analysis, strategy generation, and risk audits. | `getDownstreamBookingIds`, `computeImpactAnalysis`, `generateRecoveryOptions`, `computeRiskWarnings` | `@/types` | API handlers & client views |
| `recovery/src/lib/queries.ts` | Data Layer | Frontend HTTP client executing REST calls against Next.js API routes. | `fetchTrip`, `fetchBookings`, `fetchDependencies`, `fetchDisruptions`, `createDisruption`, `selectRecoveryOption`, `resetDemo` | `@/types` | `dashboard/page.tsx` |
| `recovery/src/context/preferences-context.tsx` | React Context | Manages recovery prioritization, budget limits, and transport preferences with LocalStorage. | `PreferencesProvider`, `usePreferences` | `react` | `providers.tsx`, dashboard views |
| `recovery/src/app/layout.tsx` | Next.js Root Layout | Root HTML scaffolding injecting fonts (Inter, Geist Mono, Baloo 2) and global providers. | `RootLayout`, `metadata` | `next/font`, sonner, tooltip | Next.js App Router |
| `recovery/src/app/providers.tsx` | Client Provider | Client wrapper injecting `PreferencesProvider` into component hierarchy. | `Providers` | `@/context/preferences-context` | `src/app/layout.tsx` |
| `recovery/src/app/globals.css` | CSS Stylesheet | Global styles, Tailwind directives, dark mode tokens, neon glow effects, animations. | Utility classes, CSS variables | Tailwind CSS | Universally loaded |
| `recovery/src/app/loading.tsx` | Next.js Loading | Root route loading screen displaying ReflowLoader. | `Loading()` | `ReflowLoader` | Next.js App Router |
| `recovery/src/app/page.tsx` | Next.js Page | Landing marketing page, feature showcase, and itinerary ingestion gateway. | `HomePage()` | `framer-motion`, `lucide-react` | Root web route `/` |
| `recovery/src/app/dashboard/loading.tsx` | Next.js Loading | Dashboard route loading fallback. | `Loading()` | `ReflowLoader` | Next.js App Router |
| `recovery/src/app/dashboard/page.tsx` | Next.js Page | Primary operations dashboard integrating canvas, views, simulation, and polling. | `DashboardPage()` | `react`, `@xyflow/react`, `sonner` | Web route `/dashboard` |
| `recovery/src/app/api/trips/route.ts` | Next.js Route | API handler returning high-level Trip document by `tripId`. | `GET(request)` | `TripModel`, `dbConnect` | `src/lib/queries.ts` |
| `recovery/src/app/api/bookings/route.ts` | Next.js Route | API handler returning sorted array of Bookings for a trip. | `GET(request)` | `BookingModel`, `dbConnect` | `src/lib/queries.ts` |
| `recovery/src/app/api/dependencies/route.ts` | Next.js Route | API handler returning dependency edges for a trip. | `GET(request)` | `DependencyModel`, `dbConnect` | `src/lib/queries.ts` |
| `recovery/src/app/api/disruptions/route.ts` | Next.js Route | API handler returning active disruption events for a trip. | `GET(request)` | `DisruptionModel`, `dbConnect` | `src/lib/queries.ts` |
| `recovery/src/app/api/recovery-options/route.ts` | Next.js Route | API handler returning generated recovery plans for active disruptions. | `GET(request)` | `RecoveryOptionModel`, `dbConnect` | `src/lib/queries.ts` |
| `recovery/src/app/api/actions/disruptions/route.ts` | Next.js Route | Action handler creating disruption, mutating downstream bookings to at-risk, and generating options. | `POST(request)` | `disruption-engine`, Mongoose models | `src/lib/queries.ts` |
| `recovery/src/app/api/actions/recovery/route.ts` | Next.js Route | Action handler applying selected recovery plan mutations to database. | `POST(request)` | `BookingModel`, `RecoveryOptionModel` | `src/lib/queries.ts` |
| `recovery/src/app/api/actions/reset/route.ts` | Next.js Route | Action handler resetting all bookings to confirmed and deleting disruptions. | `POST(request)` | Mongoose models, `dbConnect` | `src/lib/queries.ts` |
| `recovery/src/app/api/parse-itinerary/route.ts` | Next.js Route | Multimodal parser extracting itinerary JSON from PDF/text via Gemini 2.5 Flash and creating MongoDB docs. | `POST(req)` | `@google/genai`, `pdf-parse`, `uuid` | Landing page upload form |
| `recovery/src/components/sidebar.tsx` | UI Component | Application navigation sidebar with view switching, disruption badges, and reset button. | `AppSidebar()` | `lucide-react` | `dashboard/page.tsx` |
| `recovery/src/components/reflow-loader.tsx` | UI Component | 3D visual branding loader with animated text shine and atmospheric glow. | `ReflowLoader()` | `framer-motion` | Loading states & dashboard |
| `recovery/src/components/itinerary-graph.tsx` | Domain UI | Graph canvas wrapping `@xyflow/react` to render bookings and dependency edges. | `ItineraryGraph()` | `@xyflow/react`, `BookingNode` | `dashboard/page.tsx` |
| `recovery/src/components/booking-node.tsx` | Domain UI | Standalone visual node component for React Flow rendering status badges, icons, and handles. | `BookingNode()` | `@xyflow/react`, `lucide-react` | `itinerary-graph.tsx` |
| `recovery/src/components/booking-detail-panel.tsx` | Domain UI | Draggable and resizable floating HUD displaying comprehensive booking details. | `BookingDetailPanel()` | `framer-motion`, `lucide-react` | `dashboard/page.tsx` |
| `recovery/src/components/disruption-simulator.tsx` | Domain UI | Scenario trigger control panel with category filtering tabs and target selection mode. | `DisruptionSimulator()` | `framer-motion`, `sonner` | `dashboard/page.tsx` |
| `recovery/src/components/impact-analysis.tsx` | Domain UI | Bottom sliding drawer showing cost at risk, primary failure cause, and downstream ripple effects. | `ImpactAnalysisPanel()` | `framer-motion`, `lucide-react` | `dashboard/page.tsx` |
| `recovery/src/components/recovery-options.tsx` | Domain UI | Multi-option recovery strategy interface supporting Card view and Comparison matrix. | `RecoveryOptions()` | `framer-motion`, `sonner` | `dashboard/page.tsx` |
| `recovery/src/components/recovery-chart.tsx` | Visualization | Chart visualizer rendering cost and time metrics for recovery plan trade-offs. | `RecoveryChart()` | `lucide-react` | `recovery-options.tsx` |
| `recovery/src/components/risk-radar.tsx` | Visualization | Radar chart plotting multiple risk dimensions across itinerary bookings. | `RiskRadar()` | `recharts` | Dashboard overview / Risk |
| `recovery/src/components/status-badge.tsx` | UI Component | Standardized visual badge rendering operational booking statuses with matching colors. | `StatusBadge()` | `@/types` | Multiple components & views |
| `recovery/src/components/views/dashboard-overview.tsx` | Dashboard View | High-level operations center with health ring, stat cards, route timeline, and quick links. | `DashboardOverview()` | `framer-motion`, `lucide-react` | `dashboard/page.tsx` |
| `recovery/src/components/views/risk-monitor-view.tsx` | Dashboard View | Proactive intelligence center auditing tight connections and non-refundable deposit risks. | `RiskMonitorView()` | `framer-motion`, `lucide-react` | `dashboard/page.tsx` |
| `recovery/src/components/views/alerts-view.tsx` | Dashboard View | Notification center aggregating disruption events and system status notifications with detail modal. | `AlertsView()` | `framer-motion`, `lucide-react` | `dashboard/page.tsx` |
| `recovery/src/components/views/preferences-view.tsx` | Dashboard View | Settings view allowing travelers to configure recovery priority, budget cap, and allowed transport modes. | `PreferencesView()` | `lucide-react`, `sonner` | `dashboard/page.tsx` |

---

## 8. FRONTEND — COMPLETE DOCUMENTATION

### Framework, Architecture & Tooling
- **Framework:** Next.js 16.3.4 (App Router).
- **Core Library:** React 19.2.8 (`react`, `react-dom`).
- **Language:** TypeScript 5.
- **Styling Architecture:** Tailwind CSS v4 (`@tailwindcss/postcss`) with CSS custom properties in `globals.css`.
- **Iconography:** `lucide-react` (Plane, Train, Hotel, Car, Ticket, AlertTriangle, Shield, Clock, etc.).
- **Animation & Transitions:** `framer-motion` v13.1.1 for spring-based modals, view switching (`AnimatePresence`), and sliding drawers.
- **Notification Infrastructure:** `sonner` v2.0.8 toast notifications with rich color coding.
- **Graph Visualization:** `@xyflow/react` v12.11.6 for canvas-based graph rendering.

### Frontend Page Inventory

| Page | Route | Purpose | Components Composed | API Calls Invoked | Primary User Actions |
|---|---|---|---|---|---|
| **Landing & Ingestion Gateway** | `/` (`src/app/page.tsx`) | Introduces the Reflow platform, displays animated value propositions, and hosts the multimodal itinerary ingestion modal. | Hero sections, Ingestion Modal, Feature Cards, 3D Journey Preview, Step Cards. | `POST /api/parse-itinerary` | Click "Get Started", drag/drop PDF, paste PNR JSON, select preset demo tickets, submit for AI parsing. |
| **Operations Dashboard** | `/dashboard` (`src/app/dashboard/page.tsx`) | Central command center hosting the visual DAG, disruption simulation studio, recovery planner, risk audits, and notifications. | `AppSidebar`, `ItineraryGraph`, `BookingDetailPanel`, `DisruptionSimulator`, `ImpactAnalysisPanel`, `DashboardOverview`, `RiskMonitorView`, `AlertsView`, `PreferencesView`, `ReflowLoader`. | `GET /api/trips`, `GET /api/bookings`, `GET /api/dependencies`, `GET /api/disruptions`, `GET /api/recovery-options`, `POST /api/actions/disruptions`, `POST /api/actions/recovery`, `POST /api/actions/reset`. | Navigate sidebar views, pan/zoom DAG, inspect bookings, trigger disruption scenarios, apply recovery plans, audit risks, search bookings, reset demo. |

### Frontend Component Inventory

| Component | File | Purpose | Props / Inputs | Internal State | Logic & Handlers |
|---|---|---|---|---|---|
| `AppSidebar` | `src/components/sidebar.tsx` | Persistent left navigation bar providing view switching, badge counts, and demo reset. | `activeView`, `onViewChange`, `disruptionCount`, `alertCount`, `onReset`, `isResetting`, `travelerName` | None | Handles view switching tabs; triggers demo database reset confirmation. |
| `ItineraryGraph` | `src/components/itinerary-graph.tsx` | Renders the interactive DAG canvas using React Flow. | `bookings`, `dependencies`, `selectedBookingId`, `onSelectBooking`, `selectableBookingIds`, `isTargetSelectionActive`, `onConfirmTarget` | `nodes`, `edges` via `useNodesState` and `useEdgesState` | Computes node positioning layout grouped by day; computes edge animation and color states; manages target selection clicks. |
| `BookingNode` | `src/components/booking-node.tsx` | Custom node rendered on the React Flow canvas representing a single travel leg. | React Flow node data (`booking`, `onSelect`, `isTargetSelectionActive`, `isSelectable`, `onConfirmTarget`) | None | Applies status color schemes and target selection pulsing animations; triggers node selection. |
| `BookingDetailPanel` | `src/components/booking-detail-panel.tsx` | Floating inspection HUD displaying booking details, timing, policy, and location. | `booking`, `onClose` | `expanded`, `size (w, h)`, `pos (x, y)` | Implements pointer drag tracking (`mousemove`/`mouseup`) and corner resize tracking; expands to full detail. |
| `DisruptionSimulator` | `src/components/disruption-simulator.tsx` | Right-hand control drawer allowing manual injection of disruption scenarios. | `bookings`, `selectedBooking`, `onClearSelection`, `onTrigger`, `isLoading`, `targetSelectionScenario`, `onStartTargetSelection`, `onCancelTargetSelection` | `activeTab` (All, Flights, Transfers, Trains, Hotels, Activities), `triggeringId` | Filters scenarios by category; activates graph target selection mode; dispatches disruption event payload. |
| `ImpactAnalysisPanel` | `src/components/impact-analysis.tsx` | Bottom sliding drawer detailing aggregate cost at risk and downstream cascade causes. | `analyses`, `onClose` | `expanded`, `showDownstream` | Sums total cost at risk across disruptions; renders collapsible downstream cascade items. |
| `RecoveryOptions` | `src/components/recovery-options.tsx` | Strategy selection interface comparing recovery options. | `options`, `onSelectOption`, `maxCost` | `selecting`, `viewMode` ('cards' vs 'compare'), `viewingOption` | Evaluates budget constraints against user preferences; generates qualitative plan analysis; dispatches recovery option application. |
| `RecoveryChart` | `src/components/recovery-chart.tsx` | Metric visualization comparing recovery options across cost and time. | `options` | None | Renders visual comparison bars for cost deltas and time impacts. |
| `DashboardOverview` | `src/components/views/dashboard-overview.tsx` | Executive summary view displaying Trip Health, stats, and timeline. | `trip`, `bookings`, `dependencies`, `disruptions`, `recoveryOptions`, `onNavigate` | None | Calculates trip health percentage; renders animated SVG ring gauge; renders chronological route timeline. |
| `RiskMonitorView` | `src/components/views/risk-monitor-view.tsx` | Proactive risk inspection view auditing tight connections and non-refundable deposits. | `bookings`, `dependencies`, `onNavigate` | `selectedRisk` | Invokes `computeRiskWarnings()`; renders risk severity ring gauges and detail modals. |
| `AlertsView` | `src/components/views/alerts-view.tsx` | Notification center displaying operational disruptions and system updates. | `disruptions`, `bookings`, `onNavigate` | `tab` ('all', 'unread', 'alerts', 'updates'), `readIds` (Set), `selectedAlert` | Maps disruptions to alert feed; tracks read/unread states; renders detail inspection dialog. |
| `PreferencesView` | `src/components/views/preferences-view.tsx` | Settings view configuring recovery prioritization and transport options. | None (consumes `usePreferences()`) | None | Updates recovery ranking priority; adjusts maximum additional spend slider; toggles transport mode checkboxes. |
| `ReflowLoader` | `src/components/reflow-loader.tsx` | Full-screen 3D glassmorphism branding animation. | `label`, `text` | None | Animates 3D text stage with CSS keyframe shine and background radial gradient glow. |

### Frontend Data Flow
```text
[ User Action: e.g., Click Scenario Card in DisruptionSimulator ]
                     │
                     ▼
  [ Component Callback: onStartTargetSelection(scenario) ]
                     │
                     ▼
  [ Dashboard State Update: targetSelectionScenario = scenario ]
                     │
                     ▼
  [ Canvas Reaction: ItineraryGraph highlights eligible nodes ]
                     │
                     ▼
  [ User Action: Click Flight Node in ItineraryGraph ]
                     │
                     ▼
  [ API Invocation: createDisruption() via src/lib/queries.ts ]
                     │
                     ▼
  [ HTTP Request: POST /api/actions/disruptions?tripId=... ]
                     │
                     ▼
  [ Server State Mutation: Database documents updated ]
                     │
                     ▼
  [ HTTP Response: Returns created DisruptionEvent ]
                     │
                     ▼
  [ Dashboard Re-synchronization: loadData() executes ]
                     │
                     ▼
  [ Multi-State Dispatch: setBookings(), setDisruptions(), setRecoveryOptions() ]
                     │
                     ▼
  [ UI Re-render: ImpactAnalysisPanel mounts; DAG edges animate amber ]
```

---

## 9. BACKEND — COMPLETE DOCUMENTATION

### Runtime, Server Architecture & Execution Environment
- **Server Platform:** Next.js App Router (Node.js Server Runtime).
- **Language:** TypeScript 5.
- **Database Connection Caching:** Handled via `src/lib/db.ts` utilizing `global.mongoose` cache to preserve database connection pools across hot reloads in development and serverless invocations.
- **Payload Parsing:** Native Web API `Request` and `NextRequest` handling `request.json()` and `request.formData()`.
- **Response Format:** Uniform JSON responses utilizing `NextResponse.json(data, { status })`.
- **Error Handling:** Standardized `try / catch` blocks logging server exceptions via `console.error` and returning HTTP 500 (`{ error: 'Internal Server Error' }`) or HTTP 400/404 on malformed requests.

---

## 10. COMPLETE API DOCUMENTATION

### Master API Endpoint Directory

| Method | Endpoint | Purpose | Authentication | Request Format | Response Format | Implementation File |
|---|---|---|---|---|---|---|
| `GET` | `/api/trips` | Fetches high-level metadata for a trip by ID. | Public / Query Param | Query: `?tripId={id}` | JSON: `Trip` object | `src/app/api/trips/route.ts` |
| `GET` | `/api/bookings` | Fetches all booking records for a trip, sorted chronologically by start time. | Public / Query Param | Query: `?tripId={id}` | JSON: Array of `Booking` | `src/app/api/bookings/route.ts` |
| `GET` | `/api/dependencies` | Fetches all directed dependency edges for a trip. | Public / Query Param | Query: `?tripId={id}` | JSON: Array of `BookingDependency` | `src/app/api/dependencies/route.ts` |
| `GET` | `/api/disruptions` | Fetches all active disruption events for a trip, sorted by creation date descending. | Public / Query Param | Query: `?tripId={id}` | JSON: Array of `DisruptionEvent` | `src/app/api/disruptions/route.ts` |
| `GET` | `/api/recovery-options` | Fetches all generated recovery options associated with active disruptions. | Public / Query Param | Query: `?tripId={id}` | JSON: Array of `RecoveryOption` | `src/app/api/recovery-options/route.ts` |
| `POST` | `/api/actions/disruptions` | Injects a new disruption, sets target to `disrupted`, marks downstream as `at-risk`, and synthesizes recovery options. | Public / Query Param | Query: `?tripId={id}`<br>Body: `{ bookingId, type, severity, description }` | JSON: Created `DisruptionEvent` | `src/app/api/actions/disruptions/route.ts` |
| `POST` | `/api/actions/recovery` | Selects and applies a recovery option, mutating affected booking documents. | Public | Body: `{ optionId }` | JSON: `{ success: true }` | `src/app/api/actions/recovery/route.ts` |
| `POST` | `/api/actions/reset` | Deletes all disruptions and recovery options, resetting all bookings to `confirmed`. | Public / Query Param | Query: `?tripId={id}` | JSON: `{ success: true }` | `src/app/api/actions/reset/route.ts` |
| `POST` | `/api/parse-itinerary` | Ingests PDF e-tickets or raw text, extracts structured itinerary data via Gemini AI, and creates database records. | Public (Requires Server API Key) | `multipart/form-data`: `file` (File) and/or `text` (String) | JSON: `{ tripId: string }` | `src/app/api/parse-itinerary/route.ts` |

### In-Depth Endpoint Specifications

#### 1. `POST /api/actions/disruptions`
- **Purpose:** Central failure injection controller. Records the disruption event, executes BFS graph propagation to flag downstream reservations, and invokes the recovery option generator.
- **Request Body:**
  ```json
  {
    "bookingId": "b0000001-0000-0000-0000-000000000001",
    "type": "delay",
    "severity": "high",
    "description": "Flight AA 110 delayed by 3h 15m due to late incoming aircraft."
  }
  ```
- **Processing Logic:**
  1. Inserts a new document into `DisruptionModel`.
  2. Executes `BookingModel.updateOne({ _id: bookingId }, { status: 'disrupted' })`.
  3. Fetches all trip dependencies and bookings from MongoDB.
  4. Calls pure function `getDownstreamBookingIds(bookingId, dependencies)`.
  5. Executes `BookingModel.updateMany({ _id: { $in: downstreamIds }, status: 'confirmed' }, { status: 'at-risk' })`.
  6. Calls pure function `generateRecoveryOptions(...)` passing affected booking, downstream bookings, and full booking roster.
  7. Persists generated options via `RecoveryOptionModel.insertMany()`.
- **Response Body (HTTP 200):**
  ```json
  {
    "id": "66d98e...",
    "trip_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "booking_id": "b0000001-0000-0000-0000-000000000001",
    "type": "delay",
    "severity": "high",
    "description": "Flight AA 110 delayed by 3h 15m...",
    "created_at": "2026-09-05T12:45:00.000Z"
  }
  ```

#### 2. `POST /api/actions/recovery`
- **Purpose:** Applies a selected recovery plan to the itinerary.
- **Request Body:**
  ```json
  {
    "optionId": "66d991..."
  }
  ```
- **Processing Logic:**
  1. Finds the recovery option by ID via `RecoveryOptionModel.findById(optionId)`.
  2. Updates option state: `RecoveryOptionModel.updateOne({ _id: optionId }, { selected: true })`.
  3. Iterates over the option's `changes` array (e.g., `[{ booking_id: '...', field: 'status', new_value: 'rebooked' }]`).
  4. For each change mutation, executes `BookingModel.updateOne({ _id: change.booking_id }, { status: change.new_value })`.
- **Response Body (HTTP 200):** `{ "success": true }`.

#### 3. `POST /api/parse-itinerary`
- **Purpose:** Ingests external PDF files or raw PNR confirmation blocks and utilizes Google Gemini 2.5 Flash to synthesize database-persisted itineraries.
- **Request:** `multipart/form-data` containing `file` (PDF binary) or `text` (raw booking string).
- **Processing Logic:**
  1. Connects to database via `dbConnect()`.
  2. If a PDF is attached, extracts raw text content using `pdf-parse`.
  3. Verifies `process.env.GEMINI_API_KEY`.
  4. Instantiates `GoogleGenAI({ apiKey })`.
  5. Configures strict schema enforcement (`responseMimeType: 'application/json'`, `responseSchema`).
  6. Dispatches generation prompt to `gemini-2.5-flash`.
  7. Parses structured JSON response containing traveler name, destination, trip dates, and bookings array.
  8. Generates unique UUIDs for trip and bookings; assigns visual layout coordinates.
  9. Creates sequential dependency edges between adjacent bookings.
  10. Persists records to MongoDB (`TripModel`, `BookingModel`, `DependencyModel`).
- **Response Body (HTTP 200):**
  ```json
  {
    "tripId": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
  }
  ```

---

## 11. EXTERNAL API & THIRD-PARTY SERVICES

| Service | Purpose | SDK / Library | Endpoint / Protocol | Authentication | Used In | Status |
|---|---|---|---|---|---|---|
| **Google Gemini API** | Multimodal document understanding & itinerary extraction from raw text/PDF. | `@google/genai` v2.21.0 | Google Generative Language REST API (`gemini-2.5-flash`) | `GEMINI_API_KEY` (Header / Bearer) | `src/app/api/parse-itinerary/route.ts` | Fully Implemented & Wired |
| **MongoDB Database** | Primary operational document datastore persisting trips, bookings, dependencies, disruptions, and recovery options. | `mongoose` v9.9.4 | Native MongoDB Wire Protocol (`mongodb://...`) | Standard MongoDB Connection String URI (`MONGODB_URI`) | `src/lib/db.ts`, `src/models/index.ts` | Fully Implemented & Active |
| **ReportLab (Python)** | Offline generator creating authentic PDF e-tickets with barcodes, flight tables, and carrier branding for testing. | `reportlab` (Python package) | Local Python CLI Execution | None | `scripts/generate_pdf.py`, `scripts/generate_europe_pdf.py` | Fully Implemented & Generated |

*Note on Flight / GDS Integrations:* External live airline GDS systems (e.g., Amadeus, Sabre) or flight tracking feeds (e.g., FlightAware, AviationStack) are not directly connected in the current codebase; operational disruptions are generated through Reflow's integrated simulation and testing studio.

---

## 12. DATABASE DOCUMENTATION

### Database Technology & Connection Architecture
- **Database Engine:** MongoDB (Document Store).
- **Object Modeling Framework:** Mongoose v9.9.4.
- **Connection Handler:** `src/lib/db.ts` implements connection caching using a global NodeJS singleton (`(global as any).mongoose`) to prevent socket exhaustion during Next.js serverless execution.
- **Primary Key Strategy:** Explicit String UUIDs (`_id: { type: String, required: true }`) are enforced across all models rather than default MongoDB `ObjectId`s, ensuring deterministic seed data referencing and clean URL routing.

### Database Schema (ASCII Entity-Relationship Diagram)
```text
  ┌────────────────────────────────────────────────────────┐
  │                          Trip                          │
  ├────────────────────────────────────────────────────────┤
  │ _id: String (PK, UUID)                                 │
  │ traveler_name: String                                  │
  │ destination: String                                    │
  │ start_date: String (ISO Date)                          │
  │ end_date: String (ISO Date)                            │
  └──────────────────────────┬─────────────────────────────┘
                             │
            ┌────────────────┼─────────────────────────────┐
            │ 1:N            │ 1:N                         │ 1:N
            ▼                ▼                             ▼
  ┌──────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
  │     Booking      │  │      Dependency      │  │   DisruptionEvent    │
  ├──────────────────┤  ├──────────────────────┤  ├──────────────────────┤
  │ _id: String (PK) │  │ _id: String (PK)     │  │ _id: String (PK)     │
  │ trip_id: String  │  │ trip_id: String      │  │ trip_id: String      │
  │ type: String     │  │ from_booking_id: Str │  │ booking_id: String   │
  │ title: String    │  │ to_booking_id: Str   │  │ type: String         │
  │ location: String │  └──────────────────────┘  │ severity: String     │
  │ start_time: Str  │                            │ description: String  │
  │ end_time: String │                            │ created_at: String   │
  │ cost: Number     │                            └──────────┬───────────┘
  │ refund_pct: Num  │                                       │
  │ status: String   │                                       │ 1:N
  │ position: {x, y} │                                       ▼
  └──────────────────┘                            ┌──────────────────────┐
                                                  │    RecoveryOption    │
                                                  ├──────────────────────┤
                                                  │ _id: String (PK)     │
                                                  │ disruption_id: Str   │
                                                  │ label: String        │
                                                  │ cost_delta: Number   │
                                                  │ time_delta_min: Num  │
                                                  │ convenience_sc: Num  │
                                                  │ pct_affected: Number │
                                                  │ changes: Mixed Array │
                                                  │ selected: Boolean    │
                                                  └──────────────────────┘
```

### Model Schema Definitions

#### 1. `TripModel` (`src/models/index.ts`)
- `_id`: String (UUID, required).
- `traveler_name`: String (required).
- `destination`: String (required).
- `start_date`: String (ISO date string, required).
- `end_date`: String (ISO date string, required).

#### 2. `BookingModel` (`src/models/index.ts`)
- `_id`: String (UUID, required).
- `trip_id`: String (Reference to `Trip`, required).
- `type`: String (`'flight' | 'train' | 'hotel' | 'transfer' | 'activity' | 'event'`, required).
- `title`: String (e.g., `"Flight AA 110 — JFK → FCO"`, required).
- `location`: String (optional, default: `null`).
- `start_time`: String (ISO 8601 string, required).
- `end_time`: String (ISO 8601 string, optional).
- `cost`: Number (Monetary price in USD, required).
- `cancellation_policy`: String (Contractual refund description, optional).
- `refund_percent`: Number (Integer 0 to 100, required).
- `status`: String (`'confirmed' | 'at-risk' | 'disrupted' | 'rebooked' | 'cancelled'`, required).
- `position`: Object (`{ x: Number, y: Number }`, visual canvas coordinates).

#### 3. `DependencyModel` (`src/models/index.ts`)
- `_id`: String (UUID/ObjectId string, required).
- `trip_id`: String (Reference to `Trip`, required).
- `from_booking_id`: String (Reference to antecedent `Booking`, required).
- `to_booking_id`: String (Reference to dependent downstream `Booking`, required).

#### 4. `DisruptionModel` (`src/models/index.ts`)
- `_id`: String (UUID/ObjectId string, required).
- `trip_id`: String (Reference to `Trip`, required).
- `booking_id`: String (Reference to disrupted `Booking`, required).
- `type`: String (`'delay' | 'cancellation' | 'missed-connection' | 'weather' | 'traveler-initiated' | 'transfer-failure'`, required).
- `severity`: String (`'low' | 'medium' | 'high'`, required).
- `description`: String (Plain-language cause explanation, optional).
- `created_at`: String (ISO timestamp, default: `new Date().toISOString()`).

#### 5. `RecoveryOptionModel` (`src/models/index.ts`)
- `_id`: String (UUID/ObjectId string, required).
- `disruption_id`: String (Reference to parent `Disruption`, required).
- `label`: String (Strategy title, e.g., `"Rebook Next Available Flight"`, required).
- `cost_delta`: Number (Net additional expense or refund savings, required).
- `time_delta_minutes`: Number (Net itinerary delay in minutes, required).
- `convenience_score`: Number (Rating between 1 and 5, required).
- `percent_itinerary_affected`: Number (Percentage of trip altered, required).
- `changes`: Array of Objects (`Schema.Types.Mixed`, atomic mutation records specifying `booking_id`, `field`, `old_value`, `new_value`, and `description`).
- `selected`: Boolean (Default: `false`).

### Data Lifecycle & CRUD Operations
- **Creation:** Initiated either through `npm run seed` (`scripts/seed.ts`) for pre-configured demo trips, or dynamically through `POST /api/parse-itinerary` when uploading custom tickets.
- **Reading:** Queried by the dashboard via Next.js API route GET endpoints. All queries utilize `.lean()` for high-throughput serialization without Mongoose document hydration overhead.
- **Modification:** Executed via `POST /api/actions/disruptions` (which modifies booking operational statuses to `disrupted` and `at-risk`) and `POST /api/actions/recovery` (which commits selected plan changes, updating statuses to `rebooked` or `confirmed`).
- **Deletion:** Managed via `POST /api/actions/reset`, which cleanses all `DisruptionModel` and `RecoveryOptionModel` entries for a trip while restoring all booking documents to `status: 'confirmed'`.

---

## 13. AI / ML / INTELLIGENT SYSTEM DOCUMENTATION

### AI Technology Stack
- **Provider:** Google AI.
- **Model:** `gemini-2.5-flash`.
- **SDK:** Official `@google/genai` library (v2.21.0).
- **Execution Location:** Server-side within `recovery/src/app/api/parse-itinerary/route.ts`.

### Document Ingestion & Prompt Architecture
Reflow utilizes multimodal structured extraction. When an e-ticket PDF is uploaded, the document buffer is decoded into text using `pdf-parse`. The text is combined with an engineered extraction prompt and dispatched to Gemini with explicit JSON Schema constraints.

#### Strict JSON Extraction Schema:
```typescript
const bookingSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    type: { type: Type.STRING, enum: ['flight', 'train', 'hotel', 'cab', 'activity'] },
    title: { type: Type.STRING, description: 'e.g., AI-805 DEL-BOM or Taj Hotel Mumbai' },
    location: { type: Type.STRING, description: 'City or specific address' },
    start_time: { type: Type.STRING, description: 'ISO string date time' },
    end_time: { type: Type.STRING, description: 'ISO string date time or null' },
    cost: { type: Type.NUMBER, description: 'Estimated cost in USD if not present' },
    cancellation_policy: { type: Type.STRING },
    refund_percent: { type: Type.NUMBER, description: 'Integer between 0 and 100' },
    status: { type: Type.STRING, enum: ['confirmed', 'cancelled', 'delayed', 'pending'] }
  },
  required: ['type', 'title', 'start_time', 'cost', 'refund_percent', 'status']
};

const tripResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    traveler_name: { type: Type.STRING },
    destination: { type: Type.STRING },
    start_date: { type: Type.STRING, description: 'ISO string date' },
    end_date: { type: Type.STRING, description: 'ISO string date' },
    bookings: { type: Type.ARRAY, items: bookingSchema }
  },
  required: ['traveler_name', 'destination', 'start_date', 'end_date', 'bookings']
};
```

#### Inference Parameters:
- `temperature`: `0.2` (Low temperature configured for deterministic, factual parsing).
- `responseMimeType`: `'application/json'`.
- `responseSchema`: `tripResponseSchema`.

### Division of Responsibility: AI vs. Deterministic Code
To ensure reliability and auditability, Reflow clearly delineates what is AI-powered versus what is governed by deterministic code:

```text
┌────────────────────────────────────────────────────────┐
│             Ingestion & Extraction (AI)                │
│ - Reads unstructured e-ticket PDF text streams         │
│ - Standardizes arbitrary airline date/time strings     │
│ - Extracts passenger names, PNRs, flight numbers       │
└──────────────────────────┬─────────────────────────────┘
                           │ Outputs Structured JSON
                           ▼
┌────────────────────────────────────────────────────────┐
│           Disruption & Recovery Engine (Code)          │
│ - Topological graph construction & positioning         │
│ - Breadth-First Search (BFS) downstream traversal      │
│ - Total cost-at-risk dollar calculations               │
│ - Recovery option generation & ranking formulas        │
│ - Proactive risk connection gap audits (<60 min)       │
└────────────────────────────────────────────────────────┘
```

---

## 14. BUSINESS LOGIC

### 1. Downstream Graph Traversal Algorithm (BFS)
Implemented in `src/lib/disruption-engine.ts` (`getDownstreamBookingIds`):
```typescript
export function getDownstreamBookingIds(
  bookingId: string,
  dependencies: BookingDependency[]
): string[] {
  const downstream: string[] = [];
  const queue = [bookingId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    for (const dep of dependencies) {
      if (dep.from_booking_id === current && !visited.has(dep.to_booking_id)) {
        downstream.push(dep.to_booking_id);
        queue.push(dep.to_booking_id);
      }
    }
  }
  return downstream;
}
```
**Business Rule:** Any booking with a directed path originating from a failed booking is marked as `at-risk`.

### 2. Cumulative Financial Risk Formulation
$$\text{Cost}_{\text{at-risk}} = \text{Cost}(b_{\text{affected}}) + \sum_{b \in V_{\text{downstream}}} \text{Cost}(b)$$
When a booking is disrupted, Reflow computes the total monetary exposure of the failure chain. In the case of cancellations, refund offsets are computed using the contractual `refund_percent`:
$$\text{Refund Amount} = \frac{\text{Cost}(b) \times \text{refund\_percent}}{100}$$

### 3. Domain Strategy Generators
`generateRecoveryOptions()` synthesizes recovery plans based on the disruption category:
- **Delay:**
  1. *Wait It Out:* $\Delta C = 0$, $\Delta T = +120\text{m}$, Convenience = 2.
  2. *Rebook Next Available Flight/Service:* $\Delta C = +\$85$ (flight) or $+\$25$ (other), $\Delta T = +45\text{m}$, Convenience = 4.
  3. *Switch to Alternative Transport (Train/Bus):* $\Delta C = +\$45$, $\Delta T = +90\text{m}$, Convenience = 3.
- **Cancellation:**
  1. *Rebook Same Day:* $\Delta C = +\$120$, $\Delta T = +180\text{m}$, Convenience = 4.
  2. *Cancel Remainder of Day:* $\Delta C = -\text{Refund} + \$60$, $\Delta T = 0$, Convenience = 3.
  3. *Switch to Alternative Route:* $\Delta C = +\$65$, $\Delta T = +120\text{m}$, Convenience = 2.
- **Weather Event:**
  1. *Reschedule to Next Clear Window:* $\Delta C = +\$15$, $\Delta T = +240\text{m}$, Convenience = 3.
  2. *Switch to Indoor Alternative:* $\Delta C = +\$30$, $\Delta T = 0$, Convenience = 4.
  3. *Cancel & Get Full Refund (Weather Policy):* $\Delta C = -\text{Cost}$, $\Delta T = 0$, Convenience = 2.
- **Transfer Failure:**
  1. *Book Rideshare (Uber/Taxi):* $\Delta C = +\$25$, $\Delta T = +15\text{m}$, Convenience = 5.
  2. *Take Public Transit:* $\Delta C = -\text{Cost} + \$5$, $\Delta T = +45\text{m}$, Convenience = 2.
  3. *Wait for Next Transfer Slot:* $\Delta C = 0$, $\Delta T = +60\text{m}$, Convenience = 3.

### 4. Proactive Risk Warnings
Implemented in `computeRiskWarnings()`:
- **Tight Connections:** If two sequential bookings $A \rightarrow B$ have connection time:
  $$0 < T_{\text{start}}(B) - T_{\text{end}}(A) < 60\text{ minutes}$$
  A `tight-connection` risk warning is generated (`severity: 'high'` if gap < 30 minutes; `'medium'` if 30–60 minutes).
- **Non-Refundable Exposures:** If a downstream booking has `refund_percent === 0` and `cost > 100`, a `non-refundable` warning is generated advising travel insurance.

### 5. Preference-Based Ranking Formula
In `src/app/dashboard/page.tsx`, recovery plans are sorted dynamically based on the traveler's preference profile:
- `'lowest-cost'`: Ascending order of `cost_delta`.
- `'fastest-arrival'`: Ascending order of `time_delta_minutes`.
- `'best-convenience'`: Descending order of `convenience_score`.
- `'minimum-disruption'`: Ascending order of `percent_itinerary_affected`.

---

## 15. DATA FLOW

### Detailed End-to-End Simulation Flow
```text
[ User clicks "Simulate Flight Delay" in DisruptionSimulator ]
                            │
                            ▼
[ Component invokes handleTriggerDisruption(bookingId, 'delay', 'high', desc) ]
                            │
                            ▼
[ HTTP POST -> /api/actions/disruptions?tripId=a1b2c3d4... ]
  Body: { bookingId, type: 'delay', severity: 'high', description: '...' }
                            │
                            ▼
[ Server executes /api/actions/disruptions/route.ts ]
  1. DisruptionModel.create({ trip_id, booking_id, type, severity, description })
  2. BookingModel.updateOne({ _id: bookingId }, { status: 'disrupted' })
  3. Loads dependencies and bookings for trip
  4. Calls getDownstreamBookingIds(bookingId, dependencies) -> ['b...02', 'b...03']
  5. BookingModel.updateMany({ _id: { $in: downstreamIds } }, { status: 'at-risk' })
  6. Calls generateRecoveryOptions(disruption, affectedBooking, downstream, bookings)
  7. RecoveryOptionModel.insertMany(optionsToInsert)
                            │
                            ▼
[ Server responds with HTTP 200: DisruptionEvent JSON ]
                            │
                            ▼
[ Client dashboard receives response; triggers loadData() ]
  Promise.all([
    fetchTrip(), fetchBookings(), fetchDependencies(),
    fetchDisruptions(), fetchAllRecoveryOptions()
  ])
                            │
                            ▼
[ Client updates React state: bookings, disruptions, recoveryOptions ]
  - ItineraryGraph: Node 1 turns Red (disrupted), Nodes 2-5 turn Amber (at-risk)
  - ImpactAnalysis: Mounts at bottom, displaying Total Cost at Risk
  - Recovery badge pulses: "3 plans ready"
```

---

## 16. AUTHENTICATION & AUTHORIZATION

### Current Implementation Status: **Mocked / Prototype Mode**
- **User Authentication:** None. The application operates in open prototype mode.
- **Session Management:** Sessions are tracked solely via client-side URL search parameters (`?tripId=...`).
- **Authorization:** No role-based access control (RBAC) or tenant isolation is enforced at the API route layer. Any client can trigger disruptions, query bookings, or reset the demo for any known `tripId`.
- **Planned Architecture:** Standard production roadmap includes NextAuth.js / Auth0 integration utilizing JWT tokens stored in `HttpOnly` cookies, associating trips with a verified `user_id` foreign key.

---

## 17. SECURITY ANALYSIS

### Implemented Security
1. **Separation of Secrets:** Environment variables (`MONGODB_URI`, `GEMINI_API_KEY`) are kept in `.env.local` and excluded from Git tracking via `.gitignore`.
2. **Server-Side API Key Protection:** The Gemini API client and MongoDB connection strings are strictly instantiated within server-side Next.js route handlers (`src/app/api/*`) and are never leaked to the client bundle.
3. **Structured Input Validation in AI Parsing:** The Gemini extraction pipeline enforces strict JSON schema typing (`responseSchema`), neutralizing prompt injection risks by rejecting unstructured or non-conforming responses.

### Potential Security Improvements
1. **API Authentication & Authorization:** Implement JWT or session-based authentication on all `/api/*` endpoints to ensure users can only query and mutate their own itineraries.
2. **Rate Limiting:** Introduce Redis/Upstash rate limiting on `/api/parse-itinerary` to prevent denial-of-service or API quota exhaustion from repeated large PDF uploads.
3. **File Upload Hardening:** Restrict uploaded files strictly to valid PDF MIME types and enforce a hard file size cap (e.g., max 10MB) before buffer processing in `pdf-parse`.
4. **CORS Headers:** Configure explicit cross-origin resource sharing headers in `next.config.ts` if external API access is anticipated.

---

## 18. CONFIGURATION & ENVIRONMENT VARIABLES

| Variable Name | Purpose | Required? | Target Service | Sensitive? |
|---|---|---|---|---|
| `MONGODB_URI` | Defines connection string, host, port, credentials, and database name for the MongoDB cluster. | Yes | MongoDB / Mongoose | Yes (Contains credentials) |
| `GEMINI_API_KEY` | Authentication token for invoking Google Generative AI models (`gemini-2.5-flash`). | Required for dynamic PDF ingestion | Google AI Studio | Yes (Secret API key) |

*Template configuration is maintained in `recovery/.env.example`.*

---

## 19. DEPENDENCIES

### Core Runtime Dependencies (`package.json`)

| Dependency | Version | Purpose | Actual Usage Location |
|---|---|---|---|
| `next` | `16.3.4` | App Router web framework, SSR, and API route handlers. | Framework core |
| `react` | `19.2.8` | Core UI component rendering library. | Framework core |
| `react-dom` | `19.2.8` | React DOM renderer. | Framework core |
| `typescript` | `^5` | Static typing system. | Entire codebase |
| `mongoose` | `^9.9.4` | MongoDB Object Document Mapper (ODM). | `src/lib/db.ts`, `src/models/index.ts`, `scripts/seed.ts` |
| `@xyflow/react` | `^12.11.6` | Interactive node-based canvas for directed acyclic graph visualization. | `src/components/itinerary-graph.tsx`, `src/components/booking-node.tsx` |
| `@google/genai` | `^2.21.0` | Official Google Gemini SDK for multimodal structured LLM extraction. | `src/app/api/parse-itinerary/route.ts` |
| `pdf-parse` | `^2.4.5` | PDF text extraction engine parsing binary buffers. | `src/app/api/parse-itinerary/route.ts` |
| `framer-motion` | `^13.1.1` | Spring physics animations, layout transitions, and dialog animations. | Landing page, dashboard panels, loaders |
| `lucide-react` | `^1.39.0` | SVG iconography system. | Across all frontend components |
| `sonner` | `^2.0.8` | Toast notification management. | `src/app/layout.tsx`, dashboard user feedback |
| `uuid` | `^14.0.2` | Cryptographically secure UUID generator for trips and bookings. | `src/app/api/parse-itinerary/route.ts` |
| `recharts` | `^3.10.1` | SVG chart library for data visualization. | `src/components/risk-radar.tsx`, `src/components/recovery-chart.tsx` |
| `clsx` | `^2.1.1` | Utility for constructing conditional class name strings. | `src/lib/utils.ts` |
| `tailwind-merge` | `^3.6.0` | Merges Tailwind classes without style conflict bugs. | `src/lib/utils.ts` |
| `dotenv` | `^17.4.2` | Environment variable loader for external TypeScript scripts. | `scripts/seed.ts` |

### Development Dependencies

| Dependency | Version | Purpose |
|---|---|---|
| `@tailwindcss/postcss` | `^4` | PostCSS plugin for Tailwind CSS v4. |
| `tailwindcss` | `^4` | Utility-first CSS framework. |
| `eslint` | `^9` | Code linter. |
| `eslint-config-next` | `16.3.4` | Next.js linting configuration. |
| `@types/node` | `^20` | Node.js type definitions. |
| `@types/react` | `^19` | React type definitions. |
| `@types/react-dom` | `^19` | React DOM type definitions. |
| `@types/pdf-parse` | `^1.1.5` | TypeScript types for `pdf-parse`. |
| `@types/uuid` | `^10.0.0` | TypeScript types for `uuid`. |

---

## 20. IMPORTANT FUNCTIONS & CLASSES

| Name | Type | File | Purpose | Inputs | Outputs |
|---|---|---|---|---|---|
| `getDownstreamBookingIds` | Pure Function | `src/lib/disruption-engine.ts` | Executes BFS traversal over dependency edges to isolate all affected downstream bookings. | `bookingId: string`, `dependencies: BookingDependency[]` | `string[]` (Array of downstream booking IDs) |
| `computeImpactAnalysis` | Pure Function | `src/lib/disruption-engine.ts` | Calculates direct impact reasons, downstream cascade causes, and total dollar cost at risk. | `disruption: DisruptionEvent`, `bookings: Booking[]`, `dependencies: BookingDependency[]` | `ImpactAnalysis` |
| `generateRecoveryOptions` | Pure Function | `src/lib/disruption-engine.ts` | Synthesizes deterministic recovery strategies based on failure archetype. | `disruption`, `affectedBooking`, `downstreamBookings`, `allBookings` | Array of `RecoveryOption` |
| `computeRiskWarnings` | Pure Function | `src/lib/disruption-engine.ts` | Audits connection time buffers (<60 min) and non-refundable downstream items. | `bookings: Booking[]`, `dependencies: BookingDependency[]` | Array of `RiskWarning` |
| `dbConnect` | Async Function | `src/lib/db.ts` | Establishes and caches the MongoDB database connection via Mongoose singleton. | None | `Promise<mongoose.Connection>` |
| `createDisruption` | Async Function | `src/lib/queries.ts` | Dispatches POST request to inject disruption event. | `bookingId`, `type`, `severity`, `description`, `tripId` | `Promise<DisruptionEvent \| null>` |
| `selectRecoveryOption` | Async Function | `src/lib/queries.ts` | Dispatches POST request to apply chosen recovery plan. | `optionId: string` | `Promise<boolean>` |
| `resetDemo` | Async Function | `src/lib/queries.ts` | Dispatches POST request to clear disruptions and restore bookings to confirmed. | `tripId?: string` | `Promise<boolean>` |
| `POST` | Next.js Handler | `src/app/api/parse-itinerary/route.ts` | Ingests PDF/text, runs Gemini 2.5 Flash extraction, and saves Trip, Bookings, and Dependencies. | `req: NextRequest` (FormData) | `Promise<NextResponse>` (`{ tripId }`) |
| `POST` | Next.js Handler | `src/app/api/actions/disruptions/route.ts` | Records disruption, updates target to disrupted, marks downstream at-risk, and generates options. | `request: NextRequest` | `Promise<NextResponse>` |

---

## 21. ERROR HANDLING

1. **Client-Side Notifications:** Component errors and operational exceptions (e.g., "Failed to load trip data", "Failed to trigger disruption") trigger immediate notifications via `sonner` toasts with error descriptions.
2. **AI Ingestion Guardrails:** In `src/app/api/parse-itinerary/route.ts`:
   - Returns HTTP 400 (`{ error: 'No text or valid PDF provided' }`) if input payload is empty.
   - Returns HTTP 500 (`{ error: 'Server misconfiguration: Missing GEMINI_API_KEY' }`) if environment key is missing.
   - Catches Gemini API exceptions and returns HTTP 500 with the error message.
3. **Database Fallbacks:** If MongoDB is unavailable or fails connection, API route handlers log the error and return HTTP 500 (`{ error: 'Internal Server Error' }`).
4. **Client Loading States:** The dashboard features full-screen loading gates (`ReflowLoader`) preventing null reference exceptions prior to asynchronous data completion.

---

## 22. LOGGING & MONITORING

- **Server Console Logging:** API route handlers implement `console.error('Error fetching trip:', error)` logging stack traces to the Node.js server terminal.
- **Client Console Logging:** `src/lib/queries.ts` logs HTTP fetch failures via `console.error()`.
- **System Activity Feed:** The Alerts Center (`src/components/views/alerts-view.tsx`) provides an in-app operational log detailing recent events (e.g., *"Itinerary loaded successfully — 12 bookings synced from the database"*).

---

## 23. TESTING

### Current Testing Infrastructure: **Manual Scripts & Demonstration Data**
- **Automated Unit Tests (Jest / Vitest):** None currently present in the codebase.
- **Automated E2E Tests (Playwright / Cypress):** None currently present.
- **Verification Scripts:**
  - `recovery/scripts/seed.ts`: Verifies MongoDB schema compliance, foreign key integrity, and seed insertion.
  - `recovery/scripts/generate_pdf.py`: Verifies PDF formatting and ReportLab styling.
  - `recovery/scripts/generate_europe_pdf.py`: Verifies European multi-carrier PDF generation.

---

## 24. PERFORMANCE

1. **Lean Database Serialization:** All Mongoose queries across API routes use `.lean()`, bypassing Mongoose document instance hydration and reducing memory overhead and JSON serialization latency.
2. **Client-Side Polling Architecture:** The dashboard maintains synchronization via an efficient 5-second polling interval (`setInterval(loadData, 5000)`), balancing data freshness with minimal database connection load.
3. **Memoized Node Calculations:** React Flow node layouts and risk calculations are wrapped in React `useMemo` hooks, preventing unnecessary canvas re-renders during unrelated UI state changes.
4. **Local Storage Caching:** User preferences (sorting priorities, budget caps, transport toggles) are cached in `localStorage`, eliminating network round-trips for preference reads.

---

## 25. SCALABILITY

### Existing Scalability Mechanisms
- **Stateless Server Architecture:** Next.js Route Handlers are stateless, allowing horizontal scaling across container clusters or serverless platforms (Vercel, AWS ECS, GCP Cloud Run).
- **Global Connection Pooling:** MongoDB connections are preserved across hot reloads and serverless invocations via the global connection cache in `src/lib/db.ts`.

### Scalability Limitations
- **Client Polling Overhead:** Active 5-second polling per active user will scale linearly with traffic. A production upgrade should replace polling with WebSockets or Server-Sent Events (SSE).
- **In-Memory Graph Traversal:** While BFS traversal of a 15-node itinerary takes <1 millisecond, large corporate itineraries with hundreds of segments should execute traversal within a distributed worker or Redis graph.

---

## 26. DEPLOYMENT

### Production Build & Execution Architecture
Reflow is fully containerizable and deployable to any standard Node.js hosting provider:
- **Build Step:** `npm run build` compiles client components with Turbopack and verifies TypeScript integrity.
- **Production Server:** `npm run start` launches the Next.js production server on port 3000.
- **Cloud Compatibility:** Compatible with Vercel, AWS Amplify, Docker containers, and Google Cloud Run.

---

## 27. LOCAL DEVELOPMENT SETUP

### Prerequisites
- Node.js 20+ (LTS recommended)
- MongoDB server running locally at `mongodb://127.0.0.1:27017` (or MongoDB Atlas connection URI)
- Python 3.x (optional, only for running PDF generation scripts)
- Google Gemini API Key (for testing dynamic AI PDF parsing)

### Step-by-Step Instructions

1. **Clone the Repository:**
   ```bash
   git clone <repo-url>
   cd Travel-Disruption-Recovery-Engine-1/recovery
   ```

2. **Install Node Dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create `.env.local` inside the `recovery/` folder:
   ```env
   MONGODB_URI=mongodb://127.0.0.1:27017/reflow
   GEMINI_API_KEY=your_google_gemini_api_key_here
   ```

4. **Seed the Database:**
   Ensure MongoDB is running, then execute:
   ```bash
   npm run seed
   ```

5. **Start the Development Server:**
   ```bash
   npm run dev
   ```

6. **Access the Application:**
   Open your browser to [http://localhost:3000](http://localhost:3000).

---

## 28. BUILD & EXECUTION COMMANDS

| Command | Working Directory | Purpose |
|---|---|---|
| `npm run dev` | `recovery/` | Launches Next.js development server with Turbopack on `http://localhost:3000`. |
| `npm run build` | `recovery/` | Compiles optimized Next.js production bundle. |
| `npm run start` | `recovery/` | Runs compiled Next.js production server. |
| `npm run lint` | `recovery/` | Executes ESLint 9 validation across all project files. |
| `npm run seed` | `recovery/` | Runs `scripts/seed.ts` via `npx tsx` to seed MongoDB with initial trips and bookings. |
| `python generate_pdf.py` | `recovery/scripts/` | Generates sample Air India PDF e-ticket. |
| `python generate_europe_pdf.py` | `recovery/scripts/` | Generates sample ITA Airways European PDF e-ticket. |

---

## 29. GIT & VERSION CONTROL STRUCTURE

### Root `.gitignore` & `recovery/.gitignore` Rules
The repository ignores:
- `node_modules/` (Vendor packages)
- `.next/` (Next.js build artifacts)
- `.env`, `.env.local`, `*.local` (Secrets and credentials)
- `npm-debug.log*`, `yarn-debug.log*`, `pnpm-debug.log*`
- `.DS_Store`
- Python `__pycache__/` and `*.pyc`

---

## 30. ASSETS & STATIC RESOURCES

1. `recovery/public/Air_India_Delhi_Mumbai_Goa_E-Ticket.pdf` & `recovery/public/ITA_Airways_Rome_Naples_Confirmed_Tickets.pdf`: Static sample e-ticket PDFs available for direct client testing and download.
2. `public/*.svg`: Core branding and UI icons (`globe.svg`, `file.svg`, `window.svg`, `next.svg`, `vercel.svg`).
3. `src/app/favicon.ico`: Application browser tab icon.

---

## 31. THIRD-PARTY LIBRARIES — ACTUAL USAGE

- **`@xyflow/react`:** Core visualization engine powering `src/components/itinerary-graph.tsx`. Provides canvas zoom/pan mechanics, layout handles, node type registries, and SVG edge markers.
- **`@google/genai`:** Imported in `src/app/api/parse-itinerary/route.ts` to query Gemini 2.5 Flash for multimodal document extraction.
- **`pdf-parse`:** CommonJS library required in `src/app/api/parse-itinerary/route.ts` to parse uploaded binary PDF buffers into plain text.
- **`framer-motion`:** Handles UI layout transitions, expandable drawer physics (`ImpactAnalysisPanel`), drag/resize mechanics (`BookingDetailPanel`), and 3D loader scenes (`ReflowLoader`).
- **`recharts`:** Imported in `src/components/risk-radar.tsx` for multi-axis radar chart rendering of itinerary risk dimensions.
- **`sonner`:** Toast alert system instantiated in root layout (`src/app/layout.tsx`) and triggered across components for user feedback.

---

## 32. IMPLEMENTATION STATUS AUDIT

| Component / Subsystem | Expected Purpose | Actual Implementation Status | Evidence / File |
|---|---|---|---|
| **Marketing Landing Page** | Promote product, display journey previews, host entry points. | **Fully Implemented** | `src/app/page.tsx` |
| **Itinerary Ingestion Modal** | Accept PDF uploads or JSON text blocks. | **Fully Implemented** | `src/app/page.tsx` |
| **Dynamic AI Itinerary Parser** | Parse uploaded arbitrary PDFs via Gemini AI and save to MongoDB. | **Fully Implemented** (Requires API Key) | `src/app/api/parse-itinerary/route.ts` |
| **Interactive Itinerary DAG** | Render interactive nodes and animated dependency edges. | **Fully Implemented** | `src/components/itinerary-graph.tsx` |
| **Draggable Detail HUD** | Floating, resizable booking inspector. | **Fully Implemented** | `src/components/booking-detail-panel.tsx` |
| **Disruption Simulation Studio** | Inject 12 failure scenarios with category filtering. | **Fully Implemented** | `src/components/disruption-simulator.tsx` |
| **Impact Analysis HUD** | Calculate capital at risk and ripple effects. | **Fully Implemented** | `src/components/impact-analysis.tsx` |
| **Recovery Strategy Engine** | Synthesize and rank multi-path resolution strategies. | **Fully Implemented** | `src/components/recovery-options.tsx` |
| **Proactive Risk Monitor** | Audit tight connections (<60m) and non-refundable deposits. | **Fully Implemented** | `src/components/views/risk-monitor-view.tsx` |
| **Alerts Center** | Manage disruption notifications and system updates. | **Fully Implemented** | `src/components/views/alerts-view.tsx` |
| **Recovery Preferences** | Custom ranking and budget cap settings. | **Fully Implemented** | `src/context/preferences-context.tsx` |
| **Executive Dashboard Overview**| High-level operational health gauge and timeline. | **Fully Implemented** | `src/components/views/dashboard-overview.tsx` |
| **MongoDB Document Layer** | Store and query trips, bookings, dependencies, and options. | **Fully Implemented** | `src/models/index.ts`, `src/lib/db.ts` |
| **Live Flight Tracking Feeds** | Consume real-time FAA / AviationStack webhooks. | **Simulated / Mocked** | Scenarios simulated via `disruption-simulator.tsx` |
| **User Authentication / IAM** | Multi-tenant user login, signup, JWT sessions. | **Planned / Prototype** | Open single-tenant prototype routing |

---

## 33. PROJECT LIMITATIONS

1. **Simulation vs. Live Telemetry:** Disruptions are injected via user selection in the Disruption Simulator rather than automated background polling of live airline GDS or FlightRadar24 APIs.
2. **Prototype Authentication:** The application currently relies on unauthenticated URL parameter trip routing (`?tripId=...`).
3. **Polling vs. WebSocket Push:** Dashboard state updates are polled every 5 seconds rather than broadcast instantly via WebSocket server events.
4. **Linear Positioning Assumption:** The AI itinerary parser currently lays out newly generated booking nodes along a simple linear X-axis (`x: colIdx * 350, y: 150`), whereas complex branching multi-city trips benefit from hierarchical topological layout algorithms.

---

## 34. TECHNICAL DEBT

1. **Duplicate Lockfiles:** Root directory contains `package-lock.json` while `recovery/` contains its own `package-lock.json`, causing Turbopack root workspace detection warnings during builds.
2. **Next.js Turbopack Workspace Root Warning:** Next.js issues a warning regarding workspace root inference due to multiple lockfile presence.
3. **CommonJS Import in ES Module Route:** `src/app/api/parse-itinerary/route.ts` utilizes `const pdfParse = require('pdf-parse');` due to `pdf-parse` v2 lacking a standard ESM default export in Next.js Turbopack.

---

## 35. FUTURE IMPROVEMENTS

### Immediate Improvements (Next Sprint)
1. **Remove Root Lockfile:** Remove redundant `package-lock.json` in repository root to silence Turbopack workspace warnings.
2. **WebSocket Integration:** Replace 5-second HTTP polling with a lightweight WebSocket or Server-Sent Events (SSE) stream for real-time multi-client synchronization.
3. **Automated Unit Tests:** Add Vitest or Jest test suites for `src/lib/disruption-engine.ts` verifying BFS traversal and recovery plan formulas.

### Medium-Term Improvements
1. **NextAuth / Supabase Authentication:** Implement secure authentication with user accounts, allowing travelers to manage multiple historical and upcoming trips.
2. **Live FlightAware / AviationStack Webhooks:** Connect real flight numbers to live aviation status APIs to trigger automated disruption events when flights are delayed in the real world.
3. **Automated Dagre Graph Layout:** Integrate the Dagre layout engine into `itinerary-graph.tsx` to automatically calculate optimal tree coordinates for complex multi-modal itineraries.

### Long-Term Improvements
1. **Automated Airline GDS Rebooking:** Integrate airline NDC / GDS APIs (Amadeus, Sabre) to execute real-time ticket re-issuance upon one-click recovery approval.
2. **Travel Insurance Claim Automation:** Automatically export disruption audit trail and expense proofs as signed PDF claim packages for travel insurance reimbursement.

---

## 36. COMPLETE PROJECT DEPENDENCY MAP

```text
                                [ User Ingestion Input ]
                                            │
                                            ▼
                    ┌───────────────────────────────────────────────┐
                    │            src/app/page.tsx                   │
                    │        (Landing Page & Upload Modal)          │
                    └───────────────────────┬───────────────────────┘
                                            │
                                            ▼
                    ┌───────────────────────────────────────────────┐
                    │      src/app/api/parse-itinerary/route.ts     │
                    │       (@google/genai + pdf-parse)             │
                    └───────────────────────┬───────────────────────┘
                                            │
                                            ▼
                    ┌───────────────────────────────────────────────┐
                    │               MongoDB Database                │
                    │        (via src/lib/db.ts & src/models)       │
                    └───────────────────────┬───────────────────────┘
                                            │
                                            ▼
                    ┌───────────────────────────────────────────────┐
                    │          src/app/dashboard/page.tsx           │
                    │             (Dashboard Controller)            │
                    └───────┬───────────────┼───────────────┬───────┘
                            │               │               │
                            ▼               ▼               ▼
                   ┌────────────────┐┌────────────┐┌────────────────┐
                   │ ItineraryGraph ││ Simulator  ││ RecoveryOptions│
                   │ (@xyflow/react)││(Scenarios) ││  (Trade-offs)  │
                   └───────┬────────┘└─────┬──────┘└────────┬───────┘
                           │               │                │
                           └───────────────┼────────────────┘
                                           │
                                           ▼
                    ┌───────────────────────────────────────────────┐
                    │          src/lib/disruption-engine.ts         │
                    │      (BFS Traversal, Impact, Risk Logic)      │
                    └───────────────────────────────────────────────┘
```

---

## 37. COMPLETE PROJECT FLOW — MASTER VIEW

```text
[ Traveler / User ]
       │
       ├─► 1. Opens Reflow at http://localhost:3000
       │
       ├─► 2. Uploads Airline E-Ticket PDF or pastes PNR confirmation JSON
       │      │
       │      ▼
       │   [ Next.js API: POST /api/parse-itinerary ]
       │      ├── pdf-parse extracts raw document text
       │      ├── Google Gemini 2.5 Flash extracts structured JSON
       │      └── Mongoose persists Trip, Bookings, and Dependencies in MongoDB
       │      │
       │      ▼
       ├─► 3. Redirects to /dashboard?tripId={generated_trip_id}
       │      │
       │      ▼
       │   [ Dashboard Data Synchronization (src/lib/queries.ts) ]
       │      ├── Fetches Trip details, Bookings, Dependencies, Disruptions, Options
       │      └── Establishes 5-second background polling cycle
       │
       ├─► 4. Explores Itinerary Canvas
       │      ├── Pan/zoom interactive DAG rendered via @xyflow/react
       │      ├── Inspects individual booking details in draggable/resizable HUD
       │      └── Audits connection safety in Proactive Risk Monitor
       │
       ├─► 5. Simulates Disruption (or receives real operational failure)
       │      ├── Selects scenario in Disruption Simulator (e.g., Flight Delay)
       │      ├── Clicks target booking node on the canvas
       │      └── Dispatches POST /api/actions/disruptions
       │
       ├─► 6. Disruption Engine Traversal & Impact Calculation
       │      ├── BFS traversal flags all downstream bookings as "at-risk"
       │      ├── Computes total dollar capital exposed
       │      ├── Synthesizes 3 distinct contingency strategies
       │      └── Slides up Impact Analysis HUD showing cascade ripple effect
       │
       ├─► 7. Contingency Selection & Resolution
       │      ├── Reviews ranked recovery options (Cost Δ, Time Δ, Convenience Score)
       │      ├── Evaluates options against user's Recovery Preferences
       │      ├── Clicks "Apply Recovery Plan"
       │      └── Dispatches POST /api/actions/recovery
       │
       └─► 8. Automated State Resolution
              ├── Atomic database updates rebook/confirm affected segments
              ├── Visual DAG clears red/amber alerts to green/blue
              └── Trip Health ring returns to 100%
```

---

## 38. TECHNICAL GLOSSARY

| Term | Technical Meaning in Reflow |
|---|---|
| **Booking** | A discrete scheduled travel reservation (flight, train, hotel, shuttle, tour) with fixed departure/arrival times, financial costs, and refund rules. |
| **Dependency Edge** | A directed relationship $(A \rightarrow B)$ signifying that booking $B$ logistically or temporally depends upon the successful completion of booking $A$. |
| **Disrupted Status** | An operational state indicating that a booking has suffered an active failure (delayed, cancelled, or broken). |
| **At-Risk Status** | An operational state applied to any booking downstream of a disrupted booking whose arrival buffer or connection viability is now endangered. |
| **Rebooked Status** | An operational state indicating that a booking has been replaced or adjusted by a successfully applied recovery plan. |
| **Cascade Effect** | The propagation of operational failure through sequential travel bookings caused by the failure of an antecedent booking. |
| **BFS Traversal** | Breadth-First Search graph algorithm used by Reflow to trace all reachable downstream vertices from a failed node. |
| **Cost at Risk** | The aggregate dollar value of the disrupted booking plus all downstream bookings currently in jeopardy. |
| **Recovery Option** | A synthesized multi-booking remediation plan detailing exact field changes, net cost delta, time impact, and convenience score. |
| **Convenience Score** | A qualitative rating on a 1–5 scale evaluating the comfort, simplicity, and stress level of a proposed recovery option. |
| **Tight Connection** | A proactive risk condition triggered when the scheduled buffer between two consecutive segments is less than 60 minutes. |

---

## 39. QUICK REFERENCE

- **Project Name:** Reflow (Travel Disruption Recovery Engine)
- **Primary Framework:** Next.js 16.3.4 (App Router), React 19.2.8, TypeScript 5
- **Visual Canvas:** `@xyflow/react` v12.11.6
- **Database:** MongoDB via Mongoose v9.9.4
- **AI Integration:** `@google/genai` v2.21.0 (Gemini 2.5 Flash)
- **Document Processing:** `pdf-parse` v2.4.5
- **Animation & Styling:** Tailwind CSS v4, `framer-motion` v13.1.1, `sonner` v2.0.8
- **Default Port:** `http://localhost:3000`
- **Primary Dev Command:** `cd recovery && npm run dev`
- **Database Seed Command:** `cd recovery && npm run seed`
- **Key Files:**
  - `src/app/page.tsx` — Landing page & upload gateway
  - `src/app/dashboard/page.tsx` — Operations dashboard controller
  - `src/lib/disruption-engine.ts` — Pure graph algorithm & strategy engine
  - `src/app/api/parse-itinerary/route.ts` — AI multimodal PDF parser
  - `src/models/index.ts` — Mongoose schema models
- **Required Environment Variables:**
  - `MONGODB_URI`: MongoDB connection string
  - `GEMINI_API_KEY`: Google AI Studio API key

---

## 40. FINAL FACTUAL AUDIT

- [x] Every repository folder inspected (`recovery/`, `scripts/`, `src/app`, `src/components`, `src/lib`, `src/models`, `src/types`).
- [x] Every source file, configuration file, and package manifest verified against actual code.
- [x] All 9 API routes documented with accurate HTTP methods, payloads, and handlers.
- [x] Pure graph traversal algorithms (`getDownstreamBookingIds`, `computeImpactAnalysis`, `generateRecoveryOptions`) verified.
- [x] Mongoose models (`TripModel`, `BookingModel`, `DependencyModel`, `DisruptionModel`, `RecoveryOptionModel`) inspected and documented.
- [x] AI integration verified in `src/app/api/parse-itinerary/route.ts` using `@google/genai` Gemini 2.5 Flash and `pdf-parse`.
- [x] Distinction between implemented features, simulated feeds, and prototype authentication explicitly stated.
- [x] Zero secrets, passwords, or API keys exposed.
- [x] File created at `REFLOW_COMPLETE_PROJECT_DOCUMENTATION.md` without modifying any existing project source files.
