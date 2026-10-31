# Skydropx Fullstack Technical Challenge — Multi-Box Shipping Optimizer

An end-to-end application that reads a product catalog and parameters from **Google Sheets**, groups items into custom-sized 3D boxes under multiple heuristics, quotes shipping rates through the **Skydropx Sandbox API**, writes all results back to the spreadsheet, presents a mobile-responsive comparative **Analysis Report**, and generates idempotent **PDF shipping labels** in `/labels`.

---

## 1. Tech Stack & Clean Architecture

- **Backend**: **NestJS 12 + TypeScript + Bun**
  - Structured using a lean **Clean Architecture** (`controllers`, `services`, `repositories`, `factories`, `interfaces`, `dtos`):
    - `src/interfaces/` — Domain contracts (`catalog.interface.ts`, `packaging.interface.ts`, `shipping.interface.ts`).
    - `src/dtos/` — HTTP request/response contracts (`quotation.dto.ts`, `label.dto.ts`).
    - `src/factories/` — `BoxFactory` (3D rotation generation, non-overlap AABB collision check, volumetric & billable weight math) and `PackagingStrategyFactory` (3D bin-packing strategies).
    - `src/repositories/` — External gateways: `SheetsRepository` (Google Sheets API + local JSON state mirror) and `SkydropxRepository` (OAuth2 token cache, ~2 req/sec rate limiter, exponential backoff retry, quotation polling, and shipment/label downloader).
    - `src/services/` — `PackagingService` (Parts 1 & 2) and `ShippingService` (Parts 3, 4 & 5).
    - `src/controllers/` — `ShippingController` exposing REST endpoints for the frontend.
- **Frontend**: **React 19 + Vite + TailwindCSS v4 + Lucide Icons** (`web/`)
  - Mobile-first dashboard displaying strategy comparisons, per-box breakdowns (Cheapest, Fastest, and Best Price–Delivery Balance), visible loading/partial-failure states, and PDF label generation.
- **Testing**: **Vitest** (`test/packaging.spec.ts`, `test/shipping.spec.ts`).

---

## 2. How to Run the Project

