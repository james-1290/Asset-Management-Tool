import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Pencil, Archive, UserMinus, Info, ChevronRight } from "lucide-react";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { Badge } from "../components/ui/badge";
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
import { OffboardDialog } from "../components/people/offboard-dialog";
import { ConfirmDialog } from "../components/confirm-dialog";
import {
  usePerson,
  usePersonHistory,
  usePersonAssets,
  usePersonSummary,
  usePersonCertificates,
  usePersonApplications,
  useUpdatePerson,
  useArchivePerson,
} from "../hooks/use-people";
import { useLocations } from "../hooks/use-locations";
import type { PersonFormValues } from "../lib/schemas/person";
import type { AssetStatus } from "../types/asset";

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === "Active" ? "default"
    : status === "Expired" ? "destructive"
    : "secondary";
  return <Badge variant={variant}>{status}</Badge>;
}

export default function PersonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: person, isLoading, isError } = usePerson(id!);
  const { data: allHistory, isLoading: allHistoryLoading } = usePersonHistory(id!);
  const { data: assignedAssets, isLoading: assetsLoading } = usePersonAssets(id!);
  const { data: summary } = usePersonSummary(id!);
  const { data: certificates, isLoading: certsLoading } = usePersonCertificates(id!);
  const { data: applications, isLoading: appsLoading } = usePersonApplications(id!);
  const { data: locations } = useLocations();
  const updateMutation = useUpdatePerson();
  const archiveMutation = useArchivePerson();

  const [formOpen, setFormOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [offboardOpen, setOffboardOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("assets");

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
          Back to People
        </Button>
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Person not found or failed to load.
        </div>
      </div>
    );
  }

  const hasAssignments = (summary?.assetCount ?? 0) + (summary?.certificateCount ?? 0) + (summary?.applicationCount ?? 0) > 0;
  const initials = person.fullName
    .split(" ")
    .map((n) => n.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-8">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
        <Link to="/people" className="hover:text-primary">People</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{person.fullName}</span>
      </div>

      {/* Profile Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-24 h-24 rounded-full border-4 border-background shadow-sm overflow-hidden bg-muted flex items-center justify-center">
            <span className="text-2xl font-bold text-muted-foreground">{initials}</span>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{person.fullName}</h1>
              {!person.isArchived ? (
                <span className="px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 text-xs font-semibold uppercase tracking-wider">Active</span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Archived</span>
              )}
            </div>
            {person.jobTitle && (
              <p className="text-muted-foreground mt-1 text-lg">{person.jobTitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!person.isArchived && (
            <Button variant="outline" onClick={() => setArchiveOpen(true)} className="font-semibold">
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </Button>
          )}
          {!person.isArchived && hasAssignments && (
            <Button variant="outline" onClick={() => setOffboardOpen(true)} className="font-semibold">
              <UserMinus className="mr-2 h-4 w-4" />
              Offboard
            </Button>
          )}
          <Button onClick={() => setFormOpen(true)} className="font-semibold shadow-lg">
            <Pencil className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
        </div>
      </div>

      {/* Details Card */}
      <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
        <div className="px-8 py-5 flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          <h3 className="text-lg font-bold">Details</h3>
        </div>
        <div className="px-8 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-y-8 gap-x-12">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Full Name</p>
              <p className="text-sm font-medium">{person.fullName}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Email</p>
              <p className="text-sm font-medium">{person.email || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Department</p>
              <p className="text-sm font-medium">{person.department || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Job Title</p>
              <p className="text-sm font-medium">{person.jobTitle || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Location</p>
              <p className="text-sm font-medium">{person.locationName || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Created</p>
              <p className="text-sm font-medium">{formatDate(person.createdAt) ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Last Updated</p>
              <p className="text-sm font-medium">{formatDate(person.updatedAt) ?? "—"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabbed Section */}
      <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
        {/* Tab bar */}
        <div className="border-b flex overflow-x-auto">
          {(["assets", "certificates", "applications", "history"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? "border-b-2 border-primary text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "assets" ? "Assets" : tab === "certificates" ? "Certificates" : tab === "applications" ? "Applications" : "History"}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div>
          {/* Assets Tab */}
          {activeTab === "assets" && (
            <div>
              {assetsLoading ? (
                <div className="p-6 space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : !assignedAssets || assignedAssets.length === 0 ? (
                <div className="p-6">
                  <p className="text-sm text-muted-foreground">No assets currently assigned.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Location</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignedAssets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell>
                          <Link to={`/assets/${asset.id}`} className="font-medium text-primary hover:underline">
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
            </div>
          )}

          {/* Certificates Tab */}
          {activeTab === "certificates" && (
            <div>
              {certsLoading ? (
                <div className="p-6 space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : !certificates || certificates.length === 0 ? (
                <div className="p-6">
                  <p className="text-sm text-muted-foreground">No certificates currently assigned.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expiry Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {certificates.map((cert) => (
                      <TableRow key={cert.id}>
                        <TableCell>
                          <Link to={`/certificates/${cert.id}`} className="font-medium text-primary hover:underline">
                            {cert.name}
                          </Link>
                        </TableCell>
                        <TableCell>{cert.certificateTypeName}</TableCell>
                        <TableCell>
                          <StatusBadge status={cert.status} />
                        </TableCell>
                        <TableCell>{formatDate(cert.expiryDate) || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}

          {/* Applications Tab */}
          {activeTab === "applications" && (
            <div>
              {appsLoading ? (
                <div className="p-6 space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : !applications || applications.length === 0 ? (
                <div className="p-6">
                  <p className="text-sm text-muted-foreground">No applications currently assigned.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Licence</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expiry Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applications.map((app) => (
                      <TableRow key={app.id}>
                        <TableCell>
                          <Link to={`/applications/${app.id}`} className="font-medium text-primary hover:underline">
                            {app.name}
                          </Link>
                        </TableCell>
                        <TableCell>{app.applicationTypeName}</TableCell>
                        <TableCell>{app.licenceType || "—"}</TableCell>
                        <TableCell>
                          <StatusBadge status={app.status} />
                        </TableCell>
                        <TableCell>{formatDate(app.expiryDate) || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === "history" && (
            <div className="p-6">
              <PersonHistoryTimeline
                history={allHistory}
                isLoading={allHistoryLoading}
              />
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
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

      <OffboardDialog
        open={offboardOpen}
        onOpenChange={setOffboardOpen}
        personId={person.id}
        personName={person.fullName}
        assets={assignedAssets ?? []}
        certificates={certificates ?? []}
        applications={applications ?? []}
      />
    </div>
  );
}
