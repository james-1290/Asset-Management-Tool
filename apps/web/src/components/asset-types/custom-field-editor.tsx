import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Checkbox } from "../ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import type { AssetTypeFormValues } from "../../lib/schemas/asset-type";

const FIELD_TYPE_OPTIONS = [
  { value: "Text", label: "Text" },
  { value: "Number", label: "Number" },
  { value: "Date", label: "Date" },
  { value: "Boolean", label: "Yes/No" },
  { value: "SingleSelect", label: "Single Select" },
  { value: "MultiSelect", label: "Multi Select" },
  { value: "Url", label: "URL" },
] as const;

export function CustomFieldEditor() {
  const form = useFormContext<AssetTypeFormValues>();
  const { fields, append, remove, swap } = useFieldArray({
    control: form.control,
    name: "customFields",
  });

  function handleAdd() {
    append({
      id: "",
      name: "",
      fieldType: "Text",
      options: "",
      isRequired: false,
      sortOrder: fields.length,
    });
  }

  function handleMoveUp(index: number) {
    if (index === 0) return;
    swap(index, index - 1);
    // Update sort orders
    form.setValue(`customFields.${index}.sortOrder`, index);
    form.setValue(`customFields.${index - 1}.sortOrder`, index - 1);
  }

  function handleMoveDown(index: number) {
    if (index === fields.length - 1) return;
    swap(index, index + 1);
    form.setValue(`customFields.${index}.sortOrder`, index);
    form.setValue(`customFields.${index + 1}.sortOrder`, index + 1);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <FormLabel className="text-sm font-medium">Custom Fields</FormLabel>
        <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
          <Plus className="mr-1 h-3 w-3" />
          Add Field
        </Button>
      </div>

      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No custom fields defined. Add fields to capture extra data for assets
          of this type.
        </p>
      )}

      <div className="space-y-3">
        {fields.map((field, index) => {
          const fieldType = form.watch(`customFields.${index}.fieldType`);
          const showOptions =
            fieldType === "SingleSelect" || fieldType === "MultiSelect";

          return (
            <div
              key={field.id}
              className="rounded-md border p-3 space-y-3"
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <FormField
                    control={form.control}
                    name={`customFields.${index}.name`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Field name" {...f} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`customFields.${index}.fieldType`}
                    render={({ field: f }) => (
                      <FormItem>
                        <Select
                          onValueChange={f.onChange}
                          value={f.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {FIELD_TYPE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex items-center gap-1 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === fields.length - 1}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {showOptions && (
                <FormField
                  control={form.control}
                  name={`customFields.${index}.options`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder="Options (comma-separated, e.g. Small, Medium, Large)"
                          {...f}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name={`customFields.${index}.isRequired`}
                render={({ field: f }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={f.value}
                        onCheckedChange={f.onChange}
                      />
                    </FormControl>
                    <FormLabel className="text-xs font-normal">
                      Required field
                    </FormLabel>
                  </FormItem>
                )}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
