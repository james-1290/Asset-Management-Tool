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
  applicationTypeSchema,
  type ApplicationTypeFormValues,
} from "../../lib/schemas/application-type";
import type { ApplicationType } from "../../types/application-type";

interface ApplicationTypeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationType?: ApplicationType | null;
  onSubmit: (values: ApplicationTypeFormValues) => void;
  loading?: boolean;
}

export function ApplicationTypeFormDialog({
  open,
  onOpenChange,
  applicationType,
  onSubmit,
  loading,
}: ApplicationTypeFormDialogProps) {
  const isEditing = !!applicationType;

  const form = useForm<ApplicationTypeFormValues>({
    resolver: zodResolver(applicationTypeSchema),
    defaultValues: {
      name: "",
      description: "",
      customFields: [],
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: applicationType?.name ?? "",
        description: applicationType?.description ?? "",
        customFields:
          applicationType?.customFields?.map((cf, i) => ({
            id: cf.id,
            name: cf.name,
            fieldType: cf.fieldType,
            options: cf.options ?? "",
            isRequired: cf.isRequired,
            sortOrder: cf.sortOrder ?? i,
          })) ?? [],
      });
    }
  }, [open, applicationType, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="px-8 py-6 border-b">
          <DialogTitle className="text-2xl font-bold">
            {isEditing ? "Edit Application Type" : "Add Application Type"}
          </DialogTitle>
          <DialogDescription>
            Define a new application category with custom fields.
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
                      <Input placeholder="e.g. SaaS" {...field} />
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
                {loading ? "Saving..." : isEditing ? "Save Changes" : "Add Application Type"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
