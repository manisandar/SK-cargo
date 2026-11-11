# SK Cargo - Warehouse Logistics & Parcel Management PWA

Mobile-first Progressive Web Application (PWA) for warehouse staff and administrators to manage cargo receiving, barcode/QR generation, parcel lot tracking, big box repacking, courier dispatch runs, customer profile management, return workflows, and system audit logging.

---

## Architecture & Technology Stack

- Frontend: React 19, TypeScript, Vite, Tailwind CSS
- PWA & Offline Support: vite-plugin-pwa, Service Workers, Web App Manifest
- Local Database & Repository Pattern: Dexie.js (IndexedDB) with schema mapped 1:1 to PostgreSQL tables (UUIDs, snake_case column names)
- Centralized UI Strings: All user-facing labels and messages are maintained in `src/strings.ts`
- Icons: Lucide React
- Routing: React Router v7 with role-based routing (Admin vs Staff)

---

## Features

### 1. Parcel Intake & Label Generation
- Record incoming parcel lots with customer association and fuzzy customer matching.
- Multi-package item entry with piece counts, weight per piece, and total weight calculations.
- Camera photo capture with client-side image compression.
- Printable high-resolution QR codes for individual items and batch parcel lots.
- Date navigation bar with single-day and all-dates filtering.

### 2. Big Box Repacking & Consolidation
- Consolidate loose stored parcel items into master big boxes.
- Track box dimensions, piece counts, and total weights.
- Upload and manage master box photos.
- Prevent modifying or deleting boxes once loaded onto a truck or delivered.

### 3. Courier Truck Runs & Dispatch
- Create and manage courier truck runs.
- Load packed master boxes and loose cargo lots.
- Automatic status cascade across all loaded cargo upon dispatch (In Transit) and delivery (Delivered).
- Edit truck identifiers and track courier run photos.

### 4. Admin Portal & Warehouse KPIs
- High-level KPI metrics: Intake, Warehouse Stock, In Transit, Delivered, and Returned.
- Date range filtering: Today, This Week, This Month, All Time, and Custom date ranges.
- Active courier truck monitoring with responsive mobile cards.
- Top customers ranking with toggles for sorting by Weight (kg) or by Shipment count.

### 5. Return Workflow
- Admin-controlled status overrides to flag incorrect shipments as To Be Returned or Returned.
- Strictly restricted to parcels in stored warehouse stock (not packed in a box or on a truck).
- Staff handover action to mark items as Returned upon physical return.

### 6. Customer Management & Profile Merging
- Search and browse customer profiles with total shipments and total weight tracking.
- Merge duplicate customer profiles into a primary account with automatic reassignment of all parcel lots, sub-names, and history.

### 7. User Management & Security
- Admin management of staff accounts, roles, and credentials.
- Soft-deactivation support: inactive accounts are immediately blocked from logging in while preserving audit trail attribution.

### 8. System Audit Logs
- Chronological activity stream tracking state transitions, timestamps, staff member attributions, and remarks across all entities (Parcels, Boxes, Couriers, Customers).
- Filter by staff member, entity type, and date range, with CSV export support.

---

## Local Development & Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Local Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser. Use mobile device emulation (such as 390px width) for mobile testing.

### 3. Run Automated Tests
```bash
npm test
```

### 4. Build for Production
```bash
npm run build
npm run preview
```

---

## Default User Accounts

| Username | Password | Role | Display Name |
| :--- | :--- | :--- | :--- |
| staff1 | staff123 | Staff | Aung Ko |
| staff2 | staff123 | Staff | May Zin |
| admin | admin123 | Admin | Supervisor Dave |

---

## Supabase Integration

The application uses an abstract repository interface (`IRepository`). Switching from local IndexedDB storage to a remote Supabase backend requires implementing `SupabaseRepository` against `IRepository` and swapping the instance in `src/data/index.tsx`, with zero modifications to React components.
