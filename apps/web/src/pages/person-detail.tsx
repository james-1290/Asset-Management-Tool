import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Pencil, Archive, UserMinus, UserRound, History, ChevronRight, Maximize2 } from "lucide-react";
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
import { DetailCard, SectionHeader, DetailRow } from "../components/detail-layout";
import { AssetStatusBadge } from "../components/assets/asset-status-badge";
import { PersonHistoryTimeline } from "../components/people/person-history-timeline";
import { PersonHistoryDialog } from "../components/people/person-history-dialog";
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

const HISTORY_PREVIEW_LIMIT = 5;

export default function PersonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: person, isLoading, isError } = usePerson(id!);
  const { data: allHistory, isLoading: allHistoryLoading } = usePersonHistory(id!, HISTORY_PREVIEW_LIMIT);
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
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("assets");

  const detailsRef = useRef<HTMLDivElement>(null);
  const [detailsHeight, setDetailsHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!detailsRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setDetailsHeight(entry.contentRect.height);
    });
    observer.observe(detailsRef.current);
    return () => observer.disconnect();
  }, [person]);

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
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
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
  const hasMoreHistory = allHistory && allHistory.length >= HISTORY_PREVIEW_LIMIT;
  const initials = person.fullName
    .split(" ")
    .map((n) => n.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
        <Link to="/people" className="hover:text-primary transition-colors">
          People
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{person.fullName}</span>
      </div>

      {/* Hero Card */}
      <DetailCard className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-5">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-2xl font-bold text-muted-foreground">
            {initials}
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{person.fullName}</h1>
              {!person.isArchived ? (
                <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-green-50 text-green-700 dark:bg-green-900/10 dark:text-green-400">
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  Archived
                </span>
              )}
            </div>
            {person.jobTitle && (
              <p className="text-sm text-muted-foreground">{person.jobTitle}</p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {!person.isArchived && (
            <Button variant="outline" size="sm" onClick={() => setArchiveOpen(true)}>
              <Archive className="mr-1.5 h-3.5 w-3.5" />
              Archive
            </Button>
          )}
          {!person.isArchived && hasAssignments && (
            <Button variant="outline" size="sm" onClick={() => setOffboardOpen(true)}>
              <UserMinus className="mr-1.5 h-3.5 w-3.5" />
              Offboard
            </Button>
          )}
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
        </div>
      </DetailCard>

      {/* Details + History side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2" ref={detailsRef}>
          <DetailCard>
            <SectionHeader icon={UserRound} title="Details" />
            <div className="space-y-3">
              <DetailRow label="Full name" value={person.fullName} />
              <DetailRow label="Email" value={person.email || "—"} />
              <DetailRow label="Department" value={person.department || "—"} />
              <DetailRow label="Job title" value={person.jobTitle || "—"} />
              <DetailRow label="Location" value={person.locationName || "—"} />
              <DetailRow label="Created" value={formatDate(person.createdAt) ?? "—"} />
              <DetailRow label="Last updated" value={formatDate(person.updatedAt) ?? "—"} />
            </div>
          </DetailCard>
        </div>

        <DetailCard
          className="flex flex-col overflow-hidden"
          style={{ maxHeight: detailsHeight ? `${detailsHeight}px` : undefined }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <History className="h-[18px] w-[18px] text-primary" />
              <h3 className="text-sm font-bold text-foreground">History</h3>
            </div>
            {hasMoreHistory && (
              <button
                className="text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setHistoryOpen(true)}
                title="View full history"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            <PersonHistoryTimeline
              history={allHistory}
              isLoading={allHistoryLoading}
            />
          </div>
        </DetailCard>
      </div>

      {/* Tabbed Section */}
      <DetailCard className="!p-0 overflow-hidden">
        {/* Tab bar */}
        <div className="border-b flex overflow-x-auto">
          {(["assets", "certificates", "applications"] as const).map((tab) => (
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
              {tab === "assets" ? "Assets" : tab === "certificates" ? "Certificates" : "Applications"}
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

        </div>
      </DetailCard>

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

      <PersonHistoryDialog
        personId={person.id}
        personName={person.fullName}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
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
