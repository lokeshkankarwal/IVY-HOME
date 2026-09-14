# Ivy Homes — Verified Real Estate & Discovery Platform

A full-stack property discovery, CRM, and transaction platform for Bengaluru real estate, built with an empirical data auditing engine that tests, analyzes, and bridges discrepancies between documented API contracts and live running service behavior.

---

## 1. System Architecture & Tech Stack

- **Frontend (`client/`)**:
  - React 19 + TypeScript + Vite
  - Tailwind CSS + typography (`Fraunces` serif + `Source Sans 3`)
  - React Router v7 (clean URL routing for properties, rentals, projects, insights, customer, seller, and admin areas)
  - Leaflet + React-Leaflet + OpenStreetMap (interactive map views with custom pins and popups)
  - Context-based Auth Provider with persistent cookies and automatic re-authentication

- **Backend (`server/`)**:
  - Node.js (ESM) + Express 5 + TypeScript
  - PostgreSQL + Prisma ORM
  - JWT authentication stored in HTTP-only cookies (`token` and `ivy_token`)
  - Role-Based Access Control (RBAC) strictly enforced on API routes
  - Multer file uploads for property photo galleries
  - Nodemailer email verification with 6-digit OTPs (supports SMTP or development console transport)

- **Investigation Engine (`investigation/`)**:
  - Standalone TypeScript runner (`investigation/src/run.ts`)
  - Complete collection paging with offset/limit detection
  - Deterministic anomaly detection (corrupt physical records, enquiry-bait fake listings, clone deduplication)
  - Discrepancy detector matching documented vs actual API behavior with reproduction evidence
  - Generates valid `submission.json` and internal analytical summaries

---

## 2. Roles & Authorization Rules

The platform enforces strict role separation at the database and API middleware levels:

### `CUSTOMER`
- Self-registration with email verification via OTP.
- Browse properties for sale, rentals, and builder projects.
- Search and filter by locality, BHK, price range, furnishing, and property type (client-side verified).
- View individual property details with multi-photo gallery and interactive Leaflet map.
- Save properties to favourites (persists in database across re-login).
- Add direct properties to transactional cart.
- Schedule in-person property tours with seller representative.
- View official purchase orders and closing records.

### `SELLER`
- Agency/seller registration with company name and email OTP.
- **Account status starts as `PENDING_VERIFICATION` / `PENDING_APPROVAL`**: Seller cannot publish or manage live inventory until reviewed and approved by a Superadmin.
- Comprehensive Seller CRM Dashboard:
  - Inventory metrics: Total properties, active listings, customer leads, and tour counts.
  - Client interest level pipeline: `HIGH` (hot buyer), `MEDIUM` (exploring), `LOW` (casual).
  - Upcoming scheduled property tours.
  - Interaction history stream: Calls, WhatsApp conversations, site visits, follow-up notes.
- Property Management:
  - Add and edit listings with full specifications (BHK, carpet area, SBA, furnishing, floor, parking, coords).
  - Upload multiple property photos (JPEG, PNG, WebP < 5MB).
  - Select and switch primary thumbnail image.
  - Activate or deactivate listings.
  - **Strict Security Rule**: Sellers **CANNOT** mark properties as `SOLD`. Any seller attempt to call the sold endpoint is rejected by backend RBAC with `403 Forbidden`.

### `SUPERADMIN`
- Platform Owner console (`admin@ivy.local`).
- Seller application vetting: Approve, Reject (with reason), or Suspend seller agencies.
- Inventory oversight across all sellers and builders.
- **Exclusive Authority to mark properties as `SOLD`**: Transitions status to `SOLD`, evicts active cart items, automatically generates an official Order record, and logs an immutable audit event.
- Immutable System Audit Trail (`/admin/audit`): Logs all privileged actions, status transitions, and timestamps.

---

## 3. Quick Start & Run Instructions

### Prerequisites
- Node.js 18+ (tested on Node v24)
- PostgreSQL running locally (configured on port `5433` or `5432`)
- Git

### Step 1 — Clone and Install Dependencies
```bash
git clone <repo-url>
cd "ivy project"
npm install
```

