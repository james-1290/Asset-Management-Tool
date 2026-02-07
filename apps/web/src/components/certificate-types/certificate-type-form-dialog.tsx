import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
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
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Certificate Type" : "Add Certificate Type"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
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
                  <FormLabel>Description</FormLabel>
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

            <div className="border-t pt-4">
              <CustomFieldEditor />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving…" : isEditing ? "Save Changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
