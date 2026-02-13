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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { AssetStatusBadge } from "../components/assets/asset-status-badge";
import { PersonHistoryTimeline } from "../components/people/person-history-timeline";
import { PersonFormDialog } from "../components/people/person-form-dialog";
import { ConfirmDialog } from "../components/confirm-dialog";
import {
  usePerson,
  usePersonHistory,
  usePersonAssets,
  useUpdatePerson,
  useArchivePerson,
} from "../hooks/use-people";
import { useLocations } from "../hooks/use-locations";
import type { PersonFormValues } from "../lib/schemas/person";
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

const HISTORY_PREVIEW_LIMIT = 5;

export default function PersonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: person, isLoading, isError } = usePerson(id!);
  const { data: history, isLoading: historyLoading } = usePersonHistory(id!, HISTORY_PREVIEW_LIMIT);
  const { data: allHistory, isLoading: allHistoryLoading } = usePersonHistory(id!);
  const { data: assignedAssets, isLoading: assetsLoading } = usePersonAssets(id!);
  const { data: locations } = useLocations();
  const updateMutation = useUpdatePerson();
  const archiveMutation = useArchivePerson();

  const [formOpen, setFormOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  function handleFormSubmit(values: PersonFormValues) {
    if (!person) return;

    const data = {
      fullName: values.fullName,
      email: values.email || null,
      department: values.department || null,
      jobTitle: values.jobTitle || null,
      locationId: values.locationId && values.locationId !== "none" ? values.locationId : null,
    };

    updateMutation.mutate(
      { id: person.id, data },
      {
        onSuccess: () => {
          toast.success("Person updated");
          setFormOpen(false);
        },
        onError: () => {
          toast.error("Failed to update person");
        },
      },
    );
  }

  function handleArchive() {
    if (!person) return;

    archiveMutation.mutate(person.id, {
      onSuccess: () => {
        toast.success("Person archived");
        navigate("/people");
      },
      onError: () => {
        toast.error("Failed to archive person");
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

  if (isError || !person) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/people")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to People
        </Button>
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Person not found or failed to load.
        </div>
      </div>
    );
  }

  const hasMoreHistory = history && history.length >= HISTORY_PREVIEW_LIMIT;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/people")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {person.fullName}
            </h1>
            {person.jobTitle && (
              <p className="text-sm text-muted-foreground">{person.jobTitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!person.isArchived && (
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

      <div className="grid gap-6 md:grid-cols-3">
        {/* Details card */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                <InfoItem label="Full Name" value={person.fullName} />
                <InfoItem label="Email" value={person.email} />
                <InfoItem label="Department" value={person.department} />
                <InfoItem label="Job Title" value={person.jobTitle} />
                <InfoItem label="Location" value={person.locationName} />
                <InfoItem label="Created" value={formatDate(person.createdAt)} />
                <InfoItem label="Last Updated" value={formatDate(person.updatedAt)} />
              </dl>
            </CardContent>
          </Card>

          {/* Assigned Assets card */}
          <Card>
            <CardHeader>
              <CardTitle>Assigned Assets</CardTitle>
            </CardHeader>
            <CardContent>
              {assetsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : !assignedAssets || assignedAssets.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No assets currently assigned.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Location</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignedAssets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell>
                          <Link
                            to={`/assets/${asset.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {asset.name}
                          </Link>
                        </TableCell>
                        <TableCell>{asset.assetTypeName}</TableCell>
                        <TableCell>
                          <AssetStatusBadge status={asset.status as AssetStatus} />
                        </TableCell>
                        <TableCell>{asset.locationName || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* History card */}
        <Card>
          <CardHeader>
            <CardTitle>History</CardTitle>
          </CardHeader>
          <CardContent>
            <PersonHistoryTimeline
              history={history}
              isLoading={historyLoading}
            />
            {hasMoreHistory && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2"
                onClick={() => setHistoryOpen(true)}
              >
                View All History
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <PersonFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        person={person}
        locations={locations ?? []}
        onSubmit={handleFormSubmit}
        loading={updateMutation.isPending}
      />

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Archive Person"
        description={`Are you sure you want to archive "${person.fullName}"? This person will be hidden from lists but can be restored later.`}
        confirmLabel="Archive"
        loading={archiveMutation.isPending}
        onConfirm={handleArchive}
      />

      {/* Full History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>History — {person.fullName}</DialogTitle>
          </DialogHeader>
          <PersonHistoryTimeline
            history={allHistory}
            isLoading={allHistoryLoading}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
