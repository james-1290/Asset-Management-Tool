import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { PageHeader } from "../components/page-header";
import { DataTable } from "../components/data-table";
import { ConfirmDialog } from "../components/confirm-dialog";
import { LocationFormDialog } from "../components/locations/location-form-dialog";
import { LocationsToolbar } from "../components/locations/locations-toolbar";
import { getLocationColumns } from "../components/locations/columns";
import {
  useLocations,
  useCreateLocation,
  useUpdateLocation,
  useArchiveLocation,
} from "../hooks/use-locations";
import type { Location } from "../types/location";
import type { LocationFormValues } from "../lib/schemas/location";

export default function LocationsPage() {
  const { data: locations, isLoading, isError } = useLocations();
  const createMutation = useCreateLocation();
  const updateMutation = useUpdateLocation();
  const archiveMutation = useArchiveLocation();

  const [formOpen, setFormOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [archivingLocation, setArchivingLocation] = useState<Location | null>(
    null,
  );

  const columns = useMemo(
    () =>
      getLocationColumns({
        onEdit: (location) => {
          setEditingLocation(location);
          setFormOpen(true);
        },
        onArchive: (location) => {
          setArchivingLocation(location);
        },
      }),
    [],
  );

  function handleFormSubmit(values: LocationFormValues) {
    const data = {
      name: values.name,
      address: values.address || null,
      city: values.city || null,
      country: values.country || null,
    };

    if (editingLocation) {
      updateMutation.mutate(
        { id: editingLocation.id, data },
        {
          onSuccess: () => {
            toast.success("Location updated");
            setFormOpen(false);
            setEditingLocation(null);
          },
          onError: () => {
            toast.error("Failed to update location");
          },
        },
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          toast.success("Location created");
          setFormOpen(false);
        },
        onError: () => {
          toast.error("Failed to create location");
        },
      });
    }
  }

  function handleArchive() {
    if (!archivingLocation) return;
    archiveMutation.mutate(archivingLocation.id, {
      onSuccess: () => {
        toast.success("Location deleted");
        setArchivingLocation(null);
      },
      onError: () => {
        toast.error("Failed to delete location");
      },
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Locations" />
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Locations" />
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load locations. Is the API running?
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Locations"
        description="Manage offices, warehouses, and other locations."
        actions={
          <Button
            onClick={() => {
              setEditingLocation(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Location
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={locations ?? []}
        toolbar={(table) => <LocationsToolbar table={table} />}
      />

      <LocationFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingLocation(null);
        }}
        location={editingLocation}
        onSubmit={handleFormSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={!!archivingLocation}
        onOpenChange={(open) => {
          if (!open) setArchivingLocation(null);
        }}
        title="Delete location"
        description={`Are you sure you want to delete "${archivingLocation?.name}"? This action can be undone later.`}
        confirmLabel="Delete"
        onConfirm={handleArchive}
        loading={archiveMutation.isPending}
      />
    </div>
  );
}
