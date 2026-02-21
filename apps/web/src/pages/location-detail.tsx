import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { ApiError } from "../lib/api-client";
import type { Location, LocationItemCounts } from "../types/location";
import { Pencil, Trash2, Info, MapPin, Package, Users, ChevronRight } from "lucide-react";
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
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
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
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-xl bg-muted flex items-center justify-center">
              <MapPin className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{location.name}</h1>
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!location.isArchived && (
              <Button variant="outline" onClick={() => setArchiveOpen(true)} className="font-semibold">
                <Trash2 className="mr-2 h-4 w-4" />
                Archive
              </Button>
            )}
            <Button onClick={() => setFormOpen(true)} className="font-semibold shadow-lg">
              <Pencil className="mr-2 h-4 w-4" />
              Edit Details
            </Button>
          </div>
        </div>
        {/* Breadcrumbs */}
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground font-medium">
          <Link to="/locations" className="hover:text-primary">Locations</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{location.name}</span>
        </div>
      </div>

      {/* Location Details */}
      <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b flex items-center">
          <h3 className="font-bold flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            Location Details
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-12 gap-y-6">
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Name</p>
              <p className="text-sm font-medium">{location.name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Address</p>
              <p className="text-sm font-medium">{location.address || "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">City</p>
              <p className="text-sm font-medium">{location.city || "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Country</p>
              <p className="text-sm font-medium">{location.country || "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Created</p>
              <p className="text-sm font-medium">{formatDate(location.createdAt) ?? "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Last Updated</p>
              <p className="text-sm font-medium">{formatDate(location.updatedAt) ?? "—"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Assets at this location */}
      <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b flex items-center">
          <h3 className="font-bold flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Assets at this Location
            {assets && assets.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded bg-muted text-[10px] font-bold text-muted-foreground">
                {assets.length}
              </span>
            )}
          </h3>
        </div>
        <div className="p-6">
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
                  <TableHead>Assigned To</TableHead>
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
                    <TableCell>
                      {asset.assignedPersonName || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* People at this location */}
      <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b flex items-center">
          <h3 className="font-bold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            People at this Location
            {people && people.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded bg-muted text-[10px] font-bold text-muted-foreground">
                {people.length}
              </span>
            )}
          </h3>
        </div>
        <div className="p-6">
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
                  <TableHead>Email</TableHead>
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
                    <TableCell>{person.email || "—"}</TableCell>
                    <TableCell>{person.department || "—"}</TableCell>
                    <TableCell>{person.jobTitle || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
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
