import { useEffect, useRef, type ReactNode } from "react";
import {
  useForm,
  type Control,
  type DefaultValues,
  type Resolver,
  type UseFormReturn,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { FormDialog } from "../form-dialog";
import { CustomFieldEditor } from "./custom-field-editor";
import type { CustomFieldDefinitionFormValues } from "../../lib/schemas/asset-type";

/** Fields common to every entity-type form. */
export interface BaseTypeFormValues {
  name: string;
  description?: string;
  customFields: CustomFieldDefinitionFormValues[];
}

interface TypeFormDialogProps<TValues extends BaseTypeFormValues, TEntity> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
  /** The record being edited, or null/undefined when creating. */
  entity?: TEntity | null;
  /** Singular label, e.g. "Asset Type" — used in the title and submit button. */
  entityLabel: string;
  /** Category noun for the subtitle, e.g. "asset" → "Define a new asset category…". */
  categoryNoun: string;
  namePlaceholder: string;
  schema: z.ZodType<TValues>;
  /** Builds full form values from a record (or null when creating). Used for the
   *  initial defaults and to reset the form whenever the dialog opens. */
  buildValues: (entity: TEntity | null) => TValues;
  onSubmit: (values: TValues) => void;
  /** Optional field rendered in a two-column grid beside the Name field. */
  renderNameAdjacent?: (form: UseFormReturn<TValues>) => ReactNode;
  /** Optional fields rendered after Description, before the custom-field editor. */
  renderExtraFields?: (form: UseFormReturn<TValues>) => ReactNode;
}

/**
 * Generic create/edit dialog for entity types (asset / certificate / application).
 * Owns the dialog chrome, the shared Name/Description fields, the custom-field
 * editor, and the reset-on-open behaviour. Entity-specific fields are supplied
 * via the `renderNameAdjacent` / `renderExtraFields` slots.
 */
export function TypeFormDialog<TValues extends BaseTypeFormValues, TEntity>({
  open,
  onOpenChange,
  loading,
  entity,
  entityLabel,
  categoryNoun,
  namePlaceholder,
  schema,
  buildValues,
  onSubmit,
  renderNameAdjacent,
  renderExtraFields,
}: TypeFormDialogProps<TValues, TEntity>) {
  const isEditing = !!entity;

  // zodResolver + react-hook-form's multi-generic UseFormReturn don't line up
  // cleanly for a generic TValues; normalise with localised casts. The public
  // props above stay fully typed for callers.
  const form = useForm<TValues>({
    resolver: zodResolver(
      schema as unknown as Parameters<typeof zodResolver>[0],
    ) as unknown as Resolver<TValues>,
    defaultValues: buildValues(null) as DefaultValues<TValues>,
  }) as unknown as UseFormReturn<TValues>;

  // Keep the latest builder without making it an effect dependency, so the form
  // only resets when the dialog opens or the edited record changes (not on every
  // parent re-render, which would wipe in-progress edits).
  const buildValuesRef = useRef(buildValues);
  useEffect(() => {
    buildValuesRef.current = buildValues;
  });

  useEffect(() => {
    if (open) {
      form.reset(buildValuesRef.current(entity ?? null));
    }
  }, [open, entity, form]);

  // The Name/Description fields exist on every TValues; cast once so the shared
  // FormFields type-check without threading generic field paths.
  const baseControl = form.control as unknown as Control<BaseTypeFormValues>;
  const nameAdjacent = renderNameAdjacent?.(form);

  const nameField = (
    <FormField
      control={baseControl}
      name="name"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="font-semibold">Name</FormLabel>
          <FormControl>
            <Input placeholder={namePlaceholder} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? `Edit ${entityLabel}` : `Add ${entityLabel}`}
      description={`Define a new ${categoryNoun} category with custom fields.`}
      form={form}
      onSubmit={onSubmit}
      loading={loading}
      isEditing={isEditing}
      submitLabel={isEditing ? "Save Changes" : `Add ${entityLabel}`}
      size="2xl"
    >
      {nameAdjacent ? (
        <div className="grid grid-cols-2 gap-6">
          {nameField}
          {nameAdjacent}
        </div>
      ) : (
        nameField
      )}

      <FormField
        control={baseControl}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="font-semibold">Description</FormLabel>
            <FormControl>
              <Input placeholder="Optional description" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {renderExtraFields?.(form)}

      <hr className="border-border" />

      <CustomFieldEditor />
    </FormDialog>
  );
}
