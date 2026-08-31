import { Suspense, lazy } from "react"
import { BrowserRouter, Routes, Route, Link } from "react-router-dom"
import { PageSkeleton } from "@/components/page-skeleton"
import { Layout } from "@/components/layout"
import { ProtectedRoute } from "@/components/protected-route"
import DashboardPage from "@/pages/dashboard"

// Every route but the landing page is fetched on first visit. Shipping the
// whole product — the import wizard, the reporting charts, every dialog — in
// one file made the first paint wait for code most sessions never run.
const AssetsPage = lazy(() => import("@/pages/assets"))
const AssetDetailPage = lazy(() => import("@/pages/asset-detail"))
const CertificatesPage = lazy(() => import("@/pages/certificates"))
const CertificateDetailPage = lazy(() => import("@/pages/certificate-detail"))
const CertificateTypesPage = lazy(() => import("@/pages/certificate-types"))
const ApplicationsPage = lazy(() => import("@/pages/applications"))
const ApplicationDetailPage = lazy(() => import("@/pages/application-detail"))
const ApplicationTypesPage = lazy(() => import("@/pages/application-types"))
const AssetTypesPage = lazy(() => import("@/pages/asset-types"))
const AssetTemplatesPage = lazy(() => import("@/pages/asset-templates"))
const AssetModelsPage = lazy(() => import("@/pages/asset-models"))
const LocationsPage = lazy(() => import("@/pages/locations"))
const LocationDetailPage = lazy(() => import("@/pages/location-detail"))
const PeoplePage = lazy(() => import("@/pages/people"))
const PersonDetailPage = lazy(() => import("@/pages/person-detail"))
const AuditLogPage = lazy(() => import("@/pages/audit-log"))
const SettingsPage = lazy(() => import("@/pages/settings"))
const NotificationsPage = lazy(() => import("@/pages/notifications"))
const ReportsPage = lazy(() => import("@/pages/reports"))
const ImportPage = lazy(() => import("@/pages/import"))

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/assets" element={<AssetsPage />} />
            <Route path="/assets/:id" element={<AssetDetailPage />} />
            <Route path="/certificates" element={<CertificatesPage />} />
            <Route path="/certificates/:id" element={<CertificateDetailPage />} />
            <Route path="/certificate-types" element={<CertificateTypesPage />} />
            <Route path="/applications" element={<ApplicationsPage />} />
            <Route path="/applications/:id" element={<ApplicationDetailPage />} />
            <Route path="/application-types" element={<ApplicationTypesPage />} />
            <Route path="/asset-types" element={<AssetTypesPage />} />
            <Route path="/asset-templates" element={<AssetTemplatesPage />} />
            <Route path="/asset-models" element={<AssetModelsPage />} />
            <Route path="/locations" element={<LocationsPage />} />
            <Route path="/locations/:id" element={<LocationDetailPage />} />
            <Route path="/people" element={<PeoplePage />} />
            <Route path="/people/:id" element={<PersonDetailPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/tools/import" element={<ImportPage />} />
            <Route path="/audit-log" element={<AuditLogPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="*" element={<div className="flex flex-col items-center justify-center py-20 gap-4"><h1 className="text-2xl font-bold">Page not found</h1><p className="text-muted-foreground">The page you are looking for does not exist.</p><Link to="/" className="text-primary hover:underline">Go to Dashboard</Link></div>} />
          </Route>
        </Route>
      </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