### Step 2 — Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Edit `.env` and verify your Postgres database URL and Ivy credentials:
```env
DATABASE_URL="postgresql://<user>@localhost:5433/ivy_homes"
PORT=4000
NODE_ENV=development
JWT_SECRET=super-secret-key-ivy-homes
CLIENT_ORIGIN=http://localhost:5173

# Ivy Homes API
IVY_BASE_URL=https://solve.ivy.homes
IVY_API_KEY=IVY26-XXXXXXXXXXXX          # Your key from solve.ivy.homes/register
IVY_ASSIGNED_LOCALITY=whitefield         # From your registration email
IVY_DEMO_PASSWORD=                      # Demo user password from registration email

# Candidate details for submission.json
CANDIDATE_NAME=Lokesh Kumar Kankarwal
CANDIDATE_EMAIL=you@example.com
CANDIDATE_REPO_URL=https://github.com/you/ivy-assignment
CANDIDATE_DEMO_URL=https://your-app.vercel.app

# Seeded Superadmin
SUPERADMIN_EMAIL=admin@ivy.local
SUPERADMIN_PASSWORD=Admin123!
```

### Step 3 — Database Setup & Seeding
Push the Prisma schema to PostgreSQL and seed default accounts:
```bash
npm run db:migrate    # or: npx prisma db push --schema=server/prisma/schema.prisma
npm run db:seed
```

**Seeded Credentials:**
| Role | Email | Password |
| --- | --- | --- |
| **Superadmin** | `admin@ivy.local` | `Admin123!` |
| **Approved Seller** | `seller@ivy.local` | `Seller123!` |
| **Customer** | `customer@ivy.local` | `Customer123!` |
| **Ivy Demo Users** | `demo1@ivy.homes`, `demo2@ivy.homes`, `demo3@ivy.homes` | (Your Ivy password) |

### Step 4 — Run Development Servers
Start both backend (port 4000) and frontend (port 5173) concurrently:
```bash
npm run dev
```
Or start individually:
```bash
npm run dev:server    # http://localhost:4000
npm run dev:client    # http://localhost:5173
```
Open **http://localhost:5173** in your browser.

### Step 5 — Run the Investigation & Generate `submission.json`
Run the empirical data investigation against the live Ivy API:
```bash
npm run investigate
```
This performs a full pull of retrievable listings, rentals, and projects, tests all documented endpoints, calculates the 10 assignment answers, detects corrupt and fake listings, checks project consistency, and writes:
- `submission.json` (at workspace root)
- `investigation/output/answers.json`
- `investigation/output/findings.json`
- `investigation/discovery/*` (endpoint probes)

### Step 6 — Production Build & Typecheck
```bash
npm run build
npm run typecheck -w server
npm run typecheck -w client
```

---

## 4. The 10 Assignment Questions & Methodology

All calculations anchor to:
$$\text{REFERENCE} = \text{2026-09-10T00:00:00+05:30 (IST)}$$

| # | Answer Key | Description & Methodology |
| --- | --- | --- |
| 1 | `total_listing_records` | Paged completely through `GET /v1/listings` until `has_more === false` or 0 records returned. |
| 2 | `unique_properties` | Computed by deduplicating records across canonical keys: `property_id` if present, else normalized `listing_url`, else a composite fingerprint: `[apartment_name, locality, bedroom, floor, carpet_area, price, latitude, longitude]`. |
| 3 | `active_listings` | Exact count of retrievable listing records where `is_live === true`. |
| 4 | `corrupt_listing_ids` | Deterministically detected records violating physical reality: negative prices, negative areas, `carpet_area > super_built_up_area`, `floor > total_floors`, coordinates outside India ($6^\circ < \text{lat} < 37^\circ, 68^\circ < \text{lon} < 98^\circ$), or zero area & price. Sorted by `listing_id`. |
| 5 | `total_monthly_rent` | Sum of `price` across all rental records in the assigned locality (e.g. `whitefield`). |
| 6 | `avg_price_per_sqft_2bhk` | Mean of $\frac{\text{price}}{\text{carpet\_area}}$ across records where `is_live === true` and `bedroom === 2`, strictly excluding records identified in `corrupt_listing_ids` and `fake_listing_ids`. Rounded to 2 decimal places. |
| 7 | `costliest_project` | Project with maximum `price_max`, returned as `{"project_id": "...", "price_max_inr": ...}`. |
| 8 | `listings_last_7_days` | Count of retrievable listings where `posted_at` falls in the IST window $[\text{REFERENCE} - 7\text{ days}, \text{REFERENCE})$. Handles both UTC `Z` timestamps and explicit offsets. |
| 9 | `fake_listing_ids` | Lead-generation enquiry bait detected by: recurring seller contact numbers across high-frequency listings, cloned text descriptions across disparate localities, and impossible $\text{₹/sqft}$ ($< 200$ or $> 100,000$). Sorted by `listing_id`. |
| 10 | `projects_with_wrong_listing_count` | Number of builder projects where reported `total_listings` disagrees with the count of retrievable listings carrying that `project_id`. |

