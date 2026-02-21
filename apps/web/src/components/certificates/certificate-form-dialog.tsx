import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Checkbox } from "../ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Button } from "../ui/button";
import { CustomFieldsSection } from "../assets/custom-fields-section";
import { certificateSchema, type CertificateFormValues } from "../../lib/schemas/certificate";
import { useCertificateCustomFieldDefinitions } from "../../hooks/use-certificate-types";
import type { Certificate } from "../../types/certificate";
import type { CertificateType } from "../../types/certificate-type";
import type { Location } from "../../types/location";

const CERTIFICATE_STATUSES = [
  { value: "Active", label: "Active" },
  { value: "Expired", label: "Expired" },
  { value: "PendingRenewal", label: "Pending Renewal" },
  { value: "Revoked", label: "Revoked" },
] as const;

interface CertificateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  certificate?: Certificate | null;
  certificateTypes: CertificateType[];
  locations: Location[];
  onSubmit: (values: CertificateFormValues) => void;
  loading?: boolean;
}

export function CertificateFormDialog({
  open,
  onOpenChange,
  certificate,
  certificateTypes,
  locations,
  onSubmit,
  loading,
}: CertificateFormDialogProps) {
  const isEditing = !!certificate;

  const form = useForm<CertificateFormValues>({
    resolver: zodResolver(certificateSchema),
    defaultValues: {
      name: "",
      certificateTypeId: "",
      issuer: "",
      subject: "",
      thumbprint: "",
      serialNumber: "",
      issuedDate: "",
      expiryDate: "",
      status: "Active",
      autoRenewal: false,
      notes: "",
      assetId: "",
      personId: "",
      locationId: "",
      customFieldValues: {},
    },
  });

  const watchedCertificateTypeId = form.watch("certificateTypeId");
  const { data: customFieldDefs } =
    useCertificateCustomFieldDefinitions(watchedCertificateTypeId || undefined);

  useEffect(() => {
    if (open) {
      const cfValues: Record<string, string> = {};
      if (certificate?.customFieldValues) {
        for (const v of certificate.customFieldValues) {
          cfValues[v.fieldDefinitionId] = v.value ?? "";
        }
      }

      form.reset({
        name: certificate?.name ?? "",
        certificateTypeId: certificate?.certificateTypeId ?? "",
        issuer: certificate?.issuer ?? "",
        subject: certificate?.subject ?? "",
        thumbprint: certificate?.thumbprint ?? "",
        serialNumber: certificate?.serialNumber ?? "",
        issuedDate: certificate?.issuedDate
          ? certificate.issuedDate.substring(0, 10)
          : "",
        expiryDate: certificate?.expiryDate
          ? certificate.expiryDate.substring(0, 10)
          : "",
        status: certificate?.status ?? "Active",
        autoRenewal: certificate?.autoRenewal ?? false,
        notes: certificate?.notes ?? "",
        assetId: certificate?.assetId ?? "",
        personId: certificate?.personId ?? "",
        locationId: certificate?.locationId ?? "",
        customFieldValues: cfValues,
      });
    }
  }, [open, certificate, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl p-0 gap-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="px-8 py-6 border-b">
          <DialogTitle className="text-2xl font-bold">
            {isEditing ? "Edit Certificate" : "Add Certificate"}
          </DialogTitle>
          <DialogDescription>
            Fill in the details to register a new certificate.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8">

              {/* Section 1 - General Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">General Information</h3>
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel className="font-semibold">Certificate Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. *.example.com SSL" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="certificateTypeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Certificate Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {certificateTypes.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="issuer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Issuer</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Let's Encrypt" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Subject</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. *.example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Status</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CERTIFICATE_STATUSES.map((s) => (
                              <SelectItem key={s.value} value={s.value}>
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <hr className="border-border" />

              {/* Section 2 - Identity */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Identity</h3>
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="thumbprint"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Thumbprint</FormLabel>
                        <FormControl>
                          <Input placeholder="Optional" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="serialNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Serial Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Optional" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="locationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Location</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="None" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {locations.map((l) => (
                              <SelectItem key={l.id} value={l.id}>
                                {l.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <hr className="border-border" />

              {/* Section 3 - Dates & Renewal */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Dates & Renewal</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="issuedDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Issued Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="expiryDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Expiry Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="autoRenewal"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0 col-span-2">
                        <FormControl>
                          <Checkbox
                            className="size-5"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-medium cursor-pointer">Enable Auto Renewal</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Custom Fields */}
              {customFieldDefs && customFieldDefs.length > 0 && (
                <>
                  <hr className="border-border" />
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Custom Fields</h3>
                    <CustomFieldsSection definitions={customFieldDefs} />
                  </div>
                </>
              )}

              <hr className="border-border" />

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any additional context, renewal details, or specific assignments..."
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="px-8 py-6 border-t bg-muted/50 flex justify-end gap-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="font-semibold shadow-lg">
                {loading ? "Saving..." : isEditing ? "Save Changes" : "Add Certificate"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
