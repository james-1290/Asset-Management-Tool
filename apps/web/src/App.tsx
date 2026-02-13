import { BrowserRouter, Routes, Route } from "react-router-dom"
import { Layout } from "@/components/layout"
import { ProtectedRoute } from "@/components/protected-route"
import LoginPage from "@/pages/login"
import DashboardPage from "@/pages/dashboard"
import AssetsPage from "@/pages/assets"
import AssetDetailPage from "@/pages/asset-detail"
import CertificatesPage from "@/pages/certificates"
import CertificateDetailPage from "@/pages/certificate-detail"
import CertificateTypesPage from "@/pages/certificate-types"
import ApplicationsPage from "@/pages/applications"
import ApplicationDetailPage from "@/pages/application-detail"
import ApplicationTypesPage from "@/pages/application-types"
import AssetTypesPage from "@/pages/asset-types"
import AssetTemplatesPage from "@/pages/asset-templates"
import LocationsPage from "@/pages/locations"
import LocationDetailPage from "@/pages/location-detail"
import PeoplePage from "@/pages/people"
import PersonDetailPage from "@/pages/person-detail"
import AuditLogPage from "@/pages/audit-log"
import SettingsPage from "@/pages/settings"
import ReportsPage from "@/pages/reports"
import ImportPage from "@/pages/import"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
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
            <Route path="/locations" element={<LocationsPage />} />
            <Route path="/locations/:id" element={<LocationDetailPage />} />
            <Route path="/people" element={<PeoplePage />} />
            <Route path="/people/:id" element={<PersonDetailPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/tools/import" element={<ImportPage />} />
            <Route path="/audit-log" element={<AuditLogPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
