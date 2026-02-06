import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { PageHeader } from "../components/page-header";
import { DataTable } from "../components/data-table";
import { ConfirmDialog } from "../components/confirm-dialog";
import { PersonFormDialog } from "../components/people/person-form-dialog";
import { PeopleToolbar } from "../components/people/people-toolbar";
import { getPersonColumns } from "../components/people/columns";
import {
  usePeople,
  useCreatePerson,
  useUpdatePerson,
  useArchivePerson,
} from "../hooks/use-people";
import { useLocations } from "../hooks/use-locations";
import type { Person } from "../types/person";
import type { PersonFormValues } from "../lib/schemas/person";

export default function PeoplePage() {
  const { data: people, isLoading, isError } = usePeople();
  const { data: locations } = useLocations();
  const createMutation = useCreatePerson();
  const updateMutation = useUpdatePerson();
  const archiveMutation = useArchivePerson();

  const [formOpen, setFormOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [archivingPerson, setArchivingPerson] = useState<Person | null>(null);

  const columns = useMemo(
    () =>
      getPersonColumns({
        onEdit: (person) => {
          setEditingPerson(person);
          setFormOpen(true);
        },
        onArchive: (person) => {
          setArchivingPerson(person);
        },
      }),
    [],
  );

  function handleFormSubmit(values: PersonFormValues) {
    const data = {
      fullName: values.fullName,
      email: values.email || null,
      department: values.department || null,
      jobTitle: values.jobTitle || null,
      locationId:
        values.locationId && values.locationId !== "none"
          ? values.locationId
          : null,
    };

    if (editingPerson) {
      updateMutation.mutate(
        { id: editingPerson.id, data },
        {
          onSuccess: () => {
            toast.success("Person updated");
            setFormOpen(false);
            setEditingPerson(null);
          },
          onError: () => {
            toast.error("Failed to update person");
          },
        },
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          toast.success("Person created");
          setFormOpen(false);
        },
        onError: () => {
          toast.error("Failed to create person");
        },
      });
    }
  }

  function handleArchive() {
    if (!archivingPerson) return;
    archiveMutation.mutate(archivingPerson.id, {
      onSuccess: () => {
        toast.success("Person deleted");
        setArchivingPerson(null);
      },
      onError: () => {
        toast.error("Failed to delete person");
      },
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="People" />
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
        <PageHeader title="People" />
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load people. Is the API running?
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="People"
        description="Manage people for asset assignment."
        actions={
          <Button
            onClick={() => {
              setEditingPerson(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Person
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={people ?? []}
        toolbar={(table) => <PeopleToolbar table={table} />}
      />

      <PersonFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingPerson(null);
        }}
        person={editingPerson}
        locations={locations ?? []}
        onSubmit={handleFormSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={!!archivingPerson}
        onOpenChange={(open) => {
          if (!open) setArchivingPerson(null);
        }}
        title="Delete person"
        description={`Are you sure you want to delete "${archivingPerson?.fullName}"? This action can be undone later.`}
        confirmLabel="Delete"
        onConfirm={handleArchive}
        loading={archiveMutation.isPending}
      />
    </div>
  );
}
