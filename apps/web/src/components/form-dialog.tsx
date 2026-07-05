import type { ReactNode } from "react";
import type { FieldValues, UseFormReturn, SubmitHandler } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Form } from "./ui/form";
import { Button } from "./ui/button";

const SIZE_CLASS = {
  lg: "sm:max-w-lg",
  "2xl": "sm:max-w-2xl",
  "4xl": "sm:max-w-4xl",
} as const;

interface FormDialogProps<T extends FieldValues> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Header title, e.g. "Edit Certificate" / "Add Certificate". */
  title: string;
  /** Optional subtitle under the title. */
  description?: ReactNode;
  form: UseFormReturn<T>;
  onSubmit: SubmitHandler<T>;
  loading?: boolean;
  /** Whether the form is editing an existing record (drives the default submit label). */
  isEditing?: boolean;
  /** Overrides the submit button label (default: "Save Changes" / "Create"). */
  submitLabel?: string;
  /** When true, submit is disabled while editing an unmodified (pristine) form. */
  disableSubmitWhenPristine?: boolean;
  /** Dialog width. Defaults to "4xl". */
  size?: keyof typeof SIZE_CLASS;
  /** Extra classes for the scrollable body wrapper (e.g. tighter "space-y-6"). */
  bodyClassName?: string;
  /** The form fields. */
  children: ReactNode;
}

/**
 * The shared "panel" create/edit dialog chrome used across the entity form
 * dialogs (assets, certificates, applications, types, models, templates): a
 * full-height dialog with a bordered header, a scrollable body, and a styled
 * footer with Cancel + submit buttons. Each caller keeps its own react-hook-form
 * instance, schema, reset-on-open effect and fields; this owns only the layout.
 */
export function FormDialog<T extends FieldValues>({
  open,
  onOpenChange,
  title,
  description,
  form,
  onSubmit,
  loading,
  isEditing = false,
  submitLabel,
  disableSubmitWhenPristine = false,
  size = "4xl",
  bodyClassName = "space-y-8",
  children,
}: FormDialogProps<T>) {
  const submitDisabled =
    loading || (disableSubmitWhenPristine && isEditing && !form.formState.isDirty);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${SIZE_CLASS[size]} p-0 gap-0 max-h-[90vh] flex flex-col`}>
        <DialogHeader className="px-8 py-6 border-b">
          <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div className={`flex-1 overflow-y-auto px-8 py-8 ${bodyClassName}`}>
              {children}
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
              <Button
                type="submit"
                disabled={submitDisabled}
                className="font-semibold shadow-lg"
              >
                {loading ? "Saving..." : submitLabel ?? (isEditing ? "Save Changes" : "Create")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
