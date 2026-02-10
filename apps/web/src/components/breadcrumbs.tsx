import { Link, useLocation, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { Asset } from "@/types/asset";
import type { Certificate } from "@/types/certificate";
import type { Application } from "@/types/application";
import type { Person } from "@/types/person";

const ROUTE_LABELS: Record<string, string> = {
  "/": "Dashboard",
  "/assets": "Assets",
  "/certificates": "Certificates",
  "/applications": "Applications",
  "/people": "People",
  "/locations": "Locations",
  "/asset-types": "Asset Types",
  "/certificate-types": "Certificate Types",
  "/application-types": "Application Types",
  "/audit-log": "Audit Log",
  "/settings": "Settings",
};

const SETTINGS_TAB_LABELS: Record<string, string> = {
  profile: "Profile",
  users: "Users",
  alerts: "Alerts",
  system: "System",
};

export function Breadcrumbs() {
  const location = useLocation();
  const params = useParams();
  const queryClient = useQueryClient();

  const pathname = location.pathname;
  const crumbs: Array<{ label: string; href?: string }> = [];

  // Check for static route match
  const staticLabel = ROUTE_LABELS[pathname];
  if (staticLabel) {
    crumbs.push({ label: staticLabel });

    // Settings: add tab crumb
    if (pathname === "/settings") {
      const searchParams = new URLSearchParams(location.search);
      const tab = searchParams.get("tab");
      if (tab && SETTINGS_TAB_LABELS[tab]) {
        crumbs[crumbs.length - 1].href = "/settings";
        crumbs.push({ label: SETTINGS_TAB_LABELS[tab] });
      }
    }
  } else if (params.id) {
    // Detail page: e.g. /assets/:id
    const segments = pathname.split("/").filter(Boolean);
    const entitySegment = segments[0];

    const parentPath = `/${entitySegment}`;
    const parentLabel = ROUTE_LABELS[parentPath];
    if (parentLabel) {
      crumbs.push({ label: parentLabel, href: parentPath });
    }

    // Try to resolve entity name from React Query cache
    const entityName = resolveEntityName(queryClient, entitySegment, params.id);
    crumbs.push({ label: entityName || "Details" });
  }

  if (crumbs.length === 0) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <BreadcrumbItem key={i}>
              {i > 0 && <BreadcrumbSeparator />}
              {isLast ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={crumb.href!}>{crumb.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function resolveEntityName(
  queryClient: ReturnType<typeof useQueryClient>,
  entitySegment: string,
  id: string,
): string | null {
  switch (entitySegment) {
    case "assets": {
      const asset = queryClient.getQueryData<Asset>(["assets", id]);
      return asset?.name ?? null;
    }
    case "certificates": {
      const cert = queryClient.getQueryData<Certificate>(["certificates", id]);
      return cert?.name ?? null;
    }
    case "applications": {
      const app = queryClient.getQueryData<Application>(["applications", id]);
      return app?.name ?? null;
    }
    case "people": {
      const person = queryClient.getQueryData<Person>(["people", id]);
      return person?.fullName ?? null;
    }
    default:
      return null;
  }
}
