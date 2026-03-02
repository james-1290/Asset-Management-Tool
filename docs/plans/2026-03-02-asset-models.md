# Asset Models Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an "Asset Model" entity (e.g., "MacBook Pro 14" M3 Max") with product images, conditionally required on assets when models exist for that type. Revert the asset-type-level image feature.

**Architecture:** New `asset_models` table with name, manufacturer, image_url, FK to asset_types. Assets gain an optional `asset_model_id` FK. Backend: new AssetModelsController with full CRUD + image upload/delete/serve endpoints. Frontend: new models management page, model selector in asset form, model image display in asset list/detail.

**Tech Stack:** Spring Boot (Kotlin), JPA/Hibernate, Flyway migrations, React + TypeScript, shadcn/ui, TanStack Query, Tailwind CSS.

---

## Task 0: Revert Asset Type Image Feature

The previous feature added images to asset types. This must be reverted since images now live on models.

**Files:**
- Create: `apps/api-kt/src/main/resources/db/migration/V013__create_asset_models.sql`
- Modify: `apps/api-kt/src/main/kotlin/com/assetmanagement/api/model/AssetType.kt`
- Modify: `apps/api-kt/src/main/kotlin/com/assetmanagement/api/dto/AssetTypeDtos.kt`
- Modify: `apps/api-kt/src/main/kotlin/com/assetmanagement/api/dto/AssetDtos.kt`
- Modify: `apps/api-kt/src/main/kotlin/com/assetmanagement/api/controller/AssetTypesController.kt`
- Modify: `apps/api-kt/src/main/kotlin/com/assetmanagement/api/controller/AssetsController.kt`
- Modify: `apps/web/src/types/asset-type.ts`
- Modify: `apps/web/src/types/asset.ts`
- Modify: `apps/web/src/lib/api/asset-types.ts`
- Modify: `apps/web/src/components/assets/asset-type-icon.tsx`
- Modify: `apps/web/src/components/asset-types/asset-type-form-dialog.tsx`
- Modify: `apps/web/src/components/assets/columns.tsx`
- Modify: `apps/web/src/pages/asset-detail.tsx`
- Delete: `apps/web/src/hooks/use-asset-type-image.ts`
- Delete: `apps/api-kt/src/main/resources/db/migration/V012__add_asset_type_image.sql`

