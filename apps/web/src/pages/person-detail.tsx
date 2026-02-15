import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Trash2, Monitor, Award, AppWindow, History, UserMinus } from "lucide-react";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { Badge } from "../components/ui/badge";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
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

function InfoItem({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium mt-0.5">{value || "\u2014"}</dd>
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
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to People
        </Button>
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Person not found or failed to load.
        </div>
      </div>
    );
  }

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
          {!person.isArchived && (summary?.assetCount ?? 0) + (summary?.certificateCount ?? 0) + (summary?.applicationCount ?? 0) > 0 && (
            <Button variant="outline" onClick={() => setOffboardOpen(true)}>
              <UserMinus className="mr-2 h-4 w-4" />
              Offboard
            </Button>
          )}
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

      {/* Summary Strip */}
      <div className="flex items-center gap-6 rounded-lg border bg-card px-6 py-3">
        <button
          type="button"
          className={`flex items-center gap-2 text-sm transition-colors hover:text-primary ${activeTab === "assets" ? "text-primary font-semibold" : "text-muted-foreground"}`}
          onClick={() => setActiveTab("assets")}
        >
          <Monitor className="h-4 w-4" />
          <span className="tabular-nums font-semibold">{summary?.assetCount ?? "\u2014"}</span>
          <span>Assets</span>
        </button>
        <span className="text-border">|</span>
        <button
          type="button"
          className={`flex items-center gap-2 text-sm transition-colors hover:text-primary ${activeTab === "certificates" ? "text-primary font-semibold" : "text-muted-foreground"}`}
          onClick={() => setActiveTab("certificates")}
        >
          <Award className="h-4 w-4" />
          <span className="tabular-nums font-semibold">{summary?.certificateCount ?? "\u2014"}</span>
          <span>Certificates</span>
        </button>
        <span className="text-border">|</span>
        <button
          type="button"
          className={`flex items-center gap-2 text-sm transition-colors hover:text-primary ${activeTab === "applications" ? "text-primary font-semibold" : "text-muted-foreground"}`}
          onClick={() => setActiveTab("applications")}
        >
          <AppWindow className="h-4 w-4" />
          <span className="tabular-nums font-semibold">{summary?.applicationCount ?? "\u2014"}</span>
          <span>Applications</span>
        </button>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
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

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="assets">
            <Monitor className="mr-1.5 h-3.5 w-3.5" />
            Assets
          </TabsTrigger>
          <TabsTrigger value="certificates">
            <Award className="mr-1.5 h-3.5 w-3.5" />
            Certificates
          </TabsTrigger>
          <TabsTrigger value="applications">
            <AppWindow className="mr-1.5 h-3.5 w-3.5" />
            Applications
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="mr-1.5 h-3.5 w-3.5" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Assets Tab */}
        <TabsContent value="assets">
          <Card>
            <CardContent className="pt-6">
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
                        <TableCell>{asset.locationName || "\u2014"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Certificates Tab */}
        <TabsContent value="certificates">
          <Card>
            <CardContent className="pt-6">
              {certsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : !certificates || certificates.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No certificates currently assigned.
                </p>
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
                          <Link
                            to={`/certificates/${cert.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {cert.name}
                          </Link>
                        </TableCell>
                        <TableCell>{cert.certificateTypeName}</TableCell>
                        <TableCell>
                          <StatusBadge status={cert.status} />
                        </TableCell>
                        <TableCell>{formatDate(cert.expiryDate) || "\u2014"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Applications Tab */}
        <TabsContent value="applications">
          <Card>
            <CardContent className="pt-6">
              {appsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : !applications || applications.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No applications currently assigned.
                </p>
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
                          <Link
                            to={`/applications/${app.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {app.name}
                          </Link>
                        </TableCell>
                        <TableCell>{app.applicationTypeName}</TableCell>
                        <TableCell>{app.licenceType || "\u2014"}</TableCell>
                        <TableCell>
                          <StatusBadge status={app.status} />
                        </TableCell>
                        <TableCell>{formatDate(app.expiryDate) || "\u2014"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardContent className="pt-6">
              <PersonHistoryTimeline
                history={allHistory}
                isLoading={allHistoryLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
