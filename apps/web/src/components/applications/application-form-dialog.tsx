import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { applicationSchema, type ApplicationFormValues } from "../../lib/schemas/application";
import { useApplicationCustomFieldDefinitions } from "../../hooks/use-application-types";
import type { Application } from "../../types/application";
import type { ApplicationType } from "../../types/application-type";
import type { Location } from "../../types/location";

const APPLICATION_STATUSES = [
  { value: "Active", label: "Active" },
  { value: "Expired", label: "Expired" },
  { value: "PendingRenewal", label: "Pending Renewal" },
  { value: "Suspended", label: "Suspended" },
  { value: "Inactive", label: "Inactive" },
] as const;

const LICENCE_TYPES = [
  { value: "PerSeat", label: "Per Seat" },
  { value: "Site", label: "Site" },
  { value: "Volume", label: "Volume" },
  { value: "OpenSource", label: "Open Source" },
  { value: "Trial", label: "Trial" },
  { value: "Freeware", label: "Freeware" },
  { value: "Subscription", label: "Subscription" },
  { value: "Perpetual", label: "Perpetual" },
] as const;

interface ApplicationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application?: Application | null;
  applicationTypes: ApplicationType[];
  locations: Location[];
  onSubmit: (values: ApplicationFormValues) => void;
  loading?: boolean;
}

export function ApplicationFormDialog({
  open,
  onOpenChange,
  application,
  applicationTypes,
  locations,
  onSubmit,
  loading,
}: ApplicationFormDialogProps) {
  const isEditing = !!application;

  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      name: "",
      applicationTypeId: "",
      publisher: "",
      version: "",
      licenceKey: "",
      licenceType: "",
      maxSeats: "",
      usedSeats: "",
      purchaseDate: "",
      expiryDate: "",
      purchaseCost: "",
      autoRenewal: false,
      status: "Active",
      notes: "",
      assetId: "",
      personId: "",
      locationId: "",
      customFieldValues: {},
    },
  });

  const watchedApplicationTypeId = form.watch("applicationTypeId");
  const { data: customFieldDefs } =
    useApplicationCustomFieldDefinitions(watchedApplicationTypeId || undefined);

  useEffect(() => {
    if (open) {
      const cfValues: Record<string, string> = {};
      if (application?.customFieldValues) {
        for (const v of application.customFieldValues) {
          cfValues[v.fieldDefinitionId] = v.value ?? "";
        }
      }

      form.reset({
        name: application?.name ?? "",
        applicationTypeId: application?.applicationTypeId ?? "",
        publisher: application?.publisher ?? "",
        version: application?.version ?? "",
        licenceKey: application?.licenceKey ?? "",
        licenceType: application?.licenceType ?? "",
        maxSeats: application?.maxSeats != null ? String(application.maxSeats) : "",
        usedSeats: application?.usedSeats != null ? String(application.usedSeats) : "",
        purchaseDate: application?.purchaseDate
          ? application.purchaseDate.substring(0, 10)
          : "",
        expiryDate: application?.expiryDate
          ? application.expiryDate.substring(0, 10)
          : "",
        purchaseCost: application?.purchaseCost != null ? String(application.purchaseCost) : "",
        autoRenewal: application?.autoRenewal ?? false,
        status: application?.status ?? "Active",
        notes: application?.notes ?? "",
        assetId: application?.assetId ?? "",
        personId: application?.personId ?? "",
        locationId: application?.locationId ?? "",
        customFieldValues: cfValues,
      });
    }
  }, [open, application, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl p-0 gap-0 max-h-[90vh] flex flex-col">
        {/* Header */}
        <DialogHeader className="px-8 py-6 border-b">
          <DialogTitle className="text-2xl font-bold">
            {isEditing ? "Edit Application" : "Add New Application"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            Fill in the details to register a new software asset.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable form body */}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8">
              {/* Section: General Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Application Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Microsoft 365 Business Premium" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="version"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Version</FormLabel>
                      <FormControl>
                        <Input placeholder="v24.2.1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="publisher"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Publisher</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Microsoft" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="applicationTypeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Application Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {applicationTypes.map((t) => (
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
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {APPLICATION_STATUSES.map((s) => (
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

              <hr className="border-border" />

              {/* Section: Licensing */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-2">
                  <FormField
                    control={form.control}
                    name="licenceKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Licence Key / ID</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="XXXX-XXXX-XXXX-XXXX"
                            className="font-mono text-sm"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="licenceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Licence Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value as string}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {LICENCE_TYPES.map((lt) => (
                            <SelectItem key={lt.value} value={lt.value}>
                              {lt.label}
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
                  name="locationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Location</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value as string}>
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
                <FormField
                  control={form.control}
                  name="maxSeats"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Max Seats</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="usedSeats"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Used Seats</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="lg:col-span-2">
                  <FormField
                    control={form.control}
                    name="purchaseCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Purchase Cost</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              placeholder="0.00"
                              className="pl-7"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <hr className="border-border" />

              {/* Section: Dates & Renewal */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="purchaseDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Purchase Date</FormLabel>
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
                    <FormItem className="flex items-center gap-3 space-y-0 py-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="size-5"
                        />
                      </FormControl>
                      <FormLabel className="font-medium cursor-pointer">
                        Enable Auto Renewal
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any additional context, procurement details, or specific department assignments..."
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Custom Fields */}
              {customFieldDefs && customFieldDefs.length > 0 && (
                <>
                  <hr className="border-border" />
                  <CustomFieldsSection definitions={customFieldDefs} />
                </>
              )}
            </div>

            {/* Footer */}
            <DialogFooter className="px-8 py-6 border-t bg-muted/50 flex justify-end gap-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="font-semibold shadow-lg"
              >
                {loading
                  ? "Saving..."
                  : isEditing
                    ? "Save Changes"
                    : "Add Application"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
