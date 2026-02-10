import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Monitor, ShieldCheck, AppWindow, Users, MapPin } from "lucide-react";
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
import { useAssetTypes } from "@/hooks/use-asset-types";
import { useCertificateTypes } from "@/hooks/use-certificate-types";
import { useApplicationTypes } from "@/hooks/use-application-types";
import { useLocations } from "@/hooks/use-locations";
import { useCreateAsset } from "@/hooks/use-assets";
import { useCreateCertificate } from "@/hooks/use-certificates";
import { useCreateApplication } from "@/hooks/use-applications";
import { useCreatePerson } from "@/hooks/use-people";
import { useCreateLocation } from "@/hooks/use-locations";
import type { AssetFormValues } from "@/lib/schemas/asset";
import type { CertificateFormValues } from "@/lib/schemas/certificate";
import type { ApplicationFormValues } from "@/lib/schemas/application";
import type { PersonFormValues } from "@/lib/schemas/person";
import type { LocationFormValues } from "@/lib/schemas/location";

type ActiveDialog = "asset" | "certificate" | "application" | "person" | "location" | null;

export function QuickActions() {
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
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

  function handleAssetSubmit(values: AssetFormValues) {
    const cfValues = values.customFieldValues
      ? Object.entries(values.customFieldValues)
          .filter(([, v]) => v !== undefined && v !== "")
          .map(([fieldDefinitionId, value]) => ({ fieldDefinitionId, value: value! }))
      : [];

    createAsset.mutate(
      {
        name: values.name,
        assetTag: values.assetTag,
        serialNumber: values.serialNumber || undefined,
        status: values.status || "Available",
        assetTypeId: values.assetTypeId,
        locationId: values.locationId && values.locationId !== "none" ? values.locationId : undefined,
        assignedPersonId: values.assignedPersonId && values.assignedPersonId !== "none" ? values.assignedPersonId : undefined,
        purchaseDate: values.purchaseDate || undefined,
        purchaseCost: values.purchaseCost ? Number(values.purchaseCost) : undefined,
        warrantyExpiryDate: values.warrantyExpiryDate || undefined,
        notes: values.notes || undefined,
        customFieldValues: cfValues.length > 0 ? cfValues : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Asset created");
          setActiveDialog(null);
          navigate("/assets");
        },
        onError: () => toast.error("Failed to create asset"),
      },
    );
  }

  function handleCertificateSubmit(values: CertificateFormValues) {
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
          navigate("/certificates");
        },
        onError: () => toast.error("Failed to create certificate"),
      },
    );
  }

  function handleApplicationSubmit(values: ApplicationFormValues) {
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
          navigate("/applications");
        },
        onError: () => toast.error("Failed to create application"),
      },
    );
  }

  function handlePersonSubmit(values: PersonFormValues) {
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
          navigate("/people");
        },
        onError: () => toast.error("Failed to create person"),
      },
    );
  }

  function handleLocationSubmit(values: LocationFormValues) {
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
          navigate("/locations");
        },
        onError: () => toast.error("Failed to create location"),
      },
    );
  }

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
        loading={createAsset.isPending}
      />

      <CertificateFormDialog
        open={activeDialog === "certificate"}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        certificateTypes={certificateTypes}
        locations={locations}
        onSubmit={handleCertificateSubmit}
        loading={createCertificate.isPending}
      />

      <ApplicationFormDialog
        open={activeDialog === "application"}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        applicationTypes={applicationTypes}
        locations={locations}
        onSubmit={handleApplicationSubmit}
        loading={createApplication.isPending}
      />

      <PersonFormDialog
        open={activeDialog === "person"}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        locations={locations}
        onSubmit={handlePersonSubmit}
        loading={createPerson.isPending}
      />

      <LocationFormDialog
        open={activeDialog === "location"}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        onSubmit={handleLocationSubmit}
        loading={createLocation.isPending}
      />
    </>
  );
}
