import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Pencil, Info, History, ChevronRight, LogOut, LogIn, Archive, PoundSterling, Copy } from "lucide-react";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
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
  useCreateAsset,
  useUpdateAsset,
  useCheckoutAsset,
  useCheckinAsset,
  useRetireAsset,
  useSellAsset,
} from "../hooks/use-assets";
import { useAssetTypes } from "../hooks/use-asset-types";
import { useLocations } from "../hooks/use-locations";
import { AttachmentsSection } from "../components/shared/attachments-section";
import type { AssetFormValues } from "../lib/schemas/asset";

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

function isExpiringSoon(iso: string | null): boolean {
  if (!iso) return false;
  const expiry = new Date(iso);
  const now = new Date();
  const daysUntil = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return daysUntil <= 90 && daysUntil >= 0;
}

function isExpired(iso: string | null): boolean {
  if (!iso) return false;
  return new Date(iso) < new Date();
}

const HISTORY_PREVIEW_LIMIT = 5;

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: asset, isLoading, isError } = useAsset(id!);
  const { data: history, isLoading: historyLoading } = useAssetHistory(id!, HISTORY_PREVIEW_LIMIT);
  const { data: assetTypes } = useAssetTypes();
  const { data: locations } = useLocations();
  const createMutation = useCreateAsset();
  const updateMutation = useUpdateAsset();
  const checkoutMutation = useCheckoutAsset();
  const checkinMutation = useCheckinAsset();
  const retireMutation = useRetireAsset();
  const sellMutation = useSellAsset();

  const [formOpen, setFormOpen] = useState(false);
  const [cloneFormOpen, setCloneFormOpen] = useState(false);
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

  function handleCloneSubmit(values: AssetFormValues) {
    const customFieldValues = Object.entries(values.customFieldValues ?? {})
      .filter(([, v]) => v != null && v !== "" && v !== "__none__")
      .map(([fieldDefinitionId, value]) => ({
        fieldDefinitionId,
        value: value!,
      }));

    createMutation.mutate({
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
        : values.purchaseDate,
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
    } as Parameters<typeof createMutation.mutate>[0], {
      onSuccess: (newAsset) => {
        toast.success("Asset cloned successfully");
        setCloneFormOpen(false);
        navigate(`/assets/${newAsset.id}`);
      },
      onError: () => {
        toast.error("Failed to clone asset");
      },
    });
  }

  function getCloneInitialValues(): Partial<AssetFormValues> | undefined {
    if (!asset) return undefined;

    const cfValues: Record<string, string> = {};
    if (asset.customFieldValues) {
      for (const v of asset.customFieldValues) {
        cfValues[v.fieldDefinitionId] = v.value ?? "";
      }
    }

    return {
      assetTypeId: asset.assetTypeId,
      locationId: asset.locationId ?? "",
      purchaseCost: asset.purchaseCost != null ? String(asset.purchaseCost) : "",
      depreciationMonths: asset.depreciationMonths != null ? String(asset.depreciationMonths) : "",
      notes: asset.notes ?? "",
      status: "Available",
      customFieldValues: cfValues,
      name: "",
      serialNumber: "",
      warrantyExpiryDate: "",
      assignedPersonId: "",
    };
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
          Back to Assets
        </Button>
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Asset not found or failed to load.
        </div>
      </div>
    );
  }

  const hasMoreHistory = history && history.length >= HISTORY_PREVIEW_LIMIT;
  const isActiveAsset = asset.status !== "Retired" && asset.status !== "Sold" && asset.status !== "Archived";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-xl bg-muted flex items-center justify-center">
              <span className="text-lg font-bold text-muted-foreground">
                {asset.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">{asset.name}</h1>
                <AssetStatusBadge status={asset.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                {asset.assetTypeName}
                {asset.serialNumber && ` · ${asset.serialNumber}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isActiveAsset && (
              <>
                {(asset.status === "Available" || asset.status === "Assigned") && (
                  <Button variant="outline" onClick={() => setCheckoutOpen(true)} className="font-semibold">
                    <LogOut className="mr-2 h-4 w-4" />
                    Check Out
                  </Button>
                )}
                {asset.status === "CheckedOut" && (
                  <Button variant="outline" onClick={() => setCheckinOpen(true)} className="font-semibold">
                    <LogIn className="mr-2 h-4 w-4" />
                    Check In
                  </Button>
                )}
                <Button variant="outline" onClick={() => setRetireOpen(true)} className="font-semibold">
                  <Archive className="mr-2 h-4 w-4" />
                  Retire
                </Button>
                <Button variant="outline" onClick={() => setSellOpen(true)} className="font-semibold">
                  <PoundSterling className="mr-1 h-4 w-4" />
                  Sold
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => setCloneFormOpen(true)} className="font-semibold">
              <Copy className="mr-2 h-4 w-4" />
              Clone
            </Button>
            <Button onClick={() => setFormOpen(true)} className="font-semibold shadow-lg">
              <Pencil className="mr-2 h-4 w-4" />
              Edit Details
            </Button>
          </div>
        </div>
        {/* Breadcrumbs */}
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground font-medium">
          <Link to="/assets" className="hover:text-primary">Assets</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{asset.name}</span>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Asset Details */}
        <section className="lg:col-span-2">
          <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b flex items-center">
              <h3 className="font-bold flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                Asset Details
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Name</p>
                  <p className="text-sm font-medium">{asset.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Type</p>
                  <p className="text-sm font-medium">{asset.assetTypeName || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Serial Number</p>
                  <p className="text-sm font-medium font-mono">{asset.serialNumber || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Location</p>
                  <p className="text-sm font-medium">{asset.locationName || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Assigned To</p>
                  <p className="text-sm font-medium">{asset.assignedPersonName || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Purchase Date</p>
                  <p className="text-sm font-medium">{formatDate(asset.purchaseDate) ?? "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Purchase Cost</p>
                  <p className="text-sm font-medium">{formatCurrency(asset.purchaseCost) ?? "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Warranty Expiry</p>
                  <p className={`text-sm font-medium ${isExpired(asset.warrantyExpiryDate) ? "text-red-500 font-bold" : isExpiringSoon(asset.warrantyExpiryDate) ? "text-orange-500 font-bold" : ""}`}>
                    {formatDate(asset.warrantyExpiryDate) ?? "—"}
                  </p>
                </div>

                {/* Depreciation fields */}
                {asset.depreciationMonths != null && (
                  <>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Depreciation Period</p>
                      <p className="text-sm font-medium">{asset.depreciationMonths} months</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Monthly Depreciation</p>
                      <p className="text-sm font-medium">{formatCurrency(asset.monthlyDepreciation) ?? "—"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Total Depreciation</p>
                      <p className="text-sm font-medium">{formatCurrency(asset.totalDepreciation) ?? "—"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Book Value</p>
                      <p className="text-sm font-medium">{formatCurrency(asset.bookValue) ?? "—"}</p>
                    </div>
                  </>
                )}

                {/* Retired / Sold fields */}
                {asset.retiredDate && (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Retired Date</p>
                    <p className="text-sm font-medium">{formatDate(asset.retiredDate)}</p>
                  </div>
                )}
                {asset.soldDate && (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Sold Date</p>
                    <p className="text-sm font-medium">{formatDate(asset.soldDate)}</p>
                  </div>
                )}
                {asset.soldPrice != null && (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Sold Price</p>
                    <p className="text-sm font-medium">{formatCurrency(asset.soldPrice)}</p>
                  </div>
                )}
              </div>

              {/* Custom Fields */}
              {asset.customFieldValues && asset.customFieldValues.length > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Custom Fields</p>
                  <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                    {asset.customFieldValues.map((cfv) => (
                      <div key={cfv.fieldDefinitionId} className="space-y-1">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{cfv.fieldName}</p>
                        <p className="text-sm font-medium">{formatCustomFieldValue(cfv.value, cfv.fieldType) ?? "—"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {asset.notes && (
                <div className="mt-6 pt-6 border-t">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Notes</p>
                  <p className="text-sm whitespace-pre-wrap">{asset.notes}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* History */}
        <section>
          <div className="bg-card rounded-xl border overflow-hidden shadow-sm h-full">
            <div className="px-6 py-4 border-b">
              <h3 className="font-bold flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                History
              </h3>
            </div>
            <div className="p-6">
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
            </div>
          </div>
        </section>
      </div>

      {/* Attachments */}
      <AttachmentsSection entityType="Asset" entityId={asset.id} />

      {/* Dialogs */}
      <AssetFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        asset={asset}
        assetTypes={assetTypes ?? []}
        locations={locations ?? []}
        onSubmit={handleFormSubmit}
        loading={updateMutation.isPending}
      />

      <AssetFormDialog
        open={cloneFormOpen}
        onOpenChange={setCloneFormOpen}
        assetTypes={assetTypes ?? []}
        locations={locations ?? []}
        onSubmit={handleCloneSubmit}
        loading={createMutation.isPending}
        initialValues={getCloneInitialValues()}
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
