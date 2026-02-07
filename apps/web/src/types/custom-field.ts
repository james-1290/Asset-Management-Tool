export type CustomFieldType =
  | "Text"
  | "Number"
  | "Date"
  | "Boolean"
  | "SingleSelect"
  | "MultiSelect"
  | "Url";

export interface CustomFieldDefinition {
  id: string;
  name: string;
  fieldType: CustomFieldType;
  options: string | null;
  isRequired: boolean;
  sortOrder: number;
}

export interface CustomFieldDefinitionInput {
  id?: string | null;
  name: string;
  fieldType: CustomFieldType;
  options?: string | null;
  isRequired: boolean;
  sortOrder: number;
}

export interface CustomFieldValueDto {
  fieldDefinitionId: string;
  fieldName: string;
  fieldType: CustomFieldType;
  value: string | null;
}

export interface CustomFieldValueInput {
  fieldDefinitionId: string;
  value: string | null;
}
