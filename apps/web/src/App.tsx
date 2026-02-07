import { BrowserRouter, Routes, Route } from "react-router-dom"
import { Layout } from "@/components/layout"
import DashboardPage from "@/pages/dashboard"
import AssetsPage from "@/pages/assets"
import AssetDetailPage from "@/pages/asset-detail"
import CertificatesPage from "@/pages/certificates"
import CertificateDetailPage from "@/pages/certificate-detail"
import CertificateTypesPage from "@/pages/certificate-types"
import ApplicationsPage from "@/pages/applications"
import AssetTypesPage from "@/pages/asset-types"
import LocationsPage from "@/pages/locations"
import PeoplePage from "@/pages/people"
import AuditLogPage from "@/pages/audit-log"
import SettingsPage from "@/pages/settings"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/assets" element={<AssetsPage />} />
          <Route path="/assets/:id" element={<AssetDetailPage />} />
          <Route path="/certificates" element={<CertificatesPage />} />
          <Route path="/certificates/:id" element={<CertificateDetailPage />} />
          <Route path="/certificate-types" element={<CertificateTypesPage />} />
          <Route path="/applications" element={<ApplicationsPage />} />
          <Route path="/asset-types" element={<AssetTypesPage />} />
          <Route path="/locations" element={<LocationsPage />} />
          <Route path="/people" element={<PeoplePage />} />
          <Route path="/audit-log" element={<AuditLogPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
