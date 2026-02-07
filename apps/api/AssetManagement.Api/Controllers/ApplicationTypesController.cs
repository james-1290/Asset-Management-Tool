using AssetManagement.Api.Data;
using AssetManagement.Api.DTOs;
using AssetManagement.Api.Models;
using AssetManagement.Api.Models.Enums;
using AssetManagement.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EntityTypeEnum = AssetManagement.Api.Models.Enums.EntityType;

namespace AssetManagement.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class ApplicationTypesController(AppDbContext db, IAuditService audit) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResponse<ApplicationTypeDto>>> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        [FromQuery] string? search = null,
        [FromQuery] string sortBy = "name",
        [FromQuery] string sortDir = "asc")
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = db.ApplicationTypes
            .Where(t => !t.IsArchived)
            .Include(t => t.CustomFieldDefinitions)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(t => EF.Functions.ILike(t.Name, $"%{search}%"));
        }

        var totalCount = await query.CountAsync();

        var desc = string.Equals(sortDir, "desc", StringComparison.OrdinalIgnoreCase);
        query = sortBy.ToLowerInvariant() switch
        {
            "description" => desc ? query.OrderByDescending(t => t.Description) : query.OrderBy(t => t.Description),
            "createdat" => desc ? query.OrderByDescending(t => t.CreatedAt) : query.OrderBy(t => t.CreatedAt),
            _ => desc ? query.OrderByDescending(t => t.Name) : query.OrderBy(t => t.Name),
        };

        var types = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var result = new PagedResponse<ApplicationTypeDto>(
            types.Select(t => ToDto(t)).ToList(),
            page,
            pageSize,
            totalCount);

        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApplicationTypeDto>> GetById(Guid id)
    {
        var type = await db.ApplicationTypes
            .Include(t => t.CustomFieldDefinitions)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (type is null) return NotFound();

        return Ok(ToDto(type));
    }

    [HttpGet("{id:guid}/customfields")]
    public async Task<ActionResult<List<CustomFieldDefinitionDto>>> GetCustomFields(Guid id)
    {
        var typeExists = await db.ApplicationTypes.AnyAsync(t => t.Id == id);
        if (!typeExists) return NotFound();

        var definitions = await db.CustomFieldDefinitions
            .Where(d => d.ApplicationTypeId == id && !d.IsArchived)
            .OrderBy(d => d.SortOrder)
            .Select(d => new CustomFieldDefinitionDto(
                d.Id, d.Name, d.FieldType.ToString(), d.Options, d.IsRequired, d.SortOrder))
            .ToListAsync();

        return Ok(definitions);
    }

    [HttpPost]
    public async Task<ActionResult<ApplicationTypeDto>> Create(CreateApplicationTypeRequest request)
    {
        var type = new ApplicationType
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Description = request.Description
        };

        db.ApplicationTypes.Add(type);

        if (request.CustomFields is { Count: > 0 })
        {
            foreach (var field in request.CustomFields)
            {
                if (!Enum.TryParse<CustomFieldType>(field.FieldType, out var fieldType))
                    return BadRequest(new { error = $"Invalid field type: {field.FieldType}" });

                var definition = new CustomFieldDefinition
                {
                    Id = Guid.NewGuid(),
                    EntityType = EntityTypeEnum.Application,
                    ApplicationTypeId = type.Id,
                    Name = field.Name,
                    FieldType = fieldType,
                    Options = field.Options,
                    IsRequired = field.IsRequired,
                    SortOrder = field.SortOrder
                };
                db.CustomFieldDefinitions.Add(definition);
            }
        }

        await db.SaveChangesAsync();

        await audit.LogAsync(new AuditEntry(
            Action: "Created",
            EntityType: "ApplicationType",
            EntityId: type.Id.ToString(),
            EntityName: type.Name,
            Details: $"Created application type \"{type.Name}\"" +
                (request.CustomFields is { Count: > 0 } ? $" with {request.CustomFields.Count} custom field(s)" : "")));

        await db.Entry(type).Collection(t => t.CustomFieldDefinitions).LoadAsync();

        return CreatedAtAction(nameof(GetById), new { id = type.Id }, ToDto(type));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApplicationTypeDto>> Update(Guid id, UpdateApplicationTypeRequest request)
    {
        var type = await db.ApplicationTypes
            .Include(t => t.CustomFieldDefinitions)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (type is null) return NotFound();

        type.Name = request.Name;
        type.Description = request.Description;
        type.UpdatedAt = DateTime.UtcNow;

        if (request.CustomFields is not null)
        {
            var existing = type.CustomFieldDefinitions.Where(d => !d.IsArchived).ToList();
            var requestIds = request.CustomFields
                .Where(f => f.Id.HasValue)
                .Select(f => f.Id!.Value)
                .ToHashSet();

            foreach (var def in existing)
            {
                if (!requestIds.Contains(def.Id))
                {
                    def.IsArchived = true;
                }
            }

            foreach (var field in request.CustomFields)
            {
                if (!Enum.TryParse<CustomFieldType>(field.FieldType, out var fieldType))
                    return BadRequest(new { error = $"Invalid field type: {field.FieldType}" });

                if (field.Id.HasValue)
                {
                    var def = existing.FirstOrDefault(d => d.Id == field.Id.Value);
                    if (def is not null)
                    {
                        def.Name = field.Name;
                        def.FieldType = fieldType;
                        def.Options = field.Options;
                        def.IsRequired = field.IsRequired;
                        def.SortOrder = field.SortOrder;
                    }
                }
                else
                {
                    var definition = new CustomFieldDefinition
                    {
                        Id = Guid.NewGuid(),
                        EntityType = EntityTypeEnum.Application,
                        ApplicationTypeId = type.Id,
                        Name = field.Name,
                        FieldType = fieldType,
                        Options = field.Options,
                        IsRequired = field.IsRequired,
                        SortOrder = field.SortOrder
                    };
                    db.CustomFieldDefinitions.Add(definition);
                }
            }
        }

        await db.SaveChangesAsync();

        await audit.LogAsync(new AuditEntry(
            Action: "Updated",
            EntityType: "ApplicationType",
            EntityId: type.Id.ToString(),
            EntityName: type.Name,
            Details: $"Updated application type \"{type.Name}\""));

        await db.Entry(type).Collection(t => t.CustomFieldDefinitions).LoadAsync();

        return Ok(ToDto(type));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Archive(Guid id)
    {
        var type = await db.ApplicationTypes.FindAsync(id);
        if (type is null) return NotFound();

        type.IsArchived = true;
        type.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        await audit.LogAsync(new AuditEntry(
            Action: "Archived",
            EntityType: "ApplicationType",
            EntityId: type.Id.ToString(),
            EntityName: type.Name,
            Details: $"Archived application type \"{type.Name}\""));

        return NoContent();
    }

    private static ApplicationTypeDto ToDto(ApplicationType t) => new(
        t.Id, t.Name, t.Description,
        t.IsArchived, t.CreatedAt, t.UpdatedAt,
        t.CustomFieldDefinitions
            .Where(d => !d.IsArchived)
            .OrderBy(d => d.SortOrder)
            .Select(d => new CustomFieldDefinitionDto(
                d.Id, d.Name, d.FieldType.ToString(), d.Options, d.IsRequired, d.SortOrder))
            .ToList());
}
