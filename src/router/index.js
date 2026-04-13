import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
    { path: '/login', name: 'Login', component: () => import('../pages/auth/LoginPage.vue'), meta: { public: true } },
    { path: '/403', name: 'Forbidden', component: () => import('../pages/403.vue'), meta: { public: true } },
    {
        path: '/',
        component: () => import('../layouts/AppLayout.vue'),
        meta: { requiresAuth: true },
        children: [
            { path: '', redirect: '/dashboard' },
            { path: 'dashboard', name: 'Dashboard', component: () => import('../pages/dashboard/DashboardPage.vue') },
            // Master
            { path: 'master/raw-materials', name: 'RawMaterials', component: () => import('../pages/master/RawMaterialsPage.vue'), meta: { permission: 'raw-material.read' } },
            { path: 'master/products', name: 'Products', component: () => import('../pages/master/ProductsPage.vue'), meta: { permission: 'product.read' } },
            { path: 'master/suppliers', name: 'Suppliers', component: () => import('../pages/master/SuppliersPage.vue'), meta: { permission: 'supplier.read' } },
            { path: 'master/customers', name: 'Customers', component: () => import('../pages/master/CustomersPage.vue'), meta: { permission: 'customer.read' } },
            { path: 'master/salesmen', name: 'Salesmen', component: () => import('../pages/master/SalesmenPage.vue'), meta: { permission: 'salesman.read' } },
            { path: 'master/positions', name: 'Positions', component: () => import('../pages/master/PositionsPage.vue'), meta: { permission: 'position.read' } },
            { path: 'master/employees', name: 'Employees', component: () => import('../pages/master/EmployeesPage.vue'), meta: { permission: 'employee.read' } },
            { path: 'master/units', name: 'Units', component: () => import('../pages/master/UnitsPage.vue'), meta: { permission: 'unit.read' } },
            { path: 'master/coa', name: 'ChartOfAccounts', component: () => import('../pages/master/CoaPage.vue'), meta: { permission: 'coa.read' } },
            { path: 'master/roles', name: 'Roles', component: () => import('../pages/master/RolesPage.vue'), meta: { permission: 'role.read' } },
            { path: 'master/users', name: 'Users', component: () => import('../pages/master/UsersPage.vue'), meta: { permission: 'user.read' } },
            // Purchase
            { path: 'purchase/requests', name: 'PurchaseRequests', component: () => import('../pages/purchase/PurchaseRequestPage.vue'), meta: { permission: 'purchase.read' } },
            { path: 'purchase/orders', name: 'PurchaseOrders', component: () => import('../pages/purchase/PurchaseOrderPage.vue'), meta: { permission: 'purchase.read' } },
            { path: 'purchase/goods-receipts', name: 'GoodsReceipts', component: () => import('../pages/purchase/GoodsReceiptPage.vue'), meta: { permission: 'goods-receipt.read' } },
            { path: 'purchase/payments', name: 'PurchasePayments', component: () => import('../pages/purchase/PurchasePaymentPage.vue'), meta: { permission: 'purchase-payment.read' } },
            // Sales
            { path: 'sales', name: 'Sales', component: () => import('../pages/sales/SalesPage.vue'), meta: { permission: 'sales.read' } },
            { path: 'sales/payments', name: 'SalePayments', component: () => import('../pages/sales/SalePaymentPage.vue'), meta: { permission: 'sales.read' } },
            // Finance
            { path: 'finance/cash', name: 'CashTransactions', component: () => import('../pages/finance/CashTransactionPage.vue'), meta: { permission: 'journal.read' } },
            { path: 'finance/journals', name: 'Journals', component: () => import('../pages/finance/JournalPage.vue'), meta: { permission: 'journal.read' } },
            // Inventory
            { path: 'inventory/adjustments', name: 'StockAdjustments', component: () => import('../pages/inventory/StockAdjustmentPage.vue'), meta: { permission: 'stock-adjustment.read' } },
            { path: 'inventory/stock-movements', name: 'StockMovements', component: () => import('../pages/inventory/StockMovementPage.vue'), meta: { permission: 'stock-movement.read' } },
            { path: 'inventory/material-issues', name: 'MaterialIssuesList', component: () => import('../pages/inventory/MaterialIssuesList.vue'), meta: { permission: 'material-issue.read' } },
            { path: 'inventory/production-plans', name: 'ProductionPlansList', component: () => import('../pages/inventory/ProductionPlansList.vue'), meta: { permission: 'production-plan.read' } },
            { path: 'inventory/production-realizations', name: 'ProductionRealizationsList', component: () => import('../pages/inventory/ProductionRealizationsList.vue'), meta: { permission: 'production-realization.read' } },
            { path: 'inventory/finished-goods-receipts', name: 'FinishedGoodsReceiptsList', component: () => import('../pages/inventory/FinishedGoodsReceiptsList.vue'), meta: { permission: 'finished-goods-receipt.read' } },
            // Reports
            { path: 'reports/profit-loss', name: 'ProfitLoss', component: () => import('../pages/reports/ProfitLossPage.vue'), meta: { permission: 'report.profit-loss' } },
            { path: 'reports/payables', name: 'Payables', component: () => import('../pages/reports/PayablesPage.vue'), meta: { permission: 'report.payables' } },
            { path: 'reports/receivables', name: 'Receivables', component: () => import('../pages/reports/ReceivablesPage.vue'), meta: { permission: 'report.receivables' } },
            { path: 'reports/ledger', name: 'Ledger', component: () => import('../pages/reports/LedgerPage.vue'), meta: { permission: 'report.ledger' } },
            { path: 'reports/raw-material-stock-card', name: 'RawMaterialStockCard', component: () => import('../pages/reports/RawMaterialStockCardPage.vue'), meta: { permission: 'report.raw-material-stock-card' } },
            { path: 'reports/stock-opname', name: 'StockOpnameReport', component: () => import('../pages/reports/StockOpnameReportPage.vue'), meta: { permission: 'report.stock-opname' } },
            { path: 'reports/purchase-order-recap', name: 'PurchaseOrderRecap', component: () => import('../pages/reports/PurchaseOrderRecapPage.vue'), meta: { permission: 'report.purchase-order-recap' } },
            { path: 'reports/supplier-payable-statement', name: 'SupplierPayableStatement', component: () => import('../pages/reports/SupplierPayableStatementPage.vue'), meta: { permission: 'report.supplier-payable-statement' } },
            { path: 'reports/stock-opname-product', name: 'FinishedGoodsStockOpname', component: () => import('../pages/reports/FinishedGoodsStockOpnamePage.vue'), meta: { permission: 'report.stock-opname-product' } },
            { path: 'reports/fg-monthly-stock', name: 'FinishedGoodsMonthlyStock', component: () => import('../pages/reports/FinishedGoodsMonthlyStockPage.vue'), meta: { permission: 'report.fg-monthly-stock' } },
            { path: 'reports/material-issues', name: 'MaterialIssueMonthlyReport', component: () => import('../pages/reports/MaterialIssueMonthlyReportPage.vue'), meta: { permission: 'report.material-issues' } },
            { path: 'reports/production', name: 'ProductionReport', component: () => import('../pages/reports/ProductionReport.vue'), meta: { permission: 'report.production' } },
        ],
    },
    { path: '/print/raw-material-stock-card', name: 'RawMaterialStockCardPrint', component: () => import('../pages/reports/RawMaterialStockCardPrint.vue'), meta: { permission: 'report.raw-material-stock-card', hideLayout: true } },
    { path: '/print/stock-opname', name: 'StockOpnameReportPrint', component: () => import('../pages/reports/StockOpnameReportPrint.vue'), meta: { permission: 'report.stock-opname', hideLayout: true } },
    { path: '/print/purchase-order-recap', name: 'PurchaseOrderRecapPrint', component: () => import('../pages/reports/PurchaseOrderRecapPrint.vue'), meta: { permission: 'report.purchase-order-recap', hideLayout: true } },
    { path: '/print/stock-opname-product', name: 'FinishedGoodsStockOpnamePrint', component: () => import('../pages/reports/FinishedGoodsStockOpnamePrint.vue'), meta: { permission: 'report.stock-opname-product', hideLayout: true } },
    { path: '/print/fg-monthly-stock', name: 'FinishedGoodsMonthlyStockPrint', component: () => import('../pages/reports/FinishedGoodsMonthlyStockPrint.vue'), meta: { permission: 'report.fg-monthly-stock', hideLayout: true } },
    { path: '/print/material-issues-monthly', name: 'MaterialIssueMonthlyPrint', component: () => import('../pages/reports/MaterialIssueMonthlyPrint.vue'), meta: { permission: 'report.material-issues', hideLayout: true } },
    { path: '/print/material-issue', name: 'MaterialIssuePrint', component: () => import('../pages/inventory/MaterialIssuePrint.vue'), meta: { permission: 'report.material-issues', hideLayout: true } },
    { path: '/print/payables', name: 'PayablesPrint', component: () => import('../pages/reports/PayablesPrint.vue'), meta: { permission: 'report.payables', hideLayout: true } },
    { path: '/print/receivables', name: 'ReceivablesPrint', component: () => import('../pages/reports/ReceivablesPrint.vue'), meta: { permission: 'report.receivables', hideLayout: true } },
    { path: '/print/production', name: 'ProductionReportPrint', component: () => import('../pages/reports/ProductionReportPrint.vue'), meta: { permission: 'report.production', hideLayout: true } },
    { path: '/print/sales/:id', name: 'SalesInvoicePrint', component: () => import('../pages/sales/SalesInvoicePrint.vue'), meta: { permission: 'sales.read', hideLayout: true } },
    { path: '/print/sales-payment/:sale_id', name: 'SalesPaymentPrint', component: () => import('../pages/sales/SalesPaymentPrint.vue'), meta: { permission: 'sales.read', hideLayout: true } },
    { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
]

const router = createRouter({
    history: createWebHistory(),
    routes,
    scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to, from, next) => {
    const auth = useAuthStore()
    if (!to.meta.public && !auth.isAuthenticated) return next('/login')
    if (to.path === '/login' && auth.isAuthenticated) return next('/dashboard')
    if (auth.isAuthenticated && !auth.profileSynced) {
        try {
            await auth.syncProfile()
        } catch {
            return next('/login')
        }
    }
    if (to.meta.permission && !auth.can(to.meta.permission)) return next('/403')
    next()
})

export default router
