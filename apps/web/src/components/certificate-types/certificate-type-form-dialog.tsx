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
import { Button } from "../ui/button";
import { CustomFieldEditor } from "../asset-types/custom-field-editor";
import {
  certificateTypeSchema,
  type CertificateTypeFormValues,
} from "../../lib/schemas/certificate-type";
import type { CertificateType } from "../../types/certificate-type";

interface CertificateTypeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  certificateType?: CertificateType | null;
  onSubmit: (values: CertificateTypeFormValues) => void;
  loading?: boolean;
}

export function CertificateTypeFormDialog({
  open,
  onOpenChange,
  certificateType,
  onSubmit,
  loading,
}: CertificateTypeFormDialogProps) {
  const isEditing = !!certificateType;

  const form = useForm<CertificateTypeFormValues>({
    resolver: zodResolver(certificateTypeSchema),
    defaultValues: {
      name: "",
      description: "",
      customFields: [],
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: certificateType?.name ?? "",
        description: certificateType?.description ?? "",
        customFields:
          certificateType?.customFields?.map((cf, i) => ({
            id: cf.id,
            name: cf.name,
            fieldType: cf.fieldType,
            options: cf.options ?? "",
            isRequired: cf.isRequired,
            sortOrder: cf.sortOrder ?? i,
          })) ?? [],
      });
    }
  }, [open, certificateType, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="px-8 py-6 border-b">
          <DialogTitle className="text-2xl font-bold">
            {isEditing ? "Edit Certificate Type" : "Add Certificate Type"}
          </DialogTitle>
          <DialogDescription>
            Define a new certificate category with custom fields.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. SSL/TLS" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">Description</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Optional description"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <hr className="border-border" />

              <CustomFieldEditor />
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
                {loading ? "Saving..." : isEditing ? "Save Changes" : "Add Certificate Type"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
