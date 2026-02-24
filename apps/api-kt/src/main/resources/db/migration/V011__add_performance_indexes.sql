-- Performance indexes for commonly queried columns

-- Status filtering on list pages
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_certificates_status ON certificates(status);
CREATE INDEX idx_applications_status ON applications(status);

-- Expiry date filtering for alerts and dashboard
CREATE INDEX idx_assets_warranty_expiry ON assets(warranty_expiry_date);
CREATE INDEX idx_certificates_expiry ON certificates(expiry_date);
CREATE INDEX idx_applications_expiry ON applications(expiry_date);

-- Soft-delete filtering (every list query filters by is_archived)
CREATE INDEX idx_assets_archived ON assets(is_archived);
CREATE INDEX idx_certificates_archived ON certificates(is_archived);
CREATE INDEX idx_applications_archived ON applications(is_archived);
CREATE INDEX idx_people_archived ON people(is_archived);
CREATE INDEX idx_locations_archived ON locations(is_archived);
CREATE INDEX idx_asset_types_archived ON asset_types(is_archived);
CREATE INDEX idx_certificate_types_archived ON certificate_types(is_archived);
CREATE INDEX idx_application_types_archived ON application_types(is_archived);
