import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
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

function InfoItem({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium mt-0.5">{value || "—"}</dd>
    </div>
  );
}

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
      onError: () => {
        toast.error("Failed to archive location");
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
          <ArrowLeft className="mr-2 h-4 w-4" />
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/locations")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {location.name}
            </h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!location.isArchived && (
            <Button variant="outline" onClick={() => setArchiveOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Archive
            </Button>
          )}
          <Button onClick={() => setFormOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </div>
      </div>

      {/* Details card */}
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
            <InfoItem label="Name" value={location.name} />
            <InfoItem label="Address" value={location.address} />
            <InfoItem label="City" value={location.city} />
            <InfoItem label="Country" value={location.country} />
            <InfoItem label="Created" value={formatDate(location.createdAt)} />
            <InfoItem label="Last Updated" value={formatDate(location.updatedAt)} />
          </dl>
        </CardContent>
      </Card>

      {/* Assets at this location */}
      <Card>
        <CardHeader>
          <CardTitle>Assets at this Location</CardTitle>
        </CardHeader>
        <CardContent>
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
                  <TableHead>Asset Tag</TableHead>
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
                        {asset.assetTag}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        to={`/assets/${asset.id}`}
                        className="hover:underline"
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
        </CardContent>
      </Card>

      {/* People at this location */}
      <Card>
        <CardHeader>
          <CardTitle>People at this Location</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

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
    </div>
  );
}
