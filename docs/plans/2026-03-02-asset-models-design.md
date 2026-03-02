# Asset Models Design

## Problem

Users want to see product photos next to their assets (e.g., a MacBook Pro image). Images should be tied to the specific product model, not the broad asset type. When an asset is created and a model is selected, the image should appear automatically.

## Decisions

- **Model is a new entity**, separate from Asset Templates. Templates remain as form-default presets; Models represent product identity.
- **Model is conditionally required.** If an asset type has any models defined, selecting a model is required when creating/editing assets of that type. Otherwise the field is hidden.
- **Model fields:** name, manufacturer, image. Minimal but enough for product identity.
- **Revert asset type images.** The `image_url` column on `asset_types` will be removed. Images live only on Models.

## Data Model

### New table: `asset_models`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| asset_type_id | UUID FK | Which type this model belongs to |
| name | VARCHAR(255) | e.g., "MacBook Pro 14\" M3 Max" |
| manufacturer | VARCHAR(255) | e.g., "Apple" |
| image_url | VARCHAR(500) | Storage key for product image, nullable |
| is_archived | BOOLEAN | Soft delete, default false |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### Modified: `assets`

- Add `asset_model_id UUID NULL FK` referencing `asset_models(id)`

### Reverted: `asset_types`

- Drop `image_url` column

## Conditional Requirement Logic

When creating/editing an asset:
1. Backend checks if the selected asset type has any non-archived models
2. If yes: `asset_model_id` is required, validation rejects null
3. If no: `asset_model_id` is ignored

## Image Display Priority

1. Model image (if model is set and has an image)
2. Lucide icon fallback (existing AssetTypeIcon behaviour)

## UI Changes

1. **Models management** — CRUD page for models. Image upload per model. Accessible from settings or asset types.
2. **Asset form** — Model dropdown appears after selecting asset type, filtered to that type's models. Required if models exist.
3. **Asset list & detail** — Show model image when available. Show model name alongside type name.

## What stays the same

- Asset Templates (separate concept for form defaults)
- AssetTypeIcon Lucide icon fallback
- Asset type CRUD (minus the image feature being reverted)