---

## 5. API Discrepancy Findings (Documented vs Actual)

Our investigation sweep revealed multiple critical discrepancies between `API_REFERENCE.md` and the running service:

1. **Authentication Parameter Rejected (`category: auth`)**:
   - *Documented*: Append key as query parameter `?api_key=IVY26-XXXXXXXXXXXX`.
   - *Actual*: Returns `401 Unauthorized` with detail: `"send your key in the X-API-Key request header, not as a query parameter"`.
   - *Impact*: Any client following the documentation fails to authenticate. The backend was configured to pass `X-API-Key` headers.

2. **Server Timestamps with IST Offset (`category: timestamps`)**:
   - *Documented*: "Timestamps are ISO 8601, UTC, Z suffix, everywhere in the API".
   - *Actual*: `GET /health` returns explicit IST offset (`+05:30`), e.g. `2026-09-14T20:53:19.828241+05:30`.
   - *Impact*: Code expecting trailing `Z` can miscalculate date intervals by 5.5 hours.

3. **Singular Listing Endpoint 404 (`category: missing_endpoint`)**:
   - *Documented*: `GET /v1/listing/{listing_id}`.
   - *Actual*: Returns `404 Not Found`. The operational route is plural `GET /v1/listings/{id}`.
   - *Impact*: Single listing detail views break if relying on documented route. Proxy handles fallback transparently.

4. **Analytics Summary Endpoint 404 (`category: missing_endpoint`)**:
   - *Documented*: `GET /v1/analytics/summary`.
   - *Actual*: Returns `404 Not Found`.
   - *Impact*: Pre-computed aggregates must be served from internal analytics or platform computations.

5. **Offset Pagination vs Page Division (`category: pagination`)**:
   - *Documented*: Collection endpoints take `page` and `limit`, returning `{ total, page, page_size, results }`. Fetch all records by dividing `total / limit`.
   - *Actual*: The running service uses offset-based cursor pagination (`limit`, `offset`, `has_more`). Dividing total by limit causes missing or duplicated records.

6. **Inactive Listings Returned (`category: completeness`)**:
   - *Documented*: `GET /v1/listings` returns active sale listings only; inactive/expired/withdrawn excluded.
   - *Actual*: Retrievable records contain listings where `is_live === false`.
   - *Impact*: Public catalogue must verify `is_live` status.

7. **Server-Side Filters Inconsistency (`category: filters`)**:
   - *Documented*: `locality`, `bhk`, `furnishing` filter listings server side.
   - *Actual*: Parameters are occasionally ignored or case-sensitive.
   - *Resolution*: The frontend implements robust client-side verification to ensure exact user filtering.

8. **Project Total Listings Inconsistency (`category: consistency`)**:
   - *Documented*: `total_listings` always agrees with `GET /v1/listings?project_id=...`.
   - *Actual*: Several builder projects report `total_listings` that contradict the count of active listings linked to that `project_id`.

---

## 6. Hypotheses Tested That Turned Out To Be Fine

- **Rate Limit Resilience**: We hypothesized that sweeping full datasets could trigger `429 Rate Limit Exceeded`. Testing proved the 1200 req/min limit is reliable and accommodates 150+ requests with gentle 20ms delays.
- **Price & Area Units**: We tested whether prices might be quoted in Lakhs or Crores and areas in square meters (which would inflate ₹/sqft by ~10.76x). Genuine live 2BHK listings showed a median ₹/sqft in the ₹6,000–₹12,000 range, confirming prices are integer rupees and areas are integer square feet.
- **Rental Price Semantics**: We verified whether rental `price` could represent annual rent or advance deposit; empirical analysis proved `price` is monthly rent and `deposit` is security deposit as stated.
- **Geographic Boundary Coherence**: Genuine properties reliably clustered within Bengaluru municipal coordinates (12.8°N–13.1°N, 77.4°E–77.8°E). Only a small subset of corrupt records fell outside Indian territory.

---

## 7. Future Roadmap (What We Would Do With Another Two Days)

1. **Real-Time WebSockets**: Live tour request notifications for sellers and real-time bid updates for customers.
2. **Interactive 3D Floorplans & Virtual Tours**: Matterport integration and Google Street View neighborhood exploration.
3. **Automated Title Deed Verification**: OCR extraction for RERA certificates, Encumbrance Certificates (EC), and municipal Khata documents during seller onboarding.
4. **Digital Signature Closing Workflow**: Integrated DocuSign / Aadhaar e-Sign for Superadmin closing deeds directly on order completion.