**Step 1:** Delete the V012 migration file (it hasn't been applied to any shared DB — only local dev). Create a new combined migration V012 that does both the revert AND creates the asset_models table plus adds asset_model_id to assets:

```sql
-- V012__asset_models.sql

-- Create asset_models table
CREATE TABLE asset_models (
    id CHAR(36) NOT NULL PRIMARY KEY,
    asset_type_id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    manufacturer VARCHAR(255) NULL,
    image_url VARCHAR(500) NULL,
    is_archived TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    INDEX ix_asset_models_asset_type_id (asset_type_id),
    CONSTRAINT fk_asset_models_asset_type FOREIGN KEY (asset_type_id) REFERENCES asset_types(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add model reference to assets
ALTER TABLE assets ADD COLUMN asset_model_id CHAR(36) NULL;
ALTER TABLE assets ADD CONSTRAINT fk_assets_asset_model FOREIGN KEY (asset_model_id) REFERENCES asset_models(id) ON DELETE SET NULL;
ALTER TABLE assets ADD INDEX ix_assets_asset_model_id (asset_model_id);
```

**Step 2:** Revert AssetType entity — remove `imageUrl` field from `apps/api-kt/src/main/kotlin/com/assetmanagement/api/model/AssetType.kt`.

**Step 3:** Revert AssetTypeDtos — remove `imageUrl` from `AssetTypeDto`.

**Step 4:** Revert AssetDtos — remove `assetTypeImageUrl` from `AssetDto`. Add `assetModelId`, `assetModelName`, `assetModelImageUrl` fields.

**Step 5:** Revert AssetTypesController — remove `StorageService` injection, remove companion object with ALLOWED_CONTENT_TYPES/MAX_IMAGE_SIZE, remove the three image endpoints (uploadImage, deleteImage, getImage), remove extra imports (InputStreamResource, HttpHeaders, MediaType, MultipartFile). Revert `toDto()` to not include imageUrl.

**Step 6:** Update AssetsController `toDto()` — remove `assetTypeImageUrl`, add `assetModelId`, `assetModelName`, `assetModelImageUrl`.

**Step 7:** Revert frontend types:
- `apps/web/src/types/asset-type.ts` — remove `imageUrl`
- `apps/web/src/types/asset.ts` — remove `assetTypeImageUrl`, add `assetModelId: string | null`, `assetModelName: string | null`, `assetModelImageUrl: string | null`

**Step 8:** Revert frontend API functions — remove `uploadImage`, `deleteImage`, `getImageUrl` from `apps/web/src/lib/api/asset-types.ts`.

**Step 9:** Revert AssetTypeIcon — remove `imageUrl`, `assetTypeId` props and `useAssetTypeImage` import/usage. Back to original icon-only component.

**Step 10:** Revert asset-type-form-dialog — remove all image upload UI, revert imports to original.

**Step 11:** Revert columns.tsx — remove `imageUrl`/`assetTypeId` props from `AssetTypeIcon` call.

**Step 12:** Revert asset-detail.tsx — remove `AssetTypeIcon` import. Restore original letter avatar in header (but we'll re-add image support in a later task using model data).

**Step 13:** Delete `apps/web/src/hooks/use-asset-type-image.ts`.

**Step 14:** Drop the local flyway history for V012 so the new V012 can run:

```bash
# Reset local DB flyway history for V012 (only if it was applied)
# Option A: Drop and recreate local DB
# Option B: DELETE FROM flyway_schema_history WHERE version = '12';
# Then also: ALTER TABLE asset_types DROP COLUMN image_url;
```

**Step 15:** Build backend and frontend to verify clean compilation.

**Step 16:** Commit.

```bash
git add -A
git commit -m "revert: remove asset type images, add V012 migration for asset models table

Replaces the asset-type-level image feature with a new asset_models table.
Images will live on models instead of asset types."
```

---

## Task 1: Backend — AssetModel Entity + Repository

**Files:**
- Create: `apps/api-kt/src/main/kotlin/com/assetmanagement/api/model/AssetModel.kt`
- Modify: `apps/api-kt/src/main/kotlin/com/assetmanagement/api/repository/Repositories.kt`
- Modify: `apps/api-kt/src/main/kotlin/com/assetmanagement/api/model/Asset.kt` (no existing file named Asset.kt, find actual path)

**Step 1:** Create the AssetModel entity:

```kotlin
// apps/api-kt/src/main/kotlin/com/assetmanagement/api/model/AssetModel.kt
package com.assetmanagement.api.model

import jakarta.persistence.*
import java.time.Instant
import java.util.*

@Entity
@Table(name = "asset_models")
class AssetModel(
    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)")
    var id: UUID = UUID.randomUUID(),

    @Column(name = "asset_type_id", nullable = false)
    var assetTypeId: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asset_type_id", insertable = false, updatable = false)
    var assetType: AssetType? = null,

    @Column(name = "name", nullable = false)
    var name: String = "",

    @Column(name = "manufacturer")
    var manufacturer: String? = null,

    @Column(name = "image_url", length = 500)
    var imageUrl: String? = null,

    @Column(name = "is_archived", nullable = false)
    var isArchived: Boolean = false,

    @Column(name = "created_at", nullable = false)
    var createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now()
)
```

**Step 2:** Add repository to Repositories.kt:

```kotlin
@Repository
interface AssetModelRepository : JpaRepository<AssetModel, UUID>, JpaSpecificationExecutor<AssetModel> {
    fun findByAssetTypeIdAndIsArchivedFalse(assetTypeId: UUID): List<AssetModel>
    fun findByIsArchivedFalse(): List<AssetModel>
    fun countByAssetTypeIdAndIsArchivedFalse(assetTypeId: UUID): Long
}
```

**Step 3:** Add `assetModelId` and `assetModel` relationship to Asset entity:

```kotlin
// Add to Asset class constructor parameters:
@Column(name = "asset_model_id")
var assetModelId: UUID? = null,

@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "asset_model_id", insertable = false, updatable = false)
var assetModel: AssetModel? = null,
```

**Step 4:** Build to verify: `cd apps/api-kt && ./gradlew build`

**Step 5:** Commit.

```bash
git commit -m "feat: add AssetModel entity, repository, and Asset relationship"
```

---

## Task 2: Backend — AssetModel DTOs + Controller

**Files:**
- Create: `apps/api-kt/src/main/kotlin/com/assetmanagement/api/dto/AssetModelDtos.kt`
- Create: `apps/api-kt/src/main/kotlin/com/assetmanagement/api/controller/AssetModelsController.kt`

**Step 1:** Create DTOs:

```kotlin
// apps/api-kt/src/main/kotlin/com/assetmanagement/api/dto/AssetModelDtos.kt
package com.assetmanagement.api.dto

import java.time.Instant
import java.util.*

data class AssetModelDto(
    val id: UUID,
    val assetTypeId: UUID,
    val assetTypeName: String,
    val name: String,
    val manufacturer: String?,
    val imageUrl: String?,
    val isArchived: Boolean,
    val createdAt: Instant,
    val updatedAt: Instant
)

data class CreateAssetModelRequest(
    val assetTypeId: UUID,
    val name: String,
    val manufacturer: String? = null
)

data class UpdateAssetModelRequest(
    val name: String,
    val manufacturer: String? = null
)
```

**Step 2:** Create controller with full CRUD + image endpoints:

```kotlin
// apps/api-kt/src/main/kotlin/com/assetmanagement/api/controller/AssetModelsController.kt
package com.assetmanagement.api.controller

import com.assetmanagement.api.dto.*
import com.assetmanagement.api.model.AssetModel
import com.assetmanagement.api.repository.AssetModelRepository
import com.assetmanagement.api.repository.AssetTypeRepository
import com.assetmanagement.api.repository.AssetRepository
import com.assetmanagement.api.service.AuditEntry
import com.assetmanagement.api.service.AuditService
import com.assetmanagement.api.service.CurrentUserService
import com.assetmanagement.api.service.StorageService
import com.assetmanagement.api.util.SqlUtils
import jakarta.persistence.criteria.Predicate
import org.springframework.core.io.InputStreamResource
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.data.jpa.domain.Specification
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.multipart.MultipartFile
import org.springframework.transaction.annotation.Transactional
import java.net.URI
import java.time.Instant
import java.util.*

@RestController
@RequestMapping("/api/v1/asset-models")
class AssetModelsController(
    private val assetModelRepository: AssetModelRepository,
    private val assetTypeRepository: AssetTypeRepository,
    private val assetRepository: AssetRepository,
    private val storageService: StorageService,
    private val auditService: AuditService,
    private val currentUserService: CurrentUserService
) {
    companion object {
        private val ALLOWED_CONTENT_TYPES = setOf("image/jpeg", "image/png", "image/gif")
        private const val MAX_IMAGE_SIZE = 2 * 1024 * 1024L
    }

    @GetMapping
    fun getAll(
        @RequestParam(defaultValue = "1") page: Int,
        @RequestParam(defaultValue = "25") pageSize: Int,
        @RequestParam(required = false) search: String?,
        @RequestParam(required = false) assetTypeId: UUID?,
        @RequestParam(defaultValue = "name") sortBy: String,
        @RequestParam(defaultValue = "asc") sortDir: String
    ): ResponseEntity<PagedResponse<AssetModelDto>> {
        val p = maxOf(1, page); val ps = pageSize.coerceIn(1, 100)
        val spec = Specification<AssetModel> { root, _, cb ->
            val preds = mutableListOf<Predicate>()
            preds.add(cb.equal(root.get<Boolean>("isArchived"), false))
            if (assetTypeId != null) preds.add(cb.equal(root.get<UUID>("assetTypeId"), assetTypeId))
            if (!search.isNullOrBlank()) {
                val pattern = "%${SqlUtils.escapeLikePattern(search.lowercase())}%"
                preds.add(cb.or(
                    cb.like(cb.lower(root.get("name")), pattern, '\\'),
                    cb.like(cb.lower(root.get("manufacturer")), pattern, '\\')
                ))
            }
            cb.and(*preds.toTypedArray())
        }
        val dir = if (sortDir.equals("desc", ignoreCase = true)) Sort.Direction.DESC else Sort.Direction.ASC
        val sort = Sort.by(dir, when (sortBy.lowercase()) {
            "manufacturer" -> "manufacturer"; "createdat" -> "createdAt"; else -> "name"
        })
        val result = assetModelRepository.findAll(spec, PageRequest.of(p - 1, ps, sort))
        val items = result.content.map { it.toDto() }
        return ResponseEntity.ok(PagedResponse(items, p, ps, result.totalElements))
    }

    @GetMapping("/{id}")
    fun getById(@PathVariable id: UUID): ResponseEntity<AssetModelDto> {
        val model = assetModelRepository.findById(id).orElse(null) ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(model.toDto())
    }

    @PostMapping
    @Transactional
    fun create(@RequestBody request: CreateAssetModelRequest): ResponseEntity<Any> {
        if (!assetTypeRepository.existsById(request.assetTypeId))
            return ResponseEntity.badRequest().body(mapOf("error" to "Asset type not found"))
        val model = AssetModel(
            assetTypeId = request.assetTypeId,
            name = request.name,
            manufacturer = request.manufacturer
        )
        assetModelRepository.save(model)
        auditService.log(AuditEntry("Created", "AssetModel", model.id.toString(), model.name,
            "Created asset model \"${model.name}\"", currentUserService.userId, currentUserService.userName))
        return ResponseEntity.created(URI("/api/v1/asset-models/${model.id}"))
            .body(assetModelRepository.findById(model.id).orElseThrow().toDto())
    }

    @PutMapping("/{id}")
    @Transactional
    fun update(@PathVariable id: UUID, @RequestBody request: UpdateAssetModelRequest): ResponseEntity<Any> {
        val model = assetModelRepository.findById(id).orElse(null) ?: return ResponseEntity.notFound().build()
        model.name = request.name
        model.manufacturer = request.manufacturer
        model.updatedAt = Instant.now()
        assetModelRepository.save(model)
        auditService.log(AuditEntry("Updated", "AssetModel", model.id.toString(), model.name,
            "Updated asset model \"${model.name}\"", currentUserService.userId, currentUserService.userName))
        return ResponseEntity.ok(assetModelRepository.findById(model.id).orElseThrow().toDto())
    }

    @DeleteMapping("/{id}")
    @Transactional
    fun archive(@PathVariable id: UUID): ResponseEntity<Any> {
        val model = assetModelRepository.findById(id).orElse(null) ?: return ResponseEntity.notFound().build()
        model.isArchived = true
        model.updatedAt = Instant.now()
        assetModelRepository.save(model)
        auditService.log(AuditEntry("Archived", "AssetModel", model.id.toString(), model.name,
            "Archived asset model \"${model.name}\"", currentUserService.userId, currentUserService.userName))
        return ResponseEntity.noContent().build()
    }

    @PostMapping("/{id}/image")
    @Transactional
    fun uploadImage(@PathVariable id: UUID, @RequestParam("file") file: MultipartFile): ResponseEntity<Any> {
        val model = assetModelRepository.findById(id).orElse(null) ?: return ResponseEntity.notFound().build()
        val contentType = file.contentType ?: return ResponseEntity.badRequest().body(mapOf("error" to "Missing content type"))
        if (contentType !in ALLOWED_CONTENT_TYPES) return ResponseEntity.badRequest().body(mapOf("error" to "Only JPEG, PNG, and GIF images are allowed"))
        if (file.size > MAX_IMAGE_SIZE) return ResponseEntity.badRequest().body(mapOf("error" to "Image must be under 2MB"))

        model.imageUrl?.let { oldKey -> runCatching { storageService.delete(oldKey) } }

        val ext = when (contentType) { "image/png" -> "png"; "image/gif" -> "gif"; else -> "jpg" }
        val key = "asset-model-images/${id}.$ext"
        storageService.store(key, file.inputStream, file.size)
        model.imageUrl = key
        model.updatedAt = Instant.now()
        assetModelRepository.save(model)

        return ResponseEntity.ok(model.toDto())
    }

    @DeleteMapping("/{id}/image")
    @Transactional
    fun deleteImage(@PathVariable id: UUID): ResponseEntity<Any> {
        val model = assetModelRepository.findById(id).orElse(null) ?: return ResponseEntity.notFound().build()
        val imageKey = model.imageUrl ?: return ResponseEntity.noContent().build()
        runCatching { storageService.delete(imageKey) }
        model.imageUrl = null
        model.updatedAt = Instant.now()
        assetModelRepository.save(model)
        return ResponseEntity.noContent().build()
    }

    @GetMapping("/{id}/image")
    fun getImage(@PathVariable id: UUID): ResponseEntity<Any> {
        val model = assetModelRepository.findById(id).orElse(null) ?: return ResponseEntity.notFound().build()
        val imageKey = model.imageUrl ?: return ResponseEntity.notFound().build()
        val inputStream = try { storageService.load(imageKey) } catch (_: Exception) { return ResponseEntity.notFound().build() }
        val mediaType = when {
            imageKey.endsWith(".png") -> MediaType.IMAGE_PNG
            imageKey.endsWith(".gif") -> MediaType.IMAGE_GIF
            else -> MediaType.IMAGE_JPEG
        }
        return ResponseEntity.ok()
            .contentType(mediaType)
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
            .header(HttpHeaders.CACHE_CONTROL, "max-age=3600")
            .body(InputStreamResource(inputStream))
    }

    private fun AssetModel.toDto() = AssetModelDto(
        id, assetTypeId, assetType?.name ?: "", name, manufacturer, imageUrl, isArchived, createdAt, updatedAt
    )
}
```

**Step 3:** Update AssetsController — add `assetModelId` to `CreateAssetRequest` and `UpdateAssetRequest` DTOs, update the create/update handlers to set `asset.assetModelId`, and add conditional validation (require model if type has models). Update `toDto()` to include `assetModelId`, `assetModelName`, `assetModelImageUrl`.

In `AssetDtos.kt`, add to `CreateAssetRequest` and `UpdateAssetRequest`:
```kotlin
val assetModelId: UUID? = null,
```

In `AssetsController.kt` create handler (~line 220), after setting assetTypeId:
```kotlin
// Conditional model validation
val modelCount = assetModelRepository.countByAssetTypeIdAndIsArchivedFalse(request.assetTypeId)
if (modelCount > 0 && request.assetModelId == null) {
    return ResponseEntity.badRequest().body(mapOf("error" to "A model must be selected for this asset type"))
}
asset.assetModelId = request.assetModelId
```

Same pattern in the update handler.

Inject `AssetModelRepository` into `AssetsController`.

**Step 4:** Build to verify.

**Step 5:** Commit.

```bash
git commit -m "feat: add AssetModelsController with CRUD and image endpoints

Includes paged listing, create/update/archive, image upload/delete/serve.
Assets now validate that a model is selected when the type has models defined."
```

---

## Task 3: Frontend — Types, API Client, Hook

**Files:**
- Create: `apps/web/src/types/asset-model.ts`
- Create: `apps/web/src/lib/api/asset-models.ts`
- Create: `apps/web/src/hooks/use-asset-models.ts`
- Create: `apps/web/src/hooks/use-asset-model-image.ts`

**Step 1:** Create TypeScript types:

```typescript
// apps/web/src/types/asset-model.ts
export interface AssetModel {
  id: string;
  assetTypeId: string;
  assetTypeName: string;
  name: string;
  manufacturer: string | null;
  imageUrl: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssetModelRequest {
  assetTypeId: string;
  name: string;
  manufacturer?: string | null;
}

export interface UpdateAssetModelRequest {
  name: string;
  manufacturer?: string | null;
}
```

**Step 2:** Create API client:

```typescript
// apps/web/src/lib/api/asset-models.ts
import { apiClient } from "../api-client";
import type {
  AssetModel,
  CreateAssetModelRequest,
  UpdateAssetModelRequest,
} from "../../types/asset-model";
import type { PagedResponse } from "../../types/paged-response";

export interface AssetModelQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  assetTypeId?: string;
  sortBy?: string;
  sortDir?: string;
}

export const assetModelsApi = {
  getAll(assetTypeId?: string): Promise<AssetModel[]> {
    const params: Record<string, string | number> = { pageSize: 1000 };
    if (assetTypeId) params.assetTypeId = assetTypeId;
    return apiClient
      .get<PagedResponse<AssetModel>>("/asset-models", params)
      .then((r) => r.items);
  },

  getPaged(params: AssetModelQueryParams): Promise<PagedResponse<AssetModel>> {
    return apiClient.get<PagedResponse<AssetModel>>("/asset-models", params as Record<string, string | number | undefined>);
  },

  getById(id: string): Promise<AssetModel> {
    return apiClient.get<AssetModel>(`/asset-models/${id}`);
  },

  create(data: CreateAssetModelRequest): Promise<AssetModel> {
    return apiClient.post<AssetModel>("/asset-models", data);
  },

  update(id: string, data: UpdateAssetModelRequest): Promise<AssetModel> {
    return apiClient.put<AssetModel>(`/asset-models/${id}`, data);
  },

  archive(id: string): Promise<void> {
    return apiClient.delete(`/asset-models/${id}`);
  },

  uploadImage(id: string, file: File): Promise<AssetModel> {
    return apiClient.uploadFile<AssetModel>(`/asset-models/${id}/image`, file);
  },

  deleteImage(id: string): Promise<void> {
    return apiClient.delete(`/asset-models/${id}/image`);
  },
};
```

**Step 3:** Create React Query hooks:

```typescript
// apps/web/src/hooks/use-asset-models.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { assetModelsApi } from "../lib/api/asset-models";
import type { CreateAssetModelRequest, UpdateAssetModelRequest } from "../types/asset-model";

const assetModelKeys = {
  all: ["asset-models"] as const,
  list: (assetTypeId?: string) => ["asset-models", { assetTypeId }] as const,
  detail: (id: string) => ["asset-models", id] as const,
};

export function useAssetModels(assetTypeId?: string) {
  return useQuery({
    queryKey: assetModelKeys.list(assetTypeId),
    queryFn: () => assetModelsApi.getAll(assetTypeId),
    enabled: assetTypeId !== undefined,
  });
}

export function useAssetModel(id: string) {
  return useQuery({
    queryKey: assetModelKeys.detail(id),
    queryFn: () => assetModelsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateAssetModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAssetModelRequest) => assetModelsApi.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: assetModelKeys.all }); },
  });
}

export function useUpdateAssetModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAssetModelRequest }) => assetModelsApi.update(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: assetModelKeys.all });
      queryClient.invalidateQueries({ queryKey: assetModelKeys.detail(variables.id) });
    },
  });
}

export function useArchiveAssetModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => assetModelsApi.archive(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: assetModelKeys.all }); },
  });
}
```

**Step 4:** Create authenticated image hook (same pattern as the reverted one, but for models):

```typescript
// apps/web/src/hooks/use-asset-model-image.ts
import { useState, useEffect } from "react";

const blobCache = new Map<string, string>();

export function useAssetModelImage(assetModelId: string | null | undefined, imageUrl: string | null | undefined) {
  const [src, setSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!assetModelId || !imageUrl) {
      setSrc(null);
      return;
    }

    const cacheKey = `${assetModelId}:${imageUrl}`;
    const cached = blobCache.get(cacheKey);
    if (cached) {
      setSrc(cached);
      return;
    }

    setIsLoading(true);
    const token = localStorage.getItem("token");
    fetch(`/api/v1/asset-models/${assetModelId}/image`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load image");
        return res.blob();
      })
      .then((blob) => {
        const objectUrl = URL.createObjectURL(blob);
        blobCache.set(cacheKey, objectUrl);
        setSrc(objectUrl);
      })
      .catch(() => setSrc(null))
      .finally(() => setIsLoading(false));
  }, [assetModelId, imageUrl]);

  return { src, isLoading };
}

export function clearAssetModelImageCache(assetModelId: string) {
  for (const [key, url] of blobCache.entries()) {
    if (key.startsWith(`${assetModelId}:`)) {
      URL.revokeObjectURL(url);
      blobCache.delete(key);
    }
  }
}
```

**Step 5:** Build frontend to verify: `cd apps/web && npm run build`

**Step 6:** Commit.

```bash
git commit -m "feat: add frontend types, API client, and hooks for asset models"
```

---

## Task 4: Frontend — Asset Models Management Page

**Files:**
- Create: `apps/web/src/pages/asset-models.tsx`
- Create: `apps/web/src/components/asset-models/asset-model-form-dialog.tsx`
- Create: `apps/web/src/components/asset-models/columns.tsx`
- Modify: `apps/web/src/App.tsx` — add route
- Modify: `apps/web/src/components/app-sidebar.tsx` — add nav link

**Step 1:** Create columns definition for the models table. Include: Name (with image thumbnail), Manufacturer, Asset Type, and Actions (edit/delete).

**Step 2:** Create form dialog for create/edit model. Fields: Asset Type (select, disabled on edit), Name, Manufacturer. When editing, show image upload section (same pattern as the old asset-type-form-dialog image UI — thumbnail + upload/remove buttons). Use `assetModelsApi.uploadImage` and `assetModelsApi.deleteImage`.

**Step 3:** Create the page component. Follow the same pattern as `apps/web/src/pages/asset-templates.tsx` — paged data table with search, create/edit/archive actions, optional asset type filter.

**Step 4:** Add route to App.tsx:

```tsx
import AssetModelsPage from "@/pages/asset-models"
// ...
<Route path="/asset-models" element={<AssetModelsPage />} />
```

**Step 5:** Add sidebar link in `apps/web/src/components/app-sidebar.tsx`, under the Assets section children, after "Asset Templates":

```typescript
{ title: "Asset Models", url: "/asset-models" },
```

**Step 6:** Build frontend to verify.

**Step 7:** Commit.

```bash
git commit -m "feat: add asset models management page with CRUD and image upload"
```

---

## Task 5: Frontend — Model Selector in Asset Form + Image Display

**Files:**
- Modify: `apps/web/src/components/assets/asset-form-dialog.tsx` — add model dropdown
- Modify: `apps/web/src/lib/schemas/asset.ts` — add `assetModelId` field
- Modify: `apps/web/src/components/assets/asset-type-icon.tsx` — add model image support
- Modify: `apps/web/src/components/assets/columns.tsx` — pass model image props
- Modify: `apps/web/src/pages/asset-detail.tsx` — show model image + model name

**Step 1:** Add `assetModelId` to asset schema:

```typescript
// In apps/web/src/lib/schemas/asset.ts
assetModelId: z.string().optional().or(z.literal("")),
```

**Step 2:** In asset-form-dialog.tsx, add model selection:
- Import `useAssetModels` hook
- After the asset type dropdown, query models for the selected type: `const { data: models } = useAssetModels(watchedAssetTypeId)`
- Show a "Model" dropdown when `models && models.length > 0`. Make it required (add `*` label).
- Add `assetModelId` to the form field
- Clear `assetModelId` when asset type changes (models change)
- In the submit handler, include `assetModelId` in the payload (or null if empty/none)

```tsx
{watchedAssetTypeId && models && models.length > 0 && (
  <FormField
    control={form.control}
    name="assetModelId"
    render={({ field }) => (
      <FormItem>
        <FormLabel className="font-semibold">Model *</FormLabel>
        <Select onValueChange={field.onChange} value={field.value}>
          <FormControl>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            {models.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.manufacturer ? `${m.manufacturer} ${m.name}` : m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FormMessage />
      </FormItem>
    )}
  />
)}
```

**Step 3:** Update AssetTypeIcon to support model images. Add `assetModelId` and `assetModelImageUrl` props. Use `useAssetModelImage` hook. Display priority: model image → Lucide icon fallback.

**Step 4:** Update columns.tsx to pass model image data to AssetTypeIcon:

```tsx
<AssetTypeIcon
  typeName={row.original.assetTypeName}
  assetModelId={row.original.assetModelId}
  assetModelImageUrl={row.original.assetModelImageUrl}
/>
```

**Step 5:** Update asset-detail.tsx:
- Use AssetTypeIcon with model image in the header
- Show model name in the subtitle (alongside type name)
- Show model name in the details grid

**Step 6:** Update handleFormSubmit and handleCloneSubmit in asset-detail.tsx to include `assetModelId`.

**Step 7:** Build frontend to verify.

**Step 8:** Commit.

```bash
git commit -m "feat: add model selector to asset form, display model images in list and detail"
```

---

## Task 6: Build, Verify, Update Docs

**Step 1:** Build both projects:

```bash
cd apps/api-kt && ./gradlew build
cd apps/web && npm run build
```

**Step 2:** Restart API server and verify:
- Login works
- `GET /api/v1/asset-models` returns empty list
- `POST /api/v1/asset-models` creates a model
- Image upload/serve works on the model
- Creating an asset with a model works
- Creating an asset without a model (for a type with no models) works
- Creating an asset without a model (for a type WITH models) returns validation error

**Step 3:** Update CHANGELOG.md.

**Step 4:** Commit.

```bash
git commit -m "docs: update changelog for asset models feature"
```

**Step 5:** Ensure API and frontend dev servers are running before declaring done.
