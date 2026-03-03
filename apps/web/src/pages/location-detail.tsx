import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { ApiError } from "../lib/api-client";
import type { Location, LocationItemCounts } from "../types/location";
import { Pencil, Trash2, MapPin, Package, Users, ChevronRight } from "lucide-react";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { DetailCard, SectionHeader, DetailRow } from "../components/detail-layout";
import { AssetStatusBadge } from "../components/assets/asset-status-badge";
import { LocationFormDialog } from "../components/locations/location-form-dialog";
import { ReassignLocationDialog } from "../components/locations/reassign-location-dialog";
import { ConfirmDialog } from "../components/confirm-dialog";
import {
  useLocation,
  useLocationAssets,
  useLocationPeople,
  useUpdateLocation,
  useArchiveLocation,
} from "../hooks/use-locations";
import type { LocationFormValues } from "../lib/schemas/location";
import type { AssetStatus } from "../types/asset";

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function LocationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: location, isLoading, isError } = useLocation(id!);
  const { data: assets, isLoading: assetsLoading } = useLocationAssets(id!);
  const { data: people, isLoading: peopleLoading } = useLocationPeople(id!);
  const updateMutation = useUpdateLocation();
  const archiveMutation = useArchiveLocation();

  const [formOpen, setFormOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [reassignState, setReassignState] = useState<{
    location: Location;
    counts: LocationItemCounts;
  } | null>(null);

  function handleFormSubmit(values: LocationFormValues) {
    if (!location) return;

    const data = {
      name: values.name,
      address: values.address || null,
      city: values.city || null,
      country: values.country || null,
    };

    updateMutation.mutate(
      { id: location.id, data },
      {
        onSuccess: () => {
          toast.success("Location updated");
          setFormOpen(false);
        },
        onError: () => {
          toast.error("Failed to update location");
        },
      },
    );
  }

  function handleArchive() {
    if (!location) return;

    archiveMutation.mutate(location.id, {
      onSuccess: () => {
        toast.success("Location archived");
        navigate("/locations");
      },
      onError: (error) => {
        if (error instanceof ApiError && error.status === 409 && error.body && typeof error.body === "object" && "counts" in error.body) {
          const body = error.body as { counts: LocationItemCounts };
          setArchiveOpen(false);
          setReassignState({ location, counts: body.counts });
        } else if (error instanceof ApiError && error.body && typeof error.body === "object" && "message" in error.body) {
          toast.error((error.body as { message: string }).message);
        } else {
          toast.error("Failed to archive location");
        }
      },
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !location) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/locations")}>
          Back to Locations
        </Button>
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Location not found or failed to load.
        </div>
      </div>
    );
  }

  const subtitle = [location.address, location.city, location.country]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
        <Link to="/locations" className="hover:text-primary transition-colors">
          Locations
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{location.name}</span>
      </div>

      {/* Hero Card */}
      <DetailCard className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-5">
          <div className="size-20 rounded-xl bg-muted flex items-center justify-center">
            <MapPin className="h-9 w-9 text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight">{location.name}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {!location.isArchived && (
            <Button variant="outline" size="sm" onClick={() => setArchiveOpen(true)}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Archive
            </Button>
          )}
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit Details
          </Button>
        </div>
      </DetailCard>

      {/* Location Details */}
      <DetailCard>
        <SectionHeader icon={MapPin} title="Location details" />
        <div className="space-y-3">
          <DetailRow label="Name" value={location.name} />
          <DetailRow label="Address" value={location.address || "—"} />
          <DetailRow label="City" value={location.city || "—"} />
          <DetailRow label="Country" value={location.country || "—"} />
          <DetailRow label="Created" value={formatDate(location.createdAt) ?? "—"} />
          <DetailRow label="Last updated" value={formatDate(location.updatedAt) ?? "—"} />
        </div>
      </DetailCard>

      {/* Assets + People side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Assets at this location */}
        <DetailCard>
          <div className="mb-4 flex items-center gap-2.5">
            <Package className="h-[18px] w-[18px] text-primary" />
            <h3 className="text-sm font-bold text-foreground">Assets at this location</h3>
            {assets && assets.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded bg-muted text-xs font-bold text-muted-foreground">
                {assets.length}
              </span>
            )}
          </div>
          {assetsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : !assets || assets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No assets at this location.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell>
                      <Link
                        to={`/assets/${asset.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {asset.name}
                      </Link>
                    </TableCell>
                    <TableCell>{asset.assetTypeName || "—"}</TableCell>
                    <TableCell>
                      <AssetStatusBadge status={asset.status as AssetStatus} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DetailCard>

        {/* People at this location */}
        <DetailCard>
          <div className="mb-4 flex items-center gap-2.5">
            <Users className="h-[18px] w-[18px] text-primary" />
            <h3 className="text-sm font-bold text-foreground">People at this location</h3>
            {people && people.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded bg-muted text-xs font-bold text-muted-foreground">
                {people.length}
              </span>
            )}
          </div>
          {peopleLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : !people || people.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No people at this location.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Job Title</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {people.map((person) => (
                  <TableRow key={person.id}>
                    <TableCell>
                      <Link
                        to={`/people/${person.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {person.fullName}
                      </Link>
                    </TableCell>
                    <TableCell>{person.department || "—"}</TableCell>
                    <TableCell>{person.jobTitle || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DetailCard>
      </div>

      {/* Dialogs */}
      <LocationFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
        }}
        location={location}
        onSubmit={handleFormSubmit}
        loading={updateMutation.isPending}
      />

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Archive Location"
        description={`Are you sure you want to archive "${location.name}"? This location will be hidden from lists but can be restored later.`}
        confirmLabel="Archive"
        loading={archiveMutation.isPending}
        onConfirm={handleArchive}
      />

      {reassignState && (
        <ReassignLocationDialog
          open={true}
          onOpenChange={(open) => { if (!open) setReassignState(null); }}
          location={reassignState.location}
          counts={reassignState.counts}
          onSuccess={() => {
            setReassignState(null);
            navigate("/locations");
          }}
        />
      )}
    </div>
  );
}
