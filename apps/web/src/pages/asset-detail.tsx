import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Pencil, LogOut, LogIn, Archive, PoundSterling } from "lucide-react";
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
import { CheckoutDialog } from "../components/assets/checkout-dialog";
import { CheckinDialog } from "../components/assets/checkin-dialog";
import { RetireAssetDialog } from "../components/assets/retire-asset-dialog";
import { SellAssetDialog } from "../components/assets/sell-asset-dialog";
import {
  useAsset,
  useAssetHistory,
  useUpdateAsset,
  useCheckoutAsset,
  useCheckinAsset,
  useRetireAsset,
  useSellAsset,
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

function formatCustomFieldValue(value: string | null, fieldType: string): string | null {
  if (!value) return null;
  switch (fieldType) {
    case "Boolean":
      return value === "true" ? "Yes" : "No";
    case "Date":
      return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    case "MultiSelect": {
      try {
        const arr = JSON.parse(value);
        if (Array.isArray(arr)) return arr.join(", ");
      } catch { /* fall through */ }
      return value;
    }
    default:
      return value;
  }
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
  const checkoutMutation = useCheckoutAsset();
  const checkinMutation = useCheckinAsset();
  const retireMutation = useRetireAsset();
  const sellMutation = useSellAsset();

  const [formOpen, setFormOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [retireOpen, setRetireOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);

  function handleFormSubmit(values: AssetFormValues) {
    if (!asset) return;

    const customFieldValues = Object.entries(values.customFieldValues ?? {})
      .filter(([, v]) => v != null && v !== "" && v !== "__none__")
      .map(([fieldDefinitionId, value]) => ({
        fieldDefinitionId,
        value: value!,
      }));

    const data = {
      name: values.name,
      serialNumber: values.serialNumber,
      status: values.status || "Available",
      assetTypeId: values.assetTypeId,
      locationId: values.locationId,
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
      depreciationMonths: values.depreciationMonths
        ? parseInt(values.depreciationMonths, 10)
        : null,
      notes: values.notes || null,
      customFieldValues,
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
            <p className="text-sm text-muted-foreground">{asset.serialNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {asset.status !== "Retired" && asset.status !== "Sold" && asset.status !== "Archived" && (
            <>
              {(asset.status === "Available" || asset.status === "Assigned") && (
                <Button variant="outline" onClick={() => setCheckoutOpen(true)}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Check Out
                </Button>
              )}
              {asset.status === "CheckedOut" && (
                <Button variant="outline" onClick={() => setCheckinOpen(true)}>
                  <LogIn className="mr-2 h-4 w-4" />
                  Check In
                </Button>
              )}
              <Button variant="outline" onClick={() => setRetireOpen(true)}>
                <Archive className="mr-2 h-4 w-4" />
                Retire
              </Button>
              <Button variant="outline" onClick={() => setSellOpen(true)}>
                <PoundSterling className="mr-1 h-4 w-4" />
                Mark as Sold
              </Button>
            </>
          )}
          <Button onClick={() => setFormOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Details card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              <InfoItem label="Name" value={asset.name} />
              <InfoItem label="Type" value={asset.assetTypeName} />
              <InfoItem label="Serial Number" value={asset.serialNumber} />
              <InfoItem label="Location" value={asset.locationName} />
              <InfoItem label="Assigned To" value={asset.assignedPersonName} />
              <InfoItem label="Purchase Date" value={formatDate(asset.purchaseDate)} />
              <InfoItem label="Purchase Cost" value={formatCurrency(asset.purchaseCost)} />
              <InfoItem label="Warranty Expiry" value={formatDate(asset.warrantyExpiryDate)} />
              <InfoItem label="Status" value={asset.status} />
              {asset.depreciationMonths != null && (
                <>
                  <InfoItem label="Depreciation Period" value={`${asset.depreciationMonths} months`} />
                  <InfoItem label="Monthly Depreciation" value={formatCurrency(asset.monthlyDepreciation)} />
                  <InfoItem label="Total Depreciation" value={formatCurrency(asset.totalDepreciation)} />
                  <InfoItem label="Book Value" value={formatCurrency(asset.bookValue)} />
                </>
              )}
              {asset.retiredDate && (
                <InfoItem label="Retired Date" value={formatDate(asset.retiredDate)} />
              )}
              {asset.soldDate && (
                <InfoItem label="Sold Date" value={formatDate(asset.soldDate)} />
              )}
              {asset.soldPrice != null && (
                <InfoItem label="Sold Price" value={formatCurrency(asset.soldPrice)} />
              )}
            </dl>
            {asset.customFieldValues && asset.customFieldValues.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-3">Custom Fields</p>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                  {asset.customFieldValues.map((cfv) => (
                    <InfoItem
                      key={cfv.fieldDefinitionId}
                      label={cfv.fieldName}
                      value={formatCustomFieldValue(cfv.value, cfv.fieldType)}
                    />
                  ))}
                </dl>
              </div>
            )}
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

      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        assetName={asset.name}
        onSubmit={(personId, notes) => {
          checkoutMutation.mutate(
            { id: asset.id, data: { personId, notes } },
            {
              onSuccess: () => {
                toast.success("Asset checked out");
                setCheckoutOpen(false);
              },
              onError: () => {
                toast.error("Failed to check out asset");
              },
            },
          );
        }}
        loading={checkoutMutation.isPending}
      />

      <CheckinDialog
        open={checkinOpen}
        onOpenChange={setCheckinOpen}
        assetName={asset.name}
        assignedPersonName={asset.assignedPersonName}
        onSubmit={(notes) => {
          checkinMutation.mutate(
            { id: asset.id, data: { notes } },
            {
              onSuccess: () => {
                toast.success("Asset checked in");
                setCheckinOpen(false);
              },
              onError: () => {
                toast.error("Failed to check in asset");
              },
            },
          );
        }}
        loading={checkinMutation.isPending}
      />

      <RetireAssetDialog
        open={retireOpen}
        onOpenChange={setRetireOpen}
        assetName={asset.name}
        onSubmit={(notes) => {
          retireMutation.mutate(
            { id: asset.id, data: { notes } },
            {
              onSuccess: () => {
                toast.success("Asset retired");
                setRetireOpen(false);
              },
              onError: () => {
                toast.error("Failed to retire asset");
              },
            },
          );
        }}
        loading={retireMutation.isPending}
      />

      <SellAssetDialog
        open={sellOpen}
        onOpenChange={setSellOpen}
        assetName={asset.name}
        onSubmit={(soldPrice, soldDate, notes) => {
          sellMutation.mutate(
            { id: asset.id, data: { soldPrice, soldDate, notes } },
            {
              onSuccess: () => {
                toast.success("Asset marked as sold");
                setSellOpen(false);
              },
              onError: () => {
                toast.error("Failed to mark asset as sold");
              },
            },
          );
        }}
        loading={sellMutation.isPending}
      />
    </div>
  );
}
