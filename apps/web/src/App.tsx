import { BrowserRouter, Routes, Route } from "react-router-dom"
import { Layout } from "@/components/layout"
import DashboardPage from "@/pages/dashboard"
import AssetsPage from "@/pages/assets"
import CertificatesPage from "@/pages/certificates"
import ApplicationsPage from "@/pages/applications"
import AssetTypesPage from "@/pages/asset-types"
import LocationsPage from "@/pages/locations"
import AuditLogPage from "@/pages/audit-log"
import SettingsPage from "@/pages/settings"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/assets" element={<AssetsPage />} />
          <Route path="/certificates" element={<CertificatesPage />} />
          <Route path="/applications" element={<ApplicationsPage />} />
          <Route path="/asset-types" element={<AssetTypesPage />} />
          <Route path="/locations" element={<LocationsPage />} />
          <Route path="/audit-log" element={<AuditLogPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
