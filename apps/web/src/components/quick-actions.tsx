import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Monitor, ShieldCheck, AppWindow, Users, MapPin } from "lucide-react";
import { getApiErrorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AssetFormDialog } from "@/components/assets/asset-form-dialog";
import { CertificateFormDialog } from "@/components/certificates/certificate-form-dialog";
import { ApplicationFormDialog } from "@/components/applications/application-form-dialog";
import { PersonFormDialog } from "@/components/people/person-form-dialog";
import { LocationFormDialog } from "@/components/locations/location-form-dialog";
import { DuplicateWarningDialog } from "@/components/shared/duplicate-warning-dialog";
import { useAssetTypes } from "@/hooks/use-asset-types";
import { useCertificateTypes } from "@/hooks/use-certificate-types";
import { useApplicationTypes } from "@/hooks/use-application-types";
import { useLocations } from "@/hooks/use-locations";
import { useCreateAsset, useCheckAssetDuplicates } from "@/hooks/use-assets";
import { useCreateCertificate, useCheckCertificateDuplicates } from "@/hooks/use-certificates";
import { useCreateApplication, useCheckApplicationDuplicates } from "@/hooks/use-applications";
import { useCreatePerson, useCheckPersonDuplicates } from "@/hooks/use-people";
import { useCreateLocation, useCheckLocationDuplicates } from "@/hooks/use-locations";
import type { AssetFormValues } from "@/lib/schemas/asset";
import type { CertificateFormValues } from "@/lib/schemas/certificate";
import type { ApplicationFormValues } from "@/lib/schemas/application";
import type { PersonFormValues } from "@/lib/schemas/person";
import type { LocationFormValues } from "@/lib/schemas/location";
import type { DuplicateCheckResult } from "@/types/duplicate-check";

type ActiveDialog = "asset" | "certificate" | "application" | "person" | "location" | null;

