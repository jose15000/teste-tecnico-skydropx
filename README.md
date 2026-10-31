# Skydropx Fullstack Technical Challenge — Multi-Box Shipping Optimizer

An end-to-end application that reads a product catalog and parameters from **Google Sheets**, groups items into custom-sized 3D boxes under multiple heuristics, quotes shipping rates through the **Skydropx Sandbox API**, writes all results back to the spreadsheet, presents a mobile-responsive comparative **Analysis Report**, and generates idempotent **PDF shipping labels** in `/labels`.

---

## 1. Tech Stack & Modular Architecture

### 1.1 Core Technologies
- **Backend**: **NestJS 12 + TypeScript + Bun**
  - **Runtime & Execution**: [Bun](https://bun.sh/) (v1.1+) executing native ECMAScript Modules (`"type": "module"`) with strict `.js` relative import extensions across all modules.
  - **Framework**: **NestJS 12** providing robust Dependency Injection, lifecycle hooks (`OnModuleInit`), and clear modular boundaries.
  - **Validation & Schemas**: [Zod](https://zod.dev/) (v4) for declarative, regex-free schema parsing and runtime contract enforcement.
  - **External SDKs**: Official Google APIs (`googleapis` v189) with JWT service account authentication; Skydropx REST API v1.
- **Frontend**: **React 19 + Vite + TailwindCSS v4 + Lucide Icons** (`web/`)
  - Mobile-first operational dashboard displaying packaging strategy comparisons, per-box carrier breakdowns (Cheapest, Fastest, Best Balance), live execution states, and PDF label generation.
- **Testing & Quality Assurance**:
  - **Vitest**: Sub-second unit and end-to-end test execution (`bun test`, `bun run test:e2e`).
  - **Oxlint**: High-performance Rust-based static linter (`bunx oxlint src/ test/`) guaranteeing zero errors and zero warnings.

---

### 1.2 Feature Modules / Vertical Slice Architecture (`src/modules/`)
The backend is organized into autonomous, vertical feature modules under `src/modules/`, each encapsulating its controllers, services, repositories, and unit specs:

```
src/
├── interfaces/             # Cross-cutting TypeScript domain contracts
│   ├── catalog.interface.ts
│   ├── packaging.interface.ts
│   ├── sheets.interface.ts
│   └── shipping.interface.ts
├── schemas/                # Declarative Zod schemas (regex-free)
│   └── catalog.schema.ts
├── utils/                  # Resilient parsing & normalization helpers
│   └── sheet-parser.util.ts
└── modules/                # Vertical Feature Slices
    ├── integrations/       # External infrastructure gateways (Google Sheets, Skydropx)
    ├── catalog/            # Catalog ingestion, Zod validation & unit expansion
    ├── packaging/          # 3D bin-packing heuristics & box persistence
    ├── quotations/         # Carrier rate quoting & price-delivery scoring
    ├── labels/             # Shipment generation, PDF downloading & idempotency
    └── automation/         # End-to-end orchestrator pipeline
```

Each module operates with dedicated responsibilities and explicit dependencies:

1. **`src/modules/integrations/` (`IntegrationsModule`)**
   - **Role**: Infrastructure gateway encapsulating external third-party API clients and authentication protocols.
   - **Components**:
     - `GoogleSheetsClient`: Injectable service configuring Google Sheets API v4 with a `google.auth.JWT` client using the `https://www.googleapis.com/auth/spreadsheets` scope. Exposes low-level range primitives: `getRows(range)`, `appendRow(range, row)`, `appendRows(range, rows)`, `updateRange(range, values)`, and `clearRange(range)`.
     - `SkydropxClient`: Injectable REST client handling Skydropx OAuth2 token management and `/api/v1` HTTP communication.
   - **Exports**: `GoogleSheetsClient`, `SkydropxClient`.

2. **`src/modules/catalog/` (`CatalogModule`)**
   - **Role**: Ingests, normalizes, validates, and expands catalog items and packaging parameters from the spreadsheet.
   - **Components**:
     - `CatalogRepository`: Injects `GoogleSheetsClient` to fetch `Products!A2:I` and `Parameters!A2:B`, converting untyped spreadsheet cells into typed domain models.
     - `CatalogService`: Enforces runtime validation using Zod schemas, dynamically parameterizes packaging constraints against the spreadsheet parameters, isolates invalid rows without failing the pipeline, and expands SKU quantities into discrete unit instances (`CatalogUnit`).
     - `CatalogController`: Exposes `GET /catalog` returning the validated catalog, packaging parameters, and expanded units.
   - **Exports**: `CatalogService`, `CatalogRepository`.

3. **`src/modules/packaging/` (`PackagingModule`)**
   - **Role**: Computes custom 3D box arrangements under multiple packing heuristics (`MIN_BOXES`, `MIN_BILLABLE_WEIGHT`), calculates dimensions, and persists outputs.
   - **Components**:
     - `PackagingRepository`: Injects `GoogleSheetsClient` to persist calculated box records directly to `Boxes!A2:J` (`saveBoxes`), clearing previous outputs and batch-appending new rows.
     - `PackagingService`: Evaluates 3D Extreme-Points bounding-box heuristics, respecting clearance offsets and tare weight limits.
     - `PackagingController`: Exposes `/packaging` endpoints for calculating and retrieving 3D packaging plans.
   - **Exports**: `PackagingService`, `PackagingRepository`.

4. **`src/modules/quotations/` (`QuotationsModule`)**
   - **Role**: Queries multi-carrier rates from the Skydropx API, polls asynchronous quotation status, and scores/ranks rates.
   - **Components**:
     - `QuotationsRepository`: Persists quoted rates to `Quotations!A1:I`.
     - `QuotationsService`: Orchestrates rate fetching across all packed boxes and applies the weighted Price–Delivery Balance scoring formula.
     - `QuotationsController`: Exposes `/quotations` endpoints for quoting boxes and retrieving ranked rates.
   - **Exports**: `QuotationsService`, `QuotationsRepository`.

5. **`src/modules/labels/` (`LabelsModule`)**
   - **Role**: Generates carrier shipping labels, downloads PDF documents to `/labels`, and guarantees idempotency.
   - **Components**:
     - `LabelsRepository`: Reads and writes label records to `Labels!A1:G`, tracking generated tracking numbers and PDF filenames.
     - `LabelsService`: Generates shipping labels via Skydropx API v1 (`POST /api/v1/shipments`), checks existing local files and sheet rows before creation, and saves generated PDF files to `/labels`.
     - `LabelsController`: Exposes `/labels` endpoints for label generation and status inspection.
   - **Exports**: `LabelsService`, `LabelsRepository`.

6. **`src/modules/automation/` (`AutomationModule`)**
   - **Role**: Orchestration and facade layer providing an end-to-end automated pipeline across all modules.
   - **Components**:
     - `AutomationService`: Coordinates the full sequential workflow: catalog ingestion $\to$ 3D packaging $\to$ quotation retrieval $\to$ sheet synchronization $\to$ label generation.
     - `AutomationController`: Exposes `/automation` endpoints enabling one-click full workflow runs from the frontend dashboard.

---

### 1.3 Persistence Layer: Google Sheets as SSOT & Repository Pattern
A central architectural pillar of this project is that **Google Sheets serves as the authoritative Single Source of Truth (SSOT)**. There is **NO relational or document database** (no PostgreSQL, MySQL, MongoDB, or Redis). All application state is read from and written to Google Sheets across 5 dedicated tabs:

| Tab Name | Range | Direction | Description |
|---|---|---|---|
| **`Products`** | `A1:I` | Input | Catalog items: SKU, Producto, Largo (cm), Ancho (cm), Alto (cm), Peso (kg), Cantidad, Frágil, Valor (MXN). |
| **`Parameters`** | `A1:B` | Input | Packaging parameters (`lado_maximo_cm`, `peso_maximo_kg`, `holgura_cm`, `tara_kg`, `divisor_volumetrico`) & shipping addresses (`origen_*`, `destino_*`). |
| **`Boxes`** | `A1:J` | Output | Packaged boxes: Estrategia, Caja ID, Largo ext. (cm), Ancho ext. (cm), Alto ext. (cm), Peso real (kg), Peso volumétrico (kg), Peso facturable (kg), Ocupación (%), SKUs contenidos. |
| **`Quotations`** | `A1:I` | Output | Quoted shipping options: Estrategia, Caja ID, Paquetería, Servicio, Precio total (MXN), Días estimados, Rate ID, Estado, Error. |
| **`Labels`** | `A1:G` | Output | Generated shipping guides: Caja ID, Paquetería, Servicio, Precio (MXN), Número de guía, Archivo PDF, Creada en. |

#### Decoupling via the Repository Pattern
Directly embedding spreadsheet coordinates and cell arrays into business logic creates brittle software that breaks whenever columns are reordered or ranges change. To eliminate this coupling:
- **Zero Spreadsheet Awareness in Domain Services**: Domain services (`CatalogService`, `PackagingService`, etc.) never import `googleapis`, never execute HTTP calls, and have no knowledge of A1 notation (`Products!A2:I`, `Parameters!A2:B`, `Boxes!A2:J`) or raw string index arrays (`row[0]`, `row[1]`).
- **Repositories as Data Mappers**: Repositories (`CatalogRepository`, `PackagingRepository`, `QuotationsRepository`, `LabelsRepository`) inject `GoogleSheetsClient` and act as bidirectional mappers:
  - On read operations, they fetch raw string matrices, normalize cell values via utilities, and transform them into strongly-typed domain interfaces (`CatalogData`, `CatalogItem[]`, `CatalogParameters`).
  - On write operations, they serialize typed domain entities (`BoxSheetRow[]`, `QuotationSheetRow[]`, `LabelSheetRow[]`) into tabular 2D arrays, performing atomic `clearRange` and `appendRows` operations via `GoogleSheetsClient`.

---

### 1.4 Domain Contracts, Resilient Parsers & Declarative Zod Validation

#### Domain Contracts (`src/interfaces/`)
Strict TypeScript interfaces define the structural contracts between layers:
- `catalog.interface.ts`: `CatalogItem`, `CatalogUnit`, `CatalogValidationError`, `PackagingConstraints`, `ShippingAddress`, `CatalogParameters`, `CatalogData`, `ValidatedCatalog`.
- `sheets.interface.ts`: `CellValue`, `SheetRow`, `ProductSheetRow`, `ParameterSheetRow`, `BoxSheetRow`, `QuotationSheetRow`, `LabelSheetRow`.
- `packaging.interface.ts`: `PackagingStrategyName`, `Dimensions3D`, `Coordinates3D`, `PackedUnit`, `PackedBox`, `PackagingResult`.
- `shipping.interface.ts`: `QuotationRate`, `BoxQuotationResult`, `LabelRecord`.

#### Resilient Input Parsers (`src/utils/sheet-parser.util.ts`)
Spreadsheet data entered by human operators often contains localized conventions, diacritics, and varied formats. The parser utilities normalize inputs prior to validation:
- **`parseSheetNumber(value)`**: Handles `undefined`, `null`, and whitespace strings gracefully (returning `NaN`); normalizes European and Latin American comma decimal separators (`"4,8"` $\to$ `"4.8"`) before numeric conversion.
- **`parseSheetBoolean(value)`**: Normalizes strings by stripping Unicode diacritics via `.normalize('NFD').replace(/[\u0300-\u036f]/g, '')`, converting to lowercase, and checking against multilingual truthy representations (`"si"`, `"sí"`, `"sim"`, `"true"`, `"1"`, `"yes"`).

#### Declarative Zod Validation Without Regular Expressions (`src/schemas/catalog.schema.ts`)
All schema validations are implemented using **Zod 4** without regular expressions, explicitly eliminating **ReDoS (Regular Expression Denial of Service)** attack vectors:
- **Mexican Postal Code Validation**: `shippingAddressSchema` verifies 5-digit Mexican postal codes (`postalCode`) using `.length(5, 'ZIP code must contain exactly 5 digits')` and character predicate validation (`val.split('').every((ch) => ch >= '0' && ch <= '9')`), guaranteeing exact 5-digit numeric strings with zero regex backtracking overhead. Email addresses are validated via Zod's native `.email()`.
- **Cross-Field Parameter Constraints**: `packagingConstraintsSchema` enforces logical relationships between spreadsheet parameters:
  $$\text{boxTareWeightKg} < \text{maxBoxWeightKg}$$
  throwing descriptive schema errors if the tare weight equals or exceeds the maximum box capacity.
- **Dynamic Catalog Item Schema Factory (`createCatalogItemSchema`)**:
  Rather than relying on hardcoded static limits, `createCatalogItemSchema(constraints)` dynamically accepts the loaded packaging parameters and applies custom `.superRefine()` checks:
  1. **Maximum Dimension Check**: The largest item dimension plus clearance must not exceed the maximum allowed box side:
     $$\max(\text{lengthCm}, \text{widthCm}, \text{heightCm}) + \text{clearanceCm} \le \text{maxSideCm}$$
  2. **Maximum Weight Check**: The individual item weight plus box tare must not exceed the maximum allowable box weight:
     $$\text{weightKg} + \text{boxTareWeightKg} \le \text{maxBoxWeightKg}$$
- **Resilient Non-Halting Error Aggregation**:
  In `CatalogService.validateAndExpandCatalog`, each row from the spreadsheet is evaluated using `itemSchema.safeParse(item)`:
  - If a row fails validation (e.g., negative dimensions, non-integer quantity, oversized side, excessive weight), it is aggregated into `invalidItems` with its spreadsheet `rowNumber`, SKU (or fallback `ROW-{rowNumber}`), and specific failure messages, accompanied by a logger warning.
  - Valid rows are collected into `validItems` and expanded into discrete `CatalogUnit` units (`${sku}-${index}`) based on `quantity`.
  - **Result**: A single malformed product row does not crash the application or prevent other valid items from being packed and quoted.

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
- `GOOGLE_SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, and `GOOGLE_PRIVATE_KEY`: Your Google Cloud Service Account credentials with Editor access to the spreadsheet.

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

### 4. Run Automated Tests & Quality Gates
```bash
# Run unit and integration tests
bun test

# Run static analysis and linting
bunx oxlint src/ test/

# Run end-to-end tests
bun run test:e2e
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
3. **Asynchronous Label Creation & Idempotency**: `POST /api/v1/shipments` returns `202 Accepted` with `workflow_status: "pending"` while the carrier generates the label asynchronously. The integration polls `GET /api/v1/shipments/{id}` until `included[].attributes.label_url` and `tracking_number` are populated, and also passes `unique_shipment: true` in addition to our own local/sheet idempotency check.

---

## 5. Duplicate Label Prevention & Sandbox Handling (Part 5)

- **Two-Layer Idempotency**:
  1. Before calling `POST /api/v1/shipments` for any `boxId`, `LabelsService.generateLabels()` checks the `Labels` (`Guías`) tab and the local `/labels` folder (`BOX-XX_<tracking>.pdf`). If a label already exists for that box, it is marked as `skipped_existing` and reused without spending sandbox credits.
  2. In the request payload to Skydropx, `unique_shipment: true` is enabled so Skydropx caches the shipment per `rate_id` for 96 hours.
- **Carrier Fallback in Sandbox**: If the primary carrier rate fails to generate a label in the sandbox environment, `LabelsService` automatically attempts fallback rates from the box's valid quotations and logs any carrier-specific sandbox errors.

---

## 6. AI Usage & Future Improvements

- **AI Usage**: Used Google Antigravity (Gemini) as a pair-programming assistant to explore the Skydropx OpenAPI schema, structure the Clean Architecture layers, implement the 3D Extreme-Points bin packing heuristics, and scaffold the React + Tailwind dashboard and unit test suite.
- **What I Would Do With More Time**:
  - Add an interactive Three.js / WebGL 3D box viewer inside each box card to visually inspect the `(x, y, z)` item placement inside the custom box.
  - Add Simulated Annealing / Genetic Algorithm meta-heuristic post-processing to further compact 3D arrangements.
  - Add persistent webhook handling for Skydropx shipment status updates instead of short polling.
