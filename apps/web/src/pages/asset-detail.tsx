import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Pencil } from "lucide-react";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { AssetStatusBadge } from "../components/assets/asset-status-badge";
import { AssetHistoryTimeline } from "../components/assets/asset-history-timeline";
import { AssetHistoryDialog } from "../components/assets/asset-history-dialog";
import { AssetFormDialog } from "../components/assets/asset-form-dialog";
import {
  useAsset,
  useAssetHistory,
  useUpdateAsset,
} from "../hooks/use-assets";
import { useAssetTypes } from "../hooks/use-asset-types";
import { useLocations } from "../hooks/use-locations";
import type { AssetFormValues } from "../lib/schemas/asset";

function InfoItem({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium mt-0.5">{value || "—"}</dd>
    </div>
  );
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(value: number | null): string | null {
  if (value == null) return null;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value);
}

const HISTORY_PREVIEW_LIMIT = 5;

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: asset, isLoading, isError } = useAsset(id!);
  const { data: history, isLoading: historyLoading } = useAssetHistory(id!, HISTORY_PREVIEW_LIMIT);
  const { data: assetTypes } = useAssetTypes();
  const { data: locations } = useLocations();
  const updateMutation = useUpdateAsset();

  const [formOpen, setFormOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  function handleFormSubmit(values: AssetFormValues) {
    if (!asset) return;

    const data = {
      name: values.name,
      assetTag: values.assetTag,
      serialNumber: values.serialNumber || null,
      status: values.status || "Available",
      assetTypeId: values.assetTypeId,
      locationId:
        values.locationId && values.locationId !== "none"
          ? values.locationId
          : null,
      assignedPersonId:
        values.assignedPersonId && values.assignedPersonId !== "none"
          ? values.assignedPersonId
          : null,
      purchaseDate: values.purchaseDate
        ? `${values.purchaseDate}T00:00:00Z`
        : null,
      purchaseCost: values.purchaseCost
        ? parseFloat(values.purchaseCost)
        : null,
      warrantyExpiryDate: values.warrantyExpiryDate
        ? `${values.warrantyExpiryDate}T00:00:00Z`
        : null,
      notes: values.notes || null,
    };

    updateMutation.mutate(
      { id: asset.id, data },
      {
        onSuccess: () => {
          toast.success("Asset updated");
          setFormOpen(false);
        },
        onError: () => {
          toast.error("Failed to update asset");
        },
      },
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isError || !asset) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/assets")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Assets
        </Button>
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Asset not found or failed to load.
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
          <Button variant="ghost" size="icon" onClick={() => navigate("/assets")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {asset.name}
              </h1>
              <AssetStatusBadge status={asset.status} />
            </div>
            <p className="text-sm text-muted-foreground">{asset.assetTag}</p>
          </div>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Details card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              <InfoItem label="Asset Tag" value={asset.assetTag} />
              <InfoItem label="Name" value={asset.name} />
              <InfoItem label="Type" value={asset.assetTypeName} />
              <InfoItem label="Serial Number" value={asset.serialNumber} />
              <InfoItem label="Location" value={asset.locationName} />
              <InfoItem label="Assigned To" value={asset.assignedPersonName} />
              <InfoItem label="Purchase Date" value={formatDate(asset.purchaseDate)} />
              <InfoItem label="Purchase Cost" value={formatCurrency(asset.purchaseCost)} />
              <InfoItem label="Warranty Expiry" value={formatDate(asset.warrantyExpiryDate)} />
              <InfoItem label="Status" value={asset.status} />
            </dl>
            {asset.notes && (
              <div className="mt-4 pt-4 border-t">
                <dt className="text-sm text-muted-foreground">Notes</dt>
                <dd className="text-sm mt-0.5 whitespace-pre-wrap">{asset.notes}</dd>
              </div>
            )}
          </CardContent>
        </Card>

        {/* History card */}
        <Card>
          <CardHeader>
            <CardTitle>History</CardTitle>
          </CardHeader>
          <CardContent>
            <AssetHistoryTimeline
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

      <AssetFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        asset={asset}
        assetTypes={assetTypes ?? []}
        locations={locations ?? []}
        onSubmit={handleFormSubmit}
        loading={updateMutation.isPending}
      />

      <AssetHistoryDialog
        assetId={asset.id}
        assetName={asset.name}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />
    </div>
  );
}
