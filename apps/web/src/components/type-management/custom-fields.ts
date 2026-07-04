import type { CustomFieldDefinition } from "../../types/custom-field";
import type { CustomFieldDefinitionFormValues } from "../../lib/schemas/asset-type";

/** Map stored custom-field definitions into the form's editable representation.
 *  Shared by every entity-type form (asset / certificate / application). */
export function mapCustomFieldsToForm(
  fields?: CustomFieldDefinition[] | null,
): CustomFieldDefinitionFormValues[] {
  return (fields ?? []).map((cf, i) => ({
    id: cf.id,
    name: cf.name,
    fieldType: cf.fieldType,
    options: cf.options ?? "",
    isRequired: cf.isRequired,
    sortOrder: cf.sortOrder ?? i,
  }));
}
