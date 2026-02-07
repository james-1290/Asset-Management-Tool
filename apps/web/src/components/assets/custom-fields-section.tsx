import { useFormContext } from "react-hook-form";
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
import type { CustomFieldDefinition } from "../../types/custom-field";
import type { AssetFormValues } from "../../lib/schemas/asset";

interface CustomFieldsSectionProps {
  definitions: CustomFieldDefinition[];
}

export function CustomFieldsSection({ definitions }: CustomFieldsSectionProps) {
  const form = useFormContext<AssetFormValues>();

  if (definitions.length === 0) return null;

  function parseOptions(options: string | null): string[] {
    if (!options) return [];
    try {
      const parsed = JSON.parse(options);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Fall through to comma-split
    }
    return options
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-muted-foreground">
        Custom Fields
      </p>
      <div className="grid grid-cols-2 gap-4">
        {definitions.map((def) => {
          const fieldPath =
            `customFieldValues.${def.id}` as `customFieldValues.${string}`;
          const options = parseOptions(def.options);

          switch (def.fieldType) {
            case "Text":
              return (
                <FormField
                  key={def.id}
                  control={form.control}
                  name={fieldPath}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {def.name}
                        {def.isRequired && " *"}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={def.name}
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              );

            case "Number":
              return (
                <FormField
                  key={def.id}
                  control={form.control}
                  name={fieldPath}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {def.name}
                        {def.isRequired && " *"}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder={def.name}
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              );

            case "Date":
              return (
                <FormField
                  key={def.id}
                  control={form.control}
                  name={fieldPath}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {def.name}
                        {def.isRequired && " *"}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              );

            case "Boolean":
              return (
                <FormField
                  key={def.id}
                  control={form.control}
                  name={fieldPath}
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0 pt-6">
                      <FormControl>
                        <Checkbox
                          checked={field.value === "true"}
                          onCheckedChange={(checked) =>
                            field.onChange(checked ? "true" : "false")
                          }
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        {def.name}
                        {def.isRequired && " *"}
                      </FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              );

            case "SingleSelect":
              return (
                <FormField
                  key={def.id}
                  control={form.control}
                  name={fieldPath}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {def.name}
                        {def.isRequired && " *"}
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? ""}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={`Select ${def.name}`} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {options.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              );

            case "MultiSelect": {
              return (
                <FormField
                  key={def.id}
                  control={form.control}
                  name={fieldPath}
                  render={({ field }) => {
                    const selected: string[] = field.value
                      ? (() => {
                          try {
                            return JSON.parse(field.value);
                          } catch {
                            return [];
                          }
                        })()
                      : [];

                    function toggleOption(opt: string) {
                      const next = selected.includes(opt)
                        ? selected.filter((s) => s !== opt)
                        : [...selected, opt];
                      field.onChange(
                        next.length > 0 ? JSON.stringify(next) : ""
                      );
                    }

                    return (
                      <FormItem>
                        <FormLabel>
                          {def.name}
                          {def.isRequired && " *"}
                        </FormLabel>
                        <div className="space-y-1">
                          {options.map((opt) => (
                            <label
                              key={opt}
                              className="flex items-center gap-2 text-sm"
                            >
                              <Checkbox
                                checked={selected.includes(opt)}
                                onCheckedChange={() => toggleOption(opt)}
                              />
                              {opt}
                            </label>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              );
            }

            case "Url":
              return (
                <FormField
                  key={def.id}
                  control={form.control}
                  name={fieldPath}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {def.name}
                        {def.isRequired && " *"}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          placeholder="https://..."
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              );

            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}