### Prerequisites
- [Bun](https://bun.sh/) (v1.1+) or Node.js (v20+)

### 1. Environment Variables
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```
- `SKYDROPX_CLIENT_ID` and `SKYDROPX_SECRET`: Your Skydropx Sandbox OAuth2 credentials.
- `GOOGLE_SHEET_ID` and `GOOGLE_APPLICATION_CREDENTIALS` (or `GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_PRIVATE_KEY`): Your Google Cloud Service Account credentials with Editor access to the spreadsheet.
  - *Note*: If `GOOGLE_SHEET_ID` is omitted during local evaluation, `SheetsRepository` automatically falls back to the built-in 20-product / 30-unit challenge catalog and persists output tabs to `labels/sheets-state.json`.

### 2. Install & Run Backend (Port 3000)
```bash
bun install
bun run start:dev
```

### 3. Install & Run Frontend (Port 5173)
```bash
cd web
bun install
bun run dev
```
Open `http://localhost:5173` in your browser (desktop or mobile viewport).

### 4. Run Automated Tests
```bash
bun run test
```

---

## 3. Packaging Heuristics & Analysis Report (Parts 2 & 4)

All 20 SKUs expand into **30 rigid rectangular units**. Every box includes the `2 cm` clearance on each external dimension (`ext = int + 2 cm`), respects the `60 cm` maximum external side length, and includes the `0.3 kg` tare weight within the `25 kg` maximum box weight.

### Strategy 1: `MIN_BOXES` — Minimize Number of Boxes (3D Extreme-Points FFD)
- **Heuristic**: Sorts all 30 units by volume descending (`L × W × H`) and places each item into the first open box at the 3D Extreme Point `(x, y, z)` and orthogonal rotation that minimizes bounding-box volume expansion without 3D AABB overlap.
- **Result**: **5 boxes** (the theoretical minimum possible for this catalog), **116.90 kg** actual weight, **156.44 kg** volumetric weight, **176 kg total billable weight**, **80.6%** average occupancy.
- **Skydropx Shipping Cost (Best Balance)**: **$1,669.36 MXN**, **1 business day** complete order delivery (`Paquetexpress — Nacional Sin Recolección`, 1 carrier).

### Strategy 2: `MIN_BILLABLE_WEIGHT` — Minimize Billable Weight (Density-Balanced)
- **Heuristic**: Interleaves high-density (heavy/compact) items with low-density (bulky) items and evaluates placements across open boxes to minimize marginal jumps in $\lceil \max(\text{actual}, \text{volumetric}) \rceil$, opening a new compact box when cramming an item into an existing box would bloat the 3D cuboid bounding box with dead air.
- **Result**: **9 boxes**, **118.10 kg** actual weight, **140.25 kg** volumetric weight, **146 kg total billable weight** (**30 kg less billable weight** than Strategy 1), **90.6%** average occupancy.
- **Skydropx Shipping Cost**:
  - **Cheapest Pick**: **$2,066.90 MXN**, **5 business days**, **3 carriers** (`ampm`, `Paquetexpress`, `Estafeta`).
  - **Best Balance / Fastest Pick**: **$2,130.08 MXN**, **1 business day**, **1 carrier** (`Paquetexpress`).

### Price–Delivery Balancing Formula
For each box, carrier rates are scored using a normalized weighted composite formula:
$$\text{BalanceScore} = 0.60 \times \frac{\text{Price} - P_{\min}}{P_{\max} - P_{\min}} + 0.40 \times \frac{\text{Days} - D_{\min}}{D_{\max} - D_{\min}}$$
(Lower score is better; `0.00` represents an option that is simultaneously the cheapest and the fastest).

### Final Recommendation
**Choose Strategy 1 (`MIN_BOXES` — 5 boxes) with `Paquetexpress (Nacional Sin Recolección)` for all 5 boxes.**
- **Why**: Even though Strategy 2 reduced total billable weight by 30 kg (`146 kg` vs. `176 kg`), carriers charge a base fee per box/shipment. Packing into 5 boxes instead of 9 saves **$460.72 MXN** (`$1,669.36 MXN` vs. `$2,130.08 MXN`), delivers the complete order in **1 business day**, and consolidates dispatch with a **single carrier**.

---

## 4. Documented API Discrepancies (PDF vs. Official Skydropx Docs)

Per the instructions (*"If anything in this PDF differs from the documentation, follow the official documentation and document the discrepancy in the README"*):
1. **Endpoint Prefix**: The PDF refers to `POST /oauth/token`, `POST /quotations`, `GET /quotations/{id}`, and `POST /shipments`. On `https://sb-pro.skydropx.com/es-MX/api-docs`, all endpoints are prefixed with `/api/v1` (e.g., `POST /api/v1/oauth/token`, `POST /api/v1/quotations`, `POST /api/v1/shipments`).
2. **Quotation Completion & Valid Rates**: `GET /api/v1/quotations/{id}` exposes a top-level boolean `is_completed` and per-rate `status` (`pending`, `price_found_internal`, `no_coverage`, `not_applicable`) plus `success: boolean`. Some carriers (such as UPS in sandbox) return a numeric `total` with `success: false` and `requires_origin_verification: true`; only rates with `success: true` can be used to create shipments.
3. **Asynchronous Label Creation & Idempotency**: `POST /api/v1/shipments` returns `202 Accepted` with `workflow_status: "pending"` while the carrier generates the label asynchronously. Our repository polls `GET /api/v1/shipments/{id}` until `included[].attributes.label_url` and `tracking_number` are populated, and also passes `unique_shipment: true` in addition to our own local/sheet idempotency check.

---

## 5. Duplicate Label Prevention & Sandbox Handling (Part 5)

- **Two-Layer Idempotency**:
  1. Before calling `POST /api/v1/shipments` for any `boxId`, `ShippingService.generateLabels()` checks the `Labels` (`Guías`) tab and the local `/labels` folder (`BOX-XX_<tracking>.pdf`). If a label already exists for that box, it is marked as `skipped_existing` and reused without spending sandbox credits.
  2. In the request payload to Skydropx, `unique_shipment: true` is enabled so Skydropx caches the shipment per `rate_id` for 96 hours.
- **Carrier Fallback in Sandbox**: If the primary carrier rate fails to generate a label in the sandbox environment, `ShippingService` automatically attempts fallback rates from the box's valid quotations and logs any carrier-specific sandbox errors.

---

## 6. AI Usage & Future Improvements

- **AI Usage**: Used Google Antigravity (Gemini) as a pair-programming assistant to explore the Skydropx OpenAPI schema, structure the Clean Architecture layers, implement the 3D Extreme-Points bin packing heuristics, and scaffold the React + Tailwind dashboard and unit test suite.
- **What I Would Do With More Time**:
  - Add an interactive Three.js / WebGL 3D box viewer inside each box card to visually inspect the `(x, y, z)` item placement inside the custom box.
  - Add Simulated Annealing / Genetic Algorithm meta-heuristic post-processing to further compact 3D arrangements.
  - Add persistent webhook handling for Skydropx shipment status updates instead of short polling.
