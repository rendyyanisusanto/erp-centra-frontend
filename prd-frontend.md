Frontend ERP
Build a modern web-based ERP frontend application for PT. Centra Agro Pratama.
This frontend will connect to an existing REST API backend.
Use the following stack:
- Vue 3 (JavaScript)
- Vite
- Vue Router
- Pinia (state management)
- Axios (API calls)
- Modular folder structure
- Clean enterprise UI design
- Desktop-first layout
- Role-based dynamic menu (permission-based rendering)
- Do not use TypeScript.
- SPA

1️⃣ APPLICATION STRUCTURE
Generate scalable folder structure:
src/
 ├── assets/
 ├── components/
 ├── layouts/
 ├── pages/
 │    ├── auth/
 │    ├── dashboard/
 │    ├── master/
 │    ├── purchase/
 │    ├── sales/
 │    ├── finance/
 │    ├── reports/
 ├── router/
 ├── stores/
 ├── services/
 ├── utils/
 └── main.js
2️⃣ AUTHENTICATION

Features:
- Login page
- JWT storage (localStorage)
- Auto attach token via Axios interceptor
- Logout functionality
- Route guard for protected routes
- Redirect to login if unauthorized
- 
3️⃣ ROLE & PERMISSION HANDLING (IMPORTANT)

The frontend must:
- Receive user role and permissions from backend after login.
- Store permissions in Pinia store.
- Dynamically render sidebar menu based on permissions.
- Hide menu items if user does not have required permission.
- Protect routes using permission guard.

Example:
- If user does not have purchase.create, the Create Purchase button must not be shown.
- If user does not have report.view, the Reports menu must not be visible.
- Permission-based rendering must be dynamic and scalable.

4️⃣ LAYOUT DESIGN

Generate:
- Left sidebar navigation
- Top navbar with:
    - Company name
    - User profile dropdown
    - Logout button
- Main content area
- Responsive desktop layout
- Clean enterprise UI style
- Professional accounting software look
- Neutral color palette (white, gray, soft green accent)

5️⃣ MODULE PAGES

Generate pages with table + form UI for:

- Dashboard
- Summary cards:
    - Total Sales
    - Total Purchases
    - Outstanding Payables
    - Outstanding Receivables
    - Net Profit
    - Charts for monthly stats
- Master Data
- Raw Materials
- Products
- Suppliers
- Customers
- Units
- Chart of Accounts
- Roles
- Users

Each page must have:
- Data table with pagination
- Search input
- Create button (if permission allowed)
- Edit modal
- Delete confirmation modal

6️⃣ PURCHASE MODULE

Pages:

- Purchase Request
- Purchase Order
- Goods Receipt
- Purchase Payment

Each page must include:
- Table list
- Detail view page
- Create form page
- Status badge (OPEN, PARTIAL, PAID, RECEIVED, CLOSED)
- Filter by date

7️⃣ SALES MODULE

Pages:
- Sales List
- Create Sales
- Sales Payment

Features:
- Table list
- Detail page
- Status badge
- Payment modal

8️⃣ FINANCE MODULE

Pages:
- Cash In/Out
- Journal Entry

Features:
- Ledger View
- Journal Entry page must:
- Allow dynamic row add/remove
- Validate debit equals credit before submit

9️⃣ REPORTING

Pages:
- Profit & Loss
- Payables Report
- Receivables Report
- Ledger

Must support:
- Date range filter
- Export button (UI only, backend integration later)

10️⃣ STATE MANAGEMENT (PINIA)

Create stores:

- authStore
- permissionStore
- masterStore
- purchaseStore
- salesStore
- financeStore
- reportStore

Auth store must handle:
- login
- logout
- token storage
- user info
- permissions

11️⃣ AXIOS CONFIGURATION

Create centralized API service
Attach JWT token automatically
Handle 401 globally
Redirect to login if unauthorized

12️⃣ UI REQUIREMENTS

- Clean table UI
- Status badge components
- Reusable modal component
- Reusable form input components
- Loading spinner
- Toast notification system
- Confirmation dialog before delete

13️⃣ ROUTING RULES

Protect all routes except login
Permission-based route meta configuration
Redirect if user lacks permission

🔟 OUTPUT REQUIREMENT

Generate:
- Complete Vue 3 project structure
- Layout components
- Example page implementation
- Router configuration
- Pinia stores
- Axios service
- Permission-based rendering logic
- Clean reusable components

14️⃣ SPA RULES
The application must behave as a true SPA:
- Navigation must NOT reload the page.
- All menu clicks must use Vue Router.
- Do NOT use traditional <a href> links.
- Use <router-link> for navigation.
- Use createWebHistory() in router configuration.
- Maintain state between page navigation.
- JWT token must remain in memory/localStorage without page refresh.

15 UX Behavior Rules (Enterprise Standard)
GLOBAL LOADING STATE
The application must implement:
- Global loading indicator for full-page API calls.
- Button loading state (disable button + spinner inside button).
- Table loading skeleton while fetching data.
- Prevent duplicate submissions while request is processing.
Rules:
- Show loading spinner while data is being fetched.
- Disable submit button when API request is in progress.
- Show overlay loading for critical actions (e.g., saving purchase, posting journal).

ERROR HANDLING UX

The system must:
- Display clear error messages from API.
- Show toast notification for:
Success
Error
Warning
- Show form validation errors under each field.
- Handle 401 (Unauthorized) by redirecting to login without page refresh.
- Handle 403 (Forbidden) by showing "You do not have permission" page.

EMPTY STATE DESIGN

For empty data pages:
Instead of blank tables, show:
Friendly empty state illustration or icon.
Clear message:
“No data available”
“No purchase records found”
“No sales data for selected period”
Add a CTA button:
“Create Purchase”
“Add Product”
Empty state must be visually centered and clean.

TABLE UX BEHAVIOR

Tables must include:
Loading skeleton rows
Search input
Pagination
Status badge colors:
Green → PAID
Orange → PARTIAL
Red → UNPAID
Blue → OPEN
Hover effect
Sticky header (optional)
If no results found after search:
Show “No matching records found”

STATUS BADGE STANDARD
Use consistent color system:
SUCCESS → Green
WARNING → Orange
DANGER → Red
INFO → Blue
NEUTRAL → Gray
Status must be visually clear and consistent across modules.

PERFORMANCE UX RULES
Debounce search input (300ms)
Lazy load pages
Avoid full re-render on navigation
Preserve scroll position when appropriate

Expected UX Feel
The system should feel like:
Odoo
Modern ERP dashboard
Enterprise admin panel
Smooth, professional, stable.
No flickering.
No full reload.
No blank screens.