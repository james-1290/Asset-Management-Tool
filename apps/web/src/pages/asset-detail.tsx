import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { getApiErrorMessage } from "../lib/api-client";
import {
  Pencil,
  History,
  ChevronRight,
  LogOut,
  LogIn,
  Archive,
  PoundSterling,
  Copy,
  MapPin,
  UserCheck,
  Wallet,
  Cpu,
  StickyNote,
  Layers,
  Maximize2,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { DetailCard, SectionHeader, DetailRow, MetricBlock } from "../components/detail-layout";
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
import { AssetTypeIcon } from "../components/assets/asset-type-icon";
import { AvatarPlaceholder } from "../components/avatar-placeholder";
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

/* ── Main page ────────────────────────────────────────── */

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

  const detailsRef = useRef<HTMLDivElement>(null);
  const [detailsHeight, setDetailsHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!detailsRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setDetailsHeight(entry.contentRect.height);
    });
    observer.observe(detailsRef.current);
    return () => observer.disconnect();
  }, [asset]);

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
      assetModelId: values.assetModelId && values.assetModelId !== "" && values.assetModelId !== "__none__" ? values.assetModelId : null,
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
        onError: (error) => {
          toast.error(getApiErrorMessage(error, "Failed to update asset"));
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
      assetModelId: values.assetModelId && values.assetModelId !== "" && values.assetModelId !== "__none__" ? values.assetModelId : null,
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
      assetModelId: asset.assetModelId ?? "",
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

  /* ── Loading ─────────────────────────────────────────── */

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-36 w-full rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  /* ── Error ───────────────────────────────────────────── */

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

  const warrantyClassName = isExpired(asset.warrantyExpiryDate)
    ? "text-red-500 font-bold"
    : isExpiringSoon(asset.warrantyExpiryDate)
      ? "text-orange-500 font-bold"
      : "";

  return (
    <div className="space-y-6">
      {/* ── Breadcrumbs ────────────────────────────────── */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
        <Link to="/assets" className="hover:text-primary transition-colors">
          Assets
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{asset.name}</span>
      </div>

      {/* ── Hero Card ──────────────────────────────────── */}
      <DetailCard className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-5">
          <AssetTypeIcon
            typeName={asset.assetTypeName}
            assetModelId={asset.assetModelId}
            assetModelImageUrl={asset.assetModelImageUrl}
            className="!h-20 !w-20 rounded-xl border border-border/60 [&_svg]:!h-9 [&_svg]:!w-9"
          />
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{asset.name}</h1>
              <AssetStatusBadge status={asset.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {asset.assetTypeName}
              {asset.assetModelName && <> · {asset.assetModelName}</>}
              {asset.serialNumber && (
                <>
                  {" · "}
                  <span className="font-medium text-foreground">{asset.serialNumber}</span>
                </>
              )}
            </p>
            {asset.locationName && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{asset.locationName}</p>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {isActiveAsset && (
            <>
              {asset.status === "Available" && (
                <Button variant="outline" size="sm" onClick={() => setCheckoutOpen(true)}>
                  <LogOut className="mr-1.5 h-3.5 w-3.5" />
                  Check out
                </Button>
              )}
              {asset.status === "CheckedOut" && (
                <Button variant="outline" size="sm" onClick={() => setCheckinOpen(true)}>
                  <LogIn className="mr-1.5 h-3.5 w-3.5" />
                  Check in
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setRetireOpen(true)}>
                <Archive className="mr-1.5 h-3.5 w-3.5" />
                Retire
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSellOpen(true)}>
                <PoundSterling className="mr-1.5 h-3.5 w-3.5" />
                Sold
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => setCloneFormOpen(true)}>
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            Clone
          </Button>
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
        </div>
      </DetailCard>

      {/* ── Three-column grid ──────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left two-thirds */}
        <div ref={detailsRef} className="lg:col-span-2 flex flex-col gap-6">
          {/* Top row: Details + Assignment side by side */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Asset details card */}
            <DetailCard>
              <SectionHeader icon={Cpu} title="Hardware details" />
              <div className="space-y-3">
                <DetailRow label="Type" value={asset.assetTypeName || "—"} />
                <DetailRow label="Model" value={asset.assetModelName || "—"} />
                <DetailRow
                  label="Serial"
                  value={asset.serialNumber || "—"}
                />
                <DetailRow label="Location" value={asset.locationName || "—"} />
                <DetailRow label="Purchase date" value={formatDate(asset.purchaseDate) ?? "—"} />
              </div>
            </DetailCard>

            {/* Assignment card */}
            <DetailCard>
              <SectionHeader icon={UserCheck} title="Assignment" />
              {asset.assignedPersonName ? (
                <div className="mb-4 flex items-center gap-3 rounded-lg bg-muted/60 p-3">
                  <AvatarPlaceholder name={asset.assignedPersonName} size="lg" />
                  <div>
                    <p className="text-sm font-bold">{asset.assignedPersonName}</p>
                    <p className="text-xs text-muted-foreground">
                      {asset.status === "CheckedOut" ? "Checked out" : "Assigned"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mb-4 flex items-center gap-3 rounded-lg border border-dashed border-border/60 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <UserCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Unassigned</p>
                    <p className="text-xs text-muted-foreground">No one is using this asset</p>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                <DetailRow label="Status" value={asset.status} />
                <DetailRow label="Location" value={asset.locationName || "—"} />
                {asset.retiredDate && (
                  <DetailRow label="Retired" value={formatDate(asset.retiredDate)!} />
                )}
                {asset.soldDate && (
                  <DetailRow label="Sold" value={formatDate(asset.soldDate)!} />
                )}
              </div>
            </DetailCard>
          </div>

          {/* Financial & warranty — spans full left width */}
          {(asset.purchaseCost != null || asset.warrantyExpiryDate || asset.depreciationMonths != null) && (
            <DetailCard>
              <SectionHeader icon={Wallet} title="Financial & warranty" />
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                <MetricBlock
                  label="Purchase price"
                  value={formatCurrency(asset.purchaseCost) ?? "—"}
                />
                {asset.depreciationMonths != null ? (
                  <MetricBlock
                    label="Depreciation"
                    value={`${asset.depreciationMonths} mo`}
                  />
                ) : (
                  <MetricBlock label="Depreciation" value="—" />
                )}
                <MetricBlock
                  label="Warranty expiry"
                  value={formatDate(asset.warrantyExpiryDate) ?? "—"}
                  className={warrantyClassName}
                />
                {asset.bookValue != null ? (
                  <MetricBlock
                    label="Book value"
                    value={formatCurrency(asset.bookValue)!}
                    className="text-primary"
                  />
                ) : asset.soldPrice != null ? (
                  <MetricBlock
                    label="Sold price"
                    value={formatCurrency(asset.soldPrice)!}
                  />
                ) : (
                  <MetricBlock label="Book value" value="—" />
                )}
              </div>

              {/* Extra depreciation detail row */}
              {asset.depreciationMonths != null && (asset.monthlyDepreciation != null || asset.totalDepreciation != null) && (
                <div className="mt-5 grid grid-cols-2 gap-6 border-t border-border/40 pt-4 sm:grid-cols-4">
                  <MetricBlock
                    label="Monthly depreciation"
                    value={formatCurrency(asset.monthlyDepreciation) ?? "—"}
                  />
                  <MetricBlock
                    label="Total depreciation"
                    value={formatCurrency(asset.totalDepreciation) ?? "—"}
                  />
                </div>
              )}
            </DetailCard>
          )}

          {/* Custom fields */}
          {asset.customFieldValues && asset.customFieldValues.length > 0 && (
            <DetailCard>
              <SectionHeader icon={Layers} title="Custom fields" />
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                {asset.customFieldValues.map((cfv) => (
                  <DetailRow
                    key={cfv.fieldDefinitionId}
                    label={cfv.fieldName}
                    value={formatCustomFieldValue(cfv.value, cfv.fieldType) ?? "—"}
                  />
                ))}
              </div>
            </DetailCard>
          )}

          {/* Notes */}
          {asset.notes && (
            <DetailCard>
              <SectionHeader icon={StickyNote} title="Notes" />
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{asset.notes}</p>
            </DetailCard>
          )}
        </div>

        {/* Right one-third: Timeline */}
        <DetailCard
          className="flex flex-col overflow-hidden"
          style={{ maxHeight: detailsHeight ? `${detailsHeight}px` : undefined }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <History className="h-[18px] w-[18px] text-primary" />
              <h3 className="text-sm font-bold text-foreground">Asset timeline</h3>
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
            <AssetHistoryTimeline
              history={history}
              isLoading={historyLoading}
            />
          </div>
        </DetailCard>
      </div>

      {/* ── Attachments ────────────────────────────────── */}
      <AttachmentsSection entityType="Asset" entityId={asset.id} />

      {/* ── Dialogs ────────────────────────────────────── */}
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
              onError: (error) => {
                toast.error(getApiErrorMessage(error, "Failed to check out asset"));
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
              onError: (error) => {
                toast.error(getApiErrorMessage(error, "Failed to check in asset"));
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
              onError: (error) => {
                toast.error(getApiErrorMessage(error, "Failed to retire asset"));
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
              onError: (error) => {
                toast.error(getApiErrorMessage(error, "Failed to mark asset as sold"));
              },
            },
          );
        }}
        loading={sellMutation.isPending}
      />
    </div>
  );
}