export function QuickActions() {
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    entityType: "assets" | "certificates" | "applications" | "people" | "locations";
    duplicates: DuplicateCheckResult[];
    onConfirm: () => void;
  } | null>(null);
  const navigate = useNavigate();

  const { data: assetTypes = [] } = useAssetTypes();
  const { data: certificateTypes = [] } = useCertificateTypes();
  const { data: applicationTypes = [] } = useApplicationTypes();
  const { data: locations = [] } = useLocations();

  const createAsset = useCreateAsset();
  const createCertificate = useCreateCertificate();
  const createApplication = useCreateApplication();
  const createPerson = useCreatePerson();
  const createLocation = useCreateLocation();

  const checkAssetDuplicates = useCheckAssetDuplicates();
  const checkCertificateDuplicates = useCheckCertificateDuplicates();
  const checkApplicationDuplicates = useCheckApplicationDuplicates();
  const checkPersonDuplicates = useCheckPersonDuplicates();
  const checkLocationDuplicates = useCheckLocationDuplicates();

  function doCreateAsset(values: AssetFormValues) {
    const cfValues = values.customFieldValues
      ? Object.entries(values.customFieldValues)
          .filter(([, v]) => v !== undefined && v !== "")
          .map(([fieldDefinitionId, value]) => ({ fieldDefinitionId, value: value! }))
      : [];

    createAsset.mutate(
      {
        name: values.name,
        serialNumber: values.serialNumber,
        status: values.status || "Available",
        assetTypeId: values.assetTypeId,
        locationId: values.locationId,
        assignedPersonId: values.assignedPersonId && values.assignedPersonId !== "none" ? values.assignedPersonId : undefined,
        purchaseDate: values.purchaseDate || undefined,
        purchaseCost: values.purchaseCost ? Number(values.purchaseCost) : undefined,
        depreciationMonths: values.depreciationMonths ? Number(values.depreciationMonths) : undefined,
        warrantyExpiryDate: values.warrantyExpiryDate || undefined,
        notes: values.notes || undefined,
        customFieldValues: cfValues.length > 0 ? cfValues : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Asset created");
          setActiveDialog(null);
          setDuplicateWarning(null);
          navigate("/assets");
        },
        onError: (error) => toast.error(getApiErrorMessage(error, "Failed to create asset")),
      },
    );
  }

  function handleAssetSubmit(values: AssetFormValues) {
    checkAssetDuplicates.mutate(
      {
        name: values.name,
        serialNumber: values.serialNumber || undefined,
      },
      {
        onSuccess: (duplicates) => {
          if (duplicates.length === 0) {
            doCreateAsset(values);
          } else {
            setDuplicateWarning({
              entityType: "assets",
              duplicates,
              onConfirm: () => doCreateAsset(values),
            });
          }
        },
        onError: () => doCreateAsset(values), // On check failure, proceed with create
      },
    );
  }

  function doCreateCertificate(values: CertificateFormValues) {
    const cfValues = values.customFieldValues
      ? Object.entries(values.customFieldValues)
          .filter(([, v]) => v !== undefined && v !== "")
          .map(([fieldDefinitionId, value]) => ({ fieldDefinitionId, value: value! }))
      : [];

    createCertificate.mutate(
      {
        name: values.name,
        certificateTypeId: values.certificateTypeId,
        issuer: values.issuer || undefined,
        subject: values.subject || undefined,
        thumbprint: values.thumbprint || undefined,
        serialNumber: values.serialNumber || undefined,
        issuedDate: values.issuedDate || undefined,
        expiryDate: values.expiryDate || undefined,
        status: values.status || "Active",
        autoRenewal: values.autoRenewal,
        notes: values.notes || undefined,
        assetId: values.assetId && values.assetId !== "none" ? values.assetId : undefined,
        personId: values.personId && values.personId !== "none" ? values.personId : undefined,
        locationId: values.locationId && values.locationId !== "none" ? values.locationId : undefined,
        customFieldValues: cfValues.length > 0 ? cfValues : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Certificate created");
          setActiveDialog(null);
          setDuplicateWarning(null);
          navigate("/certificates");
        },
        onError: (error) => toast.error(getApiErrorMessage(error, "Failed to create certificate")),
      },
    );
  }

  function handleCertificateSubmit(values: CertificateFormValues) {
    checkCertificateDuplicates.mutate(
      {
        name: values.name,
        thumbprint: values.thumbprint || undefined,
        serialNumber: values.serialNumber || undefined,
      },
      {
        onSuccess: (duplicates) => {
          if (duplicates.length === 0) {
            doCreateCertificate(values);
          } else {
            setDuplicateWarning({
              entityType: "certificates",
              duplicates,
              onConfirm: () => doCreateCertificate(values),
            });
          }
        },
        onError: () => doCreateCertificate(values),
      },
    );
  }

  function doCreateApplication(values: ApplicationFormValues) {
    const cfValues = values.customFieldValues
      ? Object.entries(values.customFieldValues)
          .filter(([, v]) => v !== undefined && v !== "")
          .map(([fieldDefinitionId, value]) => ({ fieldDefinitionId, value: value! }))
      : [];

    createApplication.mutate(
      {
        name: values.name,
        applicationTypeId: values.applicationTypeId,
        publisher: values.publisher || undefined,
        version: values.version || undefined,
        licenceKey: values.licenceKey || undefined,
        licenceType: values.licenceType || undefined,
        maxSeats: values.maxSeats ? Number(values.maxSeats) : undefined,
        usedSeats: values.usedSeats ? Number(values.usedSeats) : undefined,
        purchaseDate: values.purchaseDate || undefined,
        expiryDate: values.expiryDate || undefined,
        purchaseCost: values.purchaseCost ? Number(values.purchaseCost) : undefined,
        autoRenewal: values.autoRenewal,
        status: values.status || "Active",
        notes: values.notes || undefined,
        assetId: values.assetId && values.assetId !== "none" ? values.assetId : undefined,
        personId: values.personId && values.personId !== "none" ? values.personId : undefined,
        locationId: values.locationId && values.locationId !== "none" ? values.locationId : undefined,
        customFieldValues: cfValues.length > 0 ? cfValues : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Application created");
          setActiveDialog(null);
          setDuplicateWarning(null);
          navigate("/applications");
        },
        onError: (error) => toast.error(getApiErrorMessage(error, "Failed to create application")),
      },
    );
  }

  function handleApplicationSubmit(values: ApplicationFormValues) {
    checkApplicationDuplicates.mutate(
      {
        name: values.name,
        publisher: values.publisher || undefined,
        licenceKey: values.licenceKey || undefined,
      },
      {
        onSuccess: (duplicates) => {
          if (duplicates.length === 0) {
            doCreateApplication(values);
          } else {
            setDuplicateWarning({
              entityType: "applications",
              duplicates,
              onConfirm: () => doCreateApplication(values),
            });
          }
        },
        onError: () => doCreateApplication(values),
      },
    );
  }

  function doCreatePerson(values: PersonFormValues) {
    createPerson.mutate(
      {
        fullName: values.fullName,
        email: values.email || undefined,
        department: values.department || undefined,
        jobTitle: values.jobTitle || undefined,
        locationId: values.locationId && values.locationId !== "none" ? values.locationId : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Person created");
          setActiveDialog(null);
          setDuplicateWarning(null);
          navigate("/people");
        },
        onError: (error) => toast.error(getApiErrorMessage(error, "Failed to create person")),
      },
    );
  }

  function handlePersonSubmit(values: PersonFormValues) {
    checkPersonDuplicates.mutate(
      {
        fullName: values.fullName,
        email: values.email || undefined,
      },
      {
        onSuccess: (duplicates) => {
          if (duplicates.length === 0) {
            doCreatePerson(values);
          } else {
            setDuplicateWarning({
              entityType: "people",
              duplicates,
              onConfirm: () => doCreatePerson(values),
            });
          }
        },
        onError: () => doCreatePerson(values),
      },
    );
  }

  function doCreateLocation(values: LocationFormValues) {
    createLocation.mutate(
      {
        name: values.name,
        address: values.address || undefined,
        city: values.city || undefined,
        country: values.country || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Location created");
          setActiveDialog(null);
          setDuplicateWarning(null);
          navigate("/locations");
        },
        onError: (error) => toast.error(getApiErrorMessage(error, "Failed to create location")),
      },
    );
  }

  function handleLocationSubmit(values: LocationFormValues) {
    checkLocationDuplicates.mutate(
      {
        name: values.name,
      },
      {
        onSuccess: (duplicates) => {
          if (duplicates.length === 0) {
            doCreateLocation(values);
          } else {
            setDuplicateWarning({
              entityType: "locations",
              duplicates,
              onConfirm: () => doCreateLocation(values),
            });
          }
        },
        onError: () => doCreateLocation(values),
      },
    );
  }

  const isChecking =
    checkAssetDuplicates.isPending ||
    checkCertificateDuplicates.isPending ||
    checkApplicationDuplicates.isPending ||
    checkPersonDuplicates.isPending ||
    checkLocationDuplicates.isPending;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setActiveDialog("asset")}>
            <Monitor className="mr-2 h-4 w-4" />
            New Asset
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setActiveDialog("certificate")}>
            <ShieldCheck className="mr-2 h-4 w-4" />
            New Certificate
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setActiveDialog("application")}>
            <AppWindow className="mr-2 h-4 w-4" />
            New Application
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setActiveDialog("person")}>
            <Users className="mr-2 h-4 w-4" />
            New Person
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setActiveDialog("location")}>
            <MapPin className="mr-2 h-4 w-4" />
            New Location
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AssetFormDialog
        open={activeDialog === "asset"}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        assetTypes={assetTypes}
        locations={locations}
        onSubmit={handleAssetSubmit}
        loading={createAsset.isPending || isChecking}
      />

      <CertificateFormDialog
        open={activeDialog === "certificate"}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        certificateTypes={certificateTypes}
        locations={locations}
        onSubmit={handleCertificateSubmit}
        loading={createCertificate.isPending || isChecking}
      />

      <ApplicationFormDialog
        open={activeDialog === "application"}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        applicationTypes={applicationTypes}
        locations={locations}
        onSubmit={handleApplicationSubmit}
        loading={createApplication.isPending || isChecking}
      />

      <PersonFormDialog
        open={activeDialog === "person"}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        locations={locations}
        onSubmit={handlePersonSubmit}
        loading={createPerson.isPending || isChecking}
      />

      <LocationFormDialog
        open={activeDialog === "location"}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        onSubmit={handleLocationSubmit}
        loading={createLocation.isPending || isChecking}
      />

      {duplicateWarning && (
        <DuplicateWarningDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setDuplicateWarning(null);
          }}
          duplicates={duplicateWarning.duplicates}
          entityType={duplicateWarning.entityType}
          onCreateAnyway={duplicateWarning.onConfirm}
          loading={
            createAsset.isPending ||
            createCertificate.isPending ||
            createApplication.isPending ||
            createPerson.isPending ||
            createLocation.isPending
          }
        />
      )}
    </>
  );
}
