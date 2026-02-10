using System.Globalization;
using AssetManagement.Api.Data;
using AssetManagement.Api.DTOs;
using AssetManagement.Api.Models;
using AssetManagement.Api.Models.Enums;
using AssetManagement.Api.Services;
using CsvHelper;
using CsvHelper.Configuration;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AssetManagement.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/import")]
public class ImportController(AppDbContext db, IAuditService audit, ICurrentUserService currentUser) : ControllerBase
{
    private static readonly string[] ValidEntityTypes = ["locations", "people", "assets", "certificates", "applications"];
    private const long MaxFileSize = 5 * 1024 * 1024; // 5MB
    private const int MaxRows = 10_000;

    // ─── Template download ───────────────────────────────────────────────

    [HttpGet("{entityType}/template")]
    public IActionResult DownloadTemplate(string entityType)
    {
        entityType = entityType.ToLowerInvariant();
        if (!ValidEntityTypes.Contains(entityType))
            return BadRequest(new { error = $"Invalid entity type '{entityType}'. Valid types: {string.Join(", ", ValidEntityTypes)}" });

        var (headers, exampleRows) = GetTemplateData(entityType);

        var ms = new MemoryStream();
        using (var writer = new StreamWriter(ms, leaveOpen: true))
        using (var csv = new CsvWriter(writer, CultureInfo.InvariantCulture))
        {
            foreach (var h in headers) csv.WriteField(h);
            csv.NextRecord();

            foreach (var row in exampleRows)
            {
                foreach (var h in headers)
                    csv.WriteField(row.GetValueOrDefault(h, ""));
                csv.NextRecord();
            }
        }

        ms.Position = 0;
        return File(ms, "text/csv", $"{entityType}-import-template.csv");
    }

    // ─── Validate ────────────────────────────────────────────────────────

    [HttpPost("{entityType}/validate")]
    [RequestSizeLimit(MaxFileSize)]
    public async Task<ActionResult<ImportValidationResponse>> Validate(string entityType, IFormFile file)
    {
        entityType = entityType.ToLowerInvariant();
        if (!ValidEntityTypes.Contains(entityType))
            return BadRequest(new { error = $"Invalid entity type '{entityType}'." });

        if (file == null || file.Length == 0)
            return BadRequest(new { error = "No file uploaded." });

        if (file.Length > MaxFileSize)
            return BadRequest(new { error = "File exceeds 5MB limit." });

        var rows = ParseCsvRows(file);
        if (rows.Count > MaxRows)
            return BadRequest(new { error = $"File exceeds {MaxRows} row limit ({rows.Count} rows found)." });

        if (rows.Count == 0)
            return BadRequest(new { error = "CSV file contains no data rows." });

        var results = entityType switch
        {
            "locations" => await ValidateLocations(rows),
            "people" => await ValidatePeople(rows),
            "assets" => await ValidateAssets(rows),
            "certificates" => await ValidateCertificates(rows),
            "applications" => await ValidateApplications(rows),
            _ => []
        };

        return Ok(new ImportValidationResponse(
            EntityType: entityType,
            TotalRows: results.Count,
            ValidRows: results.Count(r => r.IsValid),
            InvalidRows: results.Count(r => !r.IsValid),
            Rows: results
        ));
    }

    // ─── Execute ─────────────────────────────────────────────────────────

    [HttpPost("{entityType}/execute")]
    [RequestSizeLimit(MaxFileSize)]
    public async Task<ActionResult<ImportExecuteResponse>> Execute(string entityType, IFormFile file)
    {
        entityType = entityType.ToLowerInvariant();
        if (!ValidEntityTypes.Contains(entityType))
            return BadRequest(new { error = $"Invalid entity type '{entityType}'." });

        if (file == null || file.Length == 0)
            return BadRequest(new { error = "No file uploaded." });

        if (file.Length > MaxFileSize)
            return BadRequest(new { error = "File exceeds 5MB limit." });

        var rows = ParseCsvRows(file);
        if (rows.Count > MaxRows)
            return BadRequest(new { error = $"File exceeds {MaxRows} row limit." });

        if (rows.Count == 0)
            return BadRequest(new { error = "CSV file contains no data rows." });

        var (imported, skipped, failed, errors) = entityType switch
        {
            "locations" => await ExecuteLocations(rows),
            "people" => await ExecutePeople(rows),
            "assets" => await ExecuteAssets(rows),
            "certificates" => await ExecuteCertificates(rows),
            "applications" => await ExecuteApplications(rows),
            _ => (0, 0, 0, new List<string>())
        };

        return Ok(new ImportExecuteResponse(
            EntityType: entityType,
            Imported: imported,
            Skipped: skipped,
            Failed: failed,
            Errors: errors
        ));
    }

    // ─── CSV parsing helper ──────────────────────────────────────────────

    private static List<Dictionary<string, string>> ParseCsvRows(IFormFile file)
    {
        var rows = new List<Dictionary<string, string>>();
        using var stream = file.OpenReadStream();
        using var reader = new StreamReader(stream);
        using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            HasHeaderRecord = true,
            MissingFieldFound = null,
            HeaderValidated = null,
            TrimOptions = TrimOptions.Trim,
        });

        csv.Read();
        csv.ReadHeader();
        var headers = csv.HeaderRecord ?? [];

        while (csv.Read())
        {
            var row = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (var header in headers)
            {
                var value = csv.GetField(header)?.Trim() ?? "";
                row[header] = value;
            }
            rows.Add(row);
        }

        return rows;
    }

    // ─── Shared helpers ──────────────────────────────────────────────────

    private static string Get(Dictionary<string, string> row, string key) =>
        row.TryGetValue(key, out var v) ? v : "";

    private static List<string> CheckRequired(Dictionary<string, string> row, params string[] fields)
    {
        var errors = new List<string>();
        foreach (var f in fields)
            if (string.IsNullOrWhiteSpace(Get(row, f)))
                errors.Add($"'{f}' is required.");
        return errors;
    }

    private static List<string> CheckMaxLength(Dictionary<string, string> row, int max, params string[] fields)
    {
        var errors = new List<string>();
        foreach (var f in fields)
        {
            var val = Get(row, f);
            if (val.Length > max)
                errors.Add($"'{f}' exceeds {max} characters.");
        }
        return errors;
    }

    private static bool TryParseDate(string value, out DateTime date)
    {
        date = default;
        if (string.IsNullOrWhiteSpace(value)) return false;
        return DateTime.TryParseExact(value, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out date);
    }

    private static bool TryParseBool(string value, out bool result)
    {
        result = false;
        if (string.IsNullOrWhiteSpace(value)) return false;
        var lower = value.ToLowerInvariant();
        if (lower is "true" or "yes" or "1") { result = true; return true; }
        if (lower is "false" or "no" or "0") { result = false; return true; }
        return false;
    }

    private static bool TryParseDecimal(string value, out decimal result)
    {
        result = 0;
        if (string.IsNullOrWhiteSpace(value)) return false;
        return decimal.TryParse(value, NumberStyles.Any, CultureInfo.InvariantCulture, out result);
    }

    private static bool TryParseInt(string value, out int result)
    {
        result = 0;
        if (string.IsNullOrWhiteSpace(value)) return false;
        return int.TryParse(value, out result);
    }

    private static Dictionary<string, string?> RowToData(Dictionary<string, string> row) =>
        row.ToDictionary(kv => kv.Key, kv => (string?)kv.Value);

    // ─── Template data ───────────────────────────────────────────────────

    private static (string[] Headers, List<Dictionary<string, string>> ExampleRows) GetTemplateData(string entityType)
    {
        return entityType switch
        {
            "locations" => (
                ["Name", "Address", "City", "Country"],
                [
                    new() { ["Name"] = "Head Office", ["Address"] = "123 Main St", ["City"] = "London", ["Country"] = "United Kingdom" },
                    new() { ["Name"] = "Warehouse", ["Address"] = "456 Industrial Ave", ["City"] = "Manchester", ["Country"] = "United Kingdom" },
                ]),
            "people" => (
                ["FullName", "Email", "Department", "JobTitle", "Location"],
                [
                    new() { ["FullName"] = "Jane Smith", ["Email"] = "jane@example.com", ["Department"] = "Engineering", ["JobTitle"] = "Developer", ["Location"] = "Head Office" },
                    new() { ["FullName"] = "John Doe", ["Email"] = "john@example.com", ["Department"] = "IT", ["JobTitle"] = "Admin", ["Location"] = "Warehouse" },
                ]),
            "assets" => (
                ["Name", "AssetTag", "AssetType", "Status", "Location", "AssignedTo", "SerialNumber", "PurchaseDate", "PurchaseCost", "WarrantyExpiryDate", "Notes"],
                [
                    new() { ["Name"] = "MacBook Pro 16\"", ["AssetTag"] = "AST-001", ["AssetType"] = "Laptop", ["Status"] = "Available", ["Location"] = "Head Office", ["AssignedTo"] = "", ["SerialNumber"] = "SN12345", ["PurchaseDate"] = "2024-01-15", ["PurchaseCost"] = "2499.99", ["WarrantyExpiryDate"] = "2027-01-15", ["Notes"] = "" },
                    new() { ["Name"] = "Dell Monitor 27\"", ["AssetTag"] = "AST-002", ["AssetType"] = "Monitor", ["Status"] = "Assigned", ["Location"] = "Head Office", ["AssignedTo"] = "Jane Smith", ["SerialNumber"] = "SN67890", ["PurchaseDate"] = "2024-03-01", ["PurchaseCost"] = "599.99", ["WarrantyExpiryDate"] = "2026-03-01", ["Notes"] = "Stand-mounted" },
                ]),
            "certificates" => (
                ["Name", "CertificateType", "Status", "Issuer", "Subject", "IssuedDate", "ExpiryDate", "AutoRenewal", "Notes"],
                [
                    new() { ["Name"] = "SSL Wildcard", ["CertificateType"] = "SSL", ["Status"] = "Active", ["Issuer"] = "DigiCert", ["Subject"] = "*.example.com", ["IssuedDate"] = "2024-01-01", ["ExpiryDate"] = "2025-01-01", ["AutoRenewal"] = "true", ["Notes"] = "" },
                    new() { ["Name"] = "Code Signing", ["CertificateType"] = "Code Signing", ["Status"] = "Active", ["Issuer"] = "Sectigo", ["Subject"] = "Example Corp", ["IssuedDate"] = "2024-06-01", ["ExpiryDate"] = "2025-06-01", ["AutoRenewal"] = "false", ["Notes"] = "For release builds" },
                ]),
            "applications" => (
                ["Name", "ApplicationType", "Status", "Publisher", "Version", "LicenceKey", "LicenceType", "MaxSeats", "UsedSeats", "PurchaseDate", "ExpiryDate", "PurchaseCost", "AutoRenewal", "Notes"],
                [
                    new() { ["Name"] = "Microsoft 365", ["ApplicationType"] = "SaaS", ["Status"] = "Active", ["Publisher"] = "Microsoft", ["Version"] = "E5", ["LicenceKey"] = "XXXX-YYYY-ZZZZ", ["LicenceType"] = "Subscription", ["MaxSeats"] = "50", ["UsedSeats"] = "42", ["PurchaseDate"] = "2024-01-01", ["ExpiryDate"] = "2025-01-01", ["PurchaseCost"] = "18000.00", ["AutoRenewal"] = "true", ["Notes"] = "" },
                    new() { ["Name"] = "Adobe Creative Cloud", ["ApplicationType"] = "SaaS", ["Status"] = "Active", ["Publisher"] = "Adobe", ["Version"] = "2024", ["LicenceKey"] = "AAAA-BBBB-CCCC", ["LicenceType"] = "PerSeat", ["MaxSeats"] = "10", ["UsedSeats"] = "8", ["PurchaseDate"] = "2024-03-01", ["ExpiryDate"] = "2025-03-01", ["PurchaseCost"] = "6000.00", ["AutoRenewal"] = "false", ["Notes"] = "Design team" },
                ]),
            _ => ([], [])
        };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LOCATIONS
    // ═══════════════════════════════════════════════════════════════════════

    private Task<List<ImportRowResult>> ValidateLocations(List<Dictionary<string, string>> rows)
    {
        var results = new List<ImportRowResult>();
        var seenNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        for (var i = 0; i < rows.Count; i++)
        {
            var row = rows[i];
            var errors = new List<string>();

            errors.AddRange(CheckRequired(row, "Name"));
            errors.AddRange(CheckMaxLength(row, 200, "Name", "City", "Country"));
            errors.AddRange(CheckMaxLength(row, 500, "Address"));

            var name = Get(row, "Name");
            if (!string.IsNullOrWhiteSpace(name) && !seenNames.Add(name))
                errors.Add("Duplicate 'Name' within CSV.");

            results.Add(new ImportRowResult(i + 1, errors.Count == 0, errors, RowToData(row)));
        }

        return Task.FromResult(results);
    }

    private async Task<(int Imported, int Skipped, int Failed, List<string> Errors)> ExecuteLocations(List<Dictionary<string, string>> rows)
    {
        int imported = 0, skipped = 0, failed = 0;
        var errors = new List<string>();
        var validation = await ValidateLocations(rows);

        for (var i = 0; i < rows.Count; i++)
        {
            if (!validation[i].IsValid)
            {
                skipped++;
                errors.Add($"Row {i + 1}: {string.Join("; ", validation[i].Errors)}");
                continue;
            }

            try
            {
                var row = rows[i];
                var location = new Location
                {
                    Id = Guid.NewGuid(),
                    Name = Get(row, "Name"),
                    Address = NullIfEmpty(Get(row, "Address")),
                    City = NullIfEmpty(Get(row, "City")),
                    Country = NullIfEmpty(Get(row, "Country")),
                };
                db.Locations.Add(location);
                await db.SaveChangesAsync();

                await audit.LogAsync(new AuditEntry(
                    Action: "Created",
                    EntityType: "Location",
                    EntityId: location.Id.ToString(),
                    EntityName: location.Name,
                    Details: "Imported via CSV import",
                    ActorId: currentUser.UserId,
                    ActorName: currentUser.UserName
                ));
                imported++;
            }
            catch (Exception ex)
            {
                failed++;
                errors.Add($"Row {i + 1}: {ex.Message}");
            }
        }

        return (imported, skipped, failed, errors);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PEOPLE
    // ═══════════════════════════════════════════════════════════════════════

    private async Task<List<ImportRowResult>> ValidatePeople(List<Dictionary<string, string>> rows)
    {
        var results = new List<ImportRowResult>();
        var locations = await db.Locations.Where(l => !l.IsArchived).ToListAsync();

        for (var i = 0; i < rows.Count; i++)
        {
            var row = rows[i];
            var errors = new List<string>();

            errors.AddRange(CheckRequired(row, "FullName"));
            errors.AddRange(CheckMaxLength(row, 200, "FullName", "Department", "JobTitle", "Location"));

            var email = Get(row, "Email");
            if (!string.IsNullOrWhiteSpace(email) && !IsValidEmail(email))
                errors.Add("'Email' is not a valid email address.");

            var locationName = Get(row, "Location");
            if (!string.IsNullOrWhiteSpace(locationName))
            {
                var match = locations.FirstOrDefault(l => l.Name.Equals(locationName, StringComparison.OrdinalIgnoreCase));
                if (match == null)
                    errors.Add($"Location '{locationName}' not found.");
            }

            results.Add(new ImportRowResult(i + 1, errors.Count == 0, errors, RowToData(row)));
        }

        return results;
    }

    private async Task<(int Imported, int Skipped, int Failed, List<string> Errors)> ExecutePeople(List<Dictionary<string, string>> rows)
    {
        int imported = 0, skipped = 0, failed = 0;
        var errors = new List<string>();
        var validation = await ValidatePeople(rows);
        var locations = await db.Locations.Where(l => !l.IsArchived).ToListAsync();

        for (var i = 0; i < rows.Count; i++)
        {
            if (!validation[i].IsValid)
            {
                skipped++;
                errors.Add($"Row {i + 1}: {string.Join("; ", validation[i].Errors)}");
                continue;
            }

            try
            {
                var row = rows[i];
                Guid? locationId = null;
                var locationName = Get(row, "Location");
                if (!string.IsNullOrWhiteSpace(locationName))
                    locationId = locations.FirstOrDefault(l => l.Name.Equals(locationName, StringComparison.OrdinalIgnoreCase))?.Id;

                var person = new Person
                {
                    Id = Guid.NewGuid(),
                    FullName = Get(row, "FullName"),
                    Email = NullIfEmpty(Get(row, "Email")),
                    Department = NullIfEmpty(Get(row, "Department")),
                    JobTitle = NullIfEmpty(Get(row, "JobTitle")),
                    LocationId = locationId,
                };
                db.People.Add(person);
                await db.SaveChangesAsync();

                await audit.LogAsync(new AuditEntry(
                    Action: "Created",
                    EntityType: "Person",
                    EntityId: person.Id.ToString(),
                    EntityName: person.FullName,
                    Details: "Imported via CSV import",
                    ActorId: currentUser.UserId,
                    ActorName: currentUser.UserName
                ));
                imported++;
            }
            catch (Exception ex)
            {
                failed++;
                errors.Add($"Row {i + 1}: {ex.Message}");
            }
        }

        return (imported, skipped, failed, errors);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ASSETS
    // ═══════════════════════════════════════════════════════════════════════

    private async Task<List<ImportRowResult>> ValidateAssets(List<Dictionary<string, string>> rows)
    {
        var results = new List<ImportRowResult>();
        var assetTypes = await db.AssetTypes.Where(t => !t.IsArchived).ToListAsync();
        var locations = await db.Locations.Where(l => !l.IsArchived).ToListAsync();
        var people = await db.People.Where(p => !p.IsArchived).ToListAsync();
        var existingTags = await db.Assets.Select(a => a.AssetTag.ToLower()).ToListAsync();
        var existingTagSet = new HashSet<string>(existingTags, StringComparer.OrdinalIgnoreCase);
        var csvTags = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        for (var i = 0; i < rows.Count; i++)
        {
            var row = rows[i];
            var errors = new List<string>();

            errors.AddRange(CheckRequired(row, "Name", "AssetTag", "AssetType"));
            errors.AddRange(CheckMaxLength(row, 200, "Name", "AssetTag", "SerialNumber"));
            errors.AddRange(CheckMaxLength(row, 2000, "Notes"));

            // AssetTag uniqueness
            var tag = Get(row, "AssetTag");
            if (!string.IsNullOrWhiteSpace(tag))
            {
                if (existingTagSet.Contains(tag))
                    errors.Add($"AssetTag '{tag}' already exists in the database.");
                else if (!csvTags.Add(tag))
                    errors.Add($"Duplicate AssetTag '{tag}' within CSV.");
            }

            // AssetType FK
            var typeName = Get(row, "AssetType");
            if (!string.IsNullOrWhiteSpace(typeName))
            {
                var match = assetTypes.FirstOrDefault(t => t.Name.Equals(typeName, StringComparison.OrdinalIgnoreCase));
                if (match == null)
                    errors.Add($"AssetType '{typeName}' not found.");
            }

            // Status enum
            var status = Get(row, "Status");
            if (!string.IsNullOrWhiteSpace(status) && !Enum.TryParse<AssetStatus>(status, true, out _))
                errors.Add($"Invalid Status '{status}'. Valid: {string.Join(", ", Enum.GetNames<AssetStatus>())}");

            // Location FK
            var locationName = Get(row, "Location");
            if (!string.IsNullOrWhiteSpace(locationName))
            {
                var match = locations.FirstOrDefault(l => l.Name.Equals(locationName, StringComparison.OrdinalIgnoreCase));
                if (match == null)
                    errors.Add($"Location '{locationName}' not found.");
            }

            // AssignedTo FK
            var personName = Get(row, "AssignedTo");
            if (!string.IsNullOrWhiteSpace(personName))
            {
                var match = people.FirstOrDefault(p => p.FullName.Equals(personName, StringComparison.OrdinalIgnoreCase));
                if (match == null)
                    errors.Add($"Person '{personName}' not found.");
            }

            // Dates
            var purchaseDate = Get(row, "PurchaseDate");
            if (!string.IsNullOrWhiteSpace(purchaseDate) && !TryParseDate(purchaseDate, out _))
                errors.Add("'PurchaseDate' must be in yyyy-MM-dd format.");

            var warrantyDate = Get(row, "WarrantyExpiryDate");
            if (!string.IsNullOrWhiteSpace(warrantyDate) && !TryParseDate(warrantyDate, out _))
                errors.Add("'WarrantyExpiryDate' must be in yyyy-MM-dd format.");

            // Cost
            var cost = Get(row, "PurchaseCost");
            if (!string.IsNullOrWhiteSpace(cost) && !TryParseDecimal(cost, out _))
                errors.Add("'PurchaseCost' must be a valid number.");

            results.Add(new ImportRowResult(i + 1, errors.Count == 0, errors, RowToData(row)));
        }

        return results;
    }

    private async Task<(int Imported, int Skipped, int Failed, List<string> Errors)> ExecuteAssets(List<Dictionary<string, string>> rows)
    {
        int imported = 0, skipped = 0, failed = 0;
        var errors = new List<string>();
        var validation = await ValidateAssets(rows);
        var assetTypes = await db.AssetTypes.Where(t => !t.IsArchived).ToListAsync();
        var locations = await db.Locations.Where(l => !l.IsArchived).ToListAsync();
        var people = await db.People.Where(p => !p.IsArchived).ToListAsync();

        for (var i = 0; i < rows.Count; i++)
        {
            if (!validation[i].IsValid)
            {
                skipped++;
                errors.Add($"Row {i + 1}: {string.Join("; ", validation[i].Errors)}");
                continue;
            }

            try
            {
                var row = rows[i];
                var assetType = assetTypes.First(t => t.Name.Equals(Get(row, "AssetType"), StringComparison.OrdinalIgnoreCase));

                Guid? locationId = null;
                var locationName = Get(row, "Location");
                if (!string.IsNullOrWhiteSpace(locationName))
                    locationId = locations.FirstOrDefault(l => l.Name.Equals(locationName, StringComparison.OrdinalIgnoreCase))?.Id;

                Guid? personId = null;
                var personName = Get(row, "AssignedTo");
                if (!string.IsNullOrWhiteSpace(personName))
                    personId = people.FirstOrDefault(p => p.FullName.Equals(personName, StringComparison.OrdinalIgnoreCase))?.Id;

                var statusStr = Get(row, "Status");
                var status = !string.IsNullOrWhiteSpace(statusStr)
                    ? Enum.Parse<AssetStatus>(statusStr, true)
                    : AssetStatus.Available;

                DateTime? purchaseDate = null;
                if (TryParseDate(Get(row, "PurchaseDate"), out var pd)) purchaseDate = pd;

                DateTime? warrantyDate = null;
                if (TryParseDate(Get(row, "WarrantyExpiryDate"), out var wd)) warrantyDate = wd;

                decimal? purchaseCost = null;
                if (TryParseDecimal(Get(row, "PurchaseCost"), out var pc)) purchaseCost = pc;

                var asset = new Asset
                {
                    Id = Guid.NewGuid(),
                    Name = Get(row, "Name"),
                    AssetTag = Get(row, "AssetTag"),
                    AssetTypeId = assetType.Id,
                    Status = status,
                    LocationId = locationId,
                    AssignedPersonId = personId,
                    SerialNumber = NullIfEmpty(Get(row, "SerialNumber")),
                    PurchaseDate = purchaseDate,
                    PurchaseCost = purchaseCost,
                    WarrantyExpiryDate = warrantyDate,
                    Notes = NullIfEmpty(Get(row, "Notes")),
                };
                db.Assets.Add(asset);
                await db.SaveChangesAsync();

                await audit.LogAsync(new AuditEntry(
                    Action: "Created",
                    EntityType: "Asset",
                    EntityId: asset.Id.ToString(),
                    EntityName: asset.Name,
                    Details: "Imported via CSV import",
                    ActorId: currentUser.UserId,
                    ActorName: currentUser.UserName
                ));
                imported++;
            }
            catch (Exception ex)
            {
                failed++;
                errors.Add($"Row {i + 1}: {ex.Message}");
            }
        }

        return (imported, skipped, failed, errors);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CERTIFICATES
    // ═══════════════════════════════════════════════════════════════════════

    private async Task<List<ImportRowResult>> ValidateCertificates(List<Dictionary<string, string>> rows)
    {
        var results = new List<ImportRowResult>();
        var certTypes = await db.CertificateTypes.Where(t => !t.IsArchived).ToListAsync();

        for (var i = 0; i < rows.Count; i++)
        {
            var row = rows[i];
            var errors = new List<string>();

            errors.AddRange(CheckRequired(row, "Name", "CertificateType"));
            errors.AddRange(CheckMaxLength(row, 200, "Name", "Issuer", "Subject"));
            errors.AddRange(CheckMaxLength(row, 2000, "Notes"));

            var typeName = Get(row, "CertificateType");
            if (!string.IsNullOrWhiteSpace(typeName))
            {
                var match = certTypes.FirstOrDefault(t => t.Name.Equals(typeName, StringComparison.OrdinalIgnoreCase));
                if (match == null)
                    errors.Add($"CertificateType '{typeName}' not found.");
            }

            var status = Get(row, "Status");
            if (!string.IsNullOrWhiteSpace(status) && !Enum.TryParse<CertificateStatus>(status, true, out _))
                errors.Add($"Invalid Status '{status}'. Valid: {string.Join(", ", Enum.GetNames<CertificateStatus>())}");

            var issuedDate = Get(row, "IssuedDate");
            if (!string.IsNullOrWhiteSpace(issuedDate) && !TryParseDate(issuedDate, out _))
                errors.Add("'IssuedDate' must be in yyyy-MM-dd format.");

            var expiryDate = Get(row, "ExpiryDate");
            if (!string.IsNullOrWhiteSpace(expiryDate) && !TryParseDate(expiryDate, out _))
                errors.Add("'ExpiryDate' must be in yyyy-MM-dd format.");

            var autoRenewal = Get(row, "AutoRenewal");
            if (!string.IsNullOrWhiteSpace(autoRenewal) && !TryParseBool(autoRenewal, out _))
                errors.Add("'AutoRenewal' must be true/false, yes/no, or 1/0.");

            results.Add(new ImportRowResult(i + 1, errors.Count == 0, errors, RowToData(row)));
        }

        return results;
    }

    private async Task<(int Imported, int Skipped, int Failed, List<string> Errors)> ExecuteCertificates(List<Dictionary<string, string>> rows)
    {
        int imported = 0, skipped = 0, failed = 0;
        var errors = new List<string>();
        var validation = await ValidateCertificates(rows);
        var certTypes = await db.CertificateTypes.Where(t => !t.IsArchived).ToListAsync();

        for (var i = 0; i < rows.Count; i++)
        {
            if (!validation[i].IsValid)
            {
                skipped++;
                errors.Add($"Row {i + 1}: {string.Join("; ", validation[i].Errors)}");
                continue;
            }

            try
            {
                var row = rows[i];
                var certType = certTypes.First(t => t.Name.Equals(Get(row, "CertificateType"), StringComparison.OrdinalIgnoreCase));

                var statusStr = Get(row, "Status");
                var status = !string.IsNullOrWhiteSpace(statusStr)
                    ? Enum.Parse<CertificateStatus>(statusStr, true)
                    : CertificateStatus.Active;

                DateTime? issuedDate = null;
                if (TryParseDate(Get(row, "IssuedDate"), out var id)) issuedDate = id;

                DateTime? expiryDate = null;
                if (TryParseDate(Get(row, "ExpiryDate"), out var ed)) expiryDate = ed;

                bool autoRenewal = false;
                TryParseBool(Get(row, "AutoRenewal"), out autoRenewal);

                var certificate = new Certificate
                {
                    Id = Guid.NewGuid(),
                    Name = Get(row, "Name"),
                    CertificateTypeId = certType.Id,
                    Status = status,
                    Issuer = NullIfEmpty(Get(row, "Issuer")),
                    Subject = NullIfEmpty(Get(row, "Subject")),
                    IssuedDate = issuedDate,
                    ExpiryDate = expiryDate,
                    AutoRenewal = autoRenewal,
                    Notes = NullIfEmpty(Get(row, "Notes")),
                };
                db.Certificates.Add(certificate);
                await db.SaveChangesAsync();

                await audit.LogAsync(new AuditEntry(
                    Action: "Created",
                    EntityType: "Certificate",
                    EntityId: certificate.Id.ToString(),
                    EntityName: certificate.Name,
                    Details: "Imported via CSV import",
                    ActorId: currentUser.UserId,
                    ActorName: currentUser.UserName
                ));
                imported++;
            }
            catch (Exception ex)
            {
                failed++;
                errors.Add($"Row {i + 1}: {ex.Message}");
            }
        }

        return (imported, skipped, failed, errors);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // APPLICATIONS
    // ═══════════════════════════════════════════════════════════════════════

    private async Task<List<ImportRowResult>> ValidateApplications(List<Dictionary<string, string>> rows)
    {
        var results = new List<ImportRowResult>();
        var appTypes = await db.ApplicationTypes.Where(t => !t.IsArchived).ToListAsync();

        for (var i = 0; i < rows.Count; i++)
        {
            var row = rows[i];
            var errors = new List<string>();

            errors.AddRange(CheckRequired(row, "Name", "ApplicationType"));
            errors.AddRange(CheckMaxLength(row, 200, "Name", "Publisher", "Version", "LicenceKey"));
            errors.AddRange(CheckMaxLength(row, 2000, "Notes"));

            var typeName = Get(row, "ApplicationType");
            if (!string.IsNullOrWhiteSpace(typeName))
            {
                var match = appTypes.FirstOrDefault(t => t.Name.Equals(typeName, StringComparison.OrdinalIgnoreCase));
                if (match == null)
                    errors.Add($"ApplicationType '{typeName}' not found.");
            }

            var status = Get(row, "Status");
            if (!string.IsNullOrWhiteSpace(status) && !Enum.TryParse<ApplicationStatus>(status, true, out _))
                errors.Add($"Invalid Status '{status}'. Valid: {string.Join(", ", Enum.GetNames<ApplicationStatus>())}");

            var licenceType = Get(row, "LicenceType");
            if (!string.IsNullOrWhiteSpace(licenceType) && !Enum.TryParse<LicenceType>(licenceType, true, out _))
                errors.Add($"Invalid LicenceType '{licenceType}'. Valid: {string.Join(", ", Enum.GetNames<LicenceType>())}");

            var purchaseDate = Get(row, "PurchaseDate");
            if (!string.IsNullOrWhiteSpace(purchaseDate) && !TryParseDate(purchaseDate, out _))
                errors.Add("'PurchaseDate' must be in yyyy-MM-dd format.");

            var expiryDate = Get(row, "ExpiryDate");
            if (!string.IsNullOrWhiteSpace(expiryDate) && !TryParseDate(expiryDate, out _))
                errors.Add("'ExpiryDate' must be in yyyy-MM-dd format.");

            var cost = Get(row, "PurchaseCost");
            if (!string.IsNullOrWhiteSpace(cost) && !TryParseDecimal(cost, out _))
                errors.Add("'PurchaseCost' must be a valid number.");

            var maxSeats = Get(row, "MaxSeats");
            if (!string.IsNullOrWhiteSpace(maxSeats) && !TryParseInt(maxSeats, out _))
                errors.Add("'MaxSeats' must be a whole number.");

            var usedSeats = Get(row, "UsedSeats");
            if (!string.IsNullOrWhiteSpace(usedSeats) && !TryParseInt(usedSeats, out _))
                errors.Add("'UsedSeats' must be a whole number.");

            var autoRenewal = Get(row, "AutoRenewal");
            if (!string.IsNullOrWhiteSpace(autoRenewal) && !TryParseBool(autoRenewal, out _))
                errors.Add("'AutoRenewal' must be true/false, yes/no, or 1/0.");

            results.Add(new ImportRowResult(i + 1, errors.Count == 0, errors, RowToData(row)));
        }

        return results;
    }

    private async Task<(int Imported, int Skipped, int Failed, List<string> Errors)> ExecuteApplications(List<Dictionary<string, string>> rows)
    {
        int imported = 0, skipped = 0, failed = 0;
        var errors = new List<string>();
        var validation = await ValidateApplications(rows);
        var appTypes = await db.ApplicationTypes.Where(t => !t.IsArchived).ToListAsync();

        for (var i = 0; i < rows.Count; i++)
        {
            if (!validation[i].IsValid)
            {
                skipped++;
                errors.Add($"Row {i + 1}: {string.Join("; ", validation[i].Errors)}");
                continue;
            }

            try
            {
                var row = rows[i];
                var appType = appTypes.First(t => t.Name.Equals(Get(row, "ApplicationType"), StringComparison.OrdinalIgnoreCase));

                var statusStr = Get(row, "Status");
                var status = !string.IsNullOrWhiteSpace(statusStr)
                    ? Enum.Parse<ApplicationStatus>(statusStr, true)
                    : ApplicationStatus.Active;

                LicenceType? licenceType = null;
                var ltStr = Get(row, "LicenceType");
                if (!string.IsNullOrWhiteSpace(ltStr))
                    licenceType = Enum.Parse<LicenceType>(ltStr, true);

                DateTime? purchaseDate = null;
                if (TryParseDate(Get(row, "PurchaseDate"), out var pd)) purchaseDate = pd;

                DateTime? expiryDate = null;
                if (TryParseDate(Get(row, "ExpiryDate"), out var ed)) expiryDate = ed;

                decimal? purchaseCost = null;
                if (TryParseDecimal(Get(row, "PurchaseCost"), out var pc)) purchaseCost = pc;

                int? maxSeats = null;
                if (TryParseInt(Get(row, "MaxSeats"), out var ms)) maxSeats = ms;

                int? usedSeats = null;
                if (TryParseInt(Get(row, "UsedSeats"), out var us)) usedSeats = us;

                bool autoRenewal = false;
                TryParseBool(Get(row, "AutoRenewal"), out autoRenewal);

                var application = new Application
                {
                    Id = Guid.NewGuid(),
                    Name = Get(row, "Name"),
                    ApplicationTypeId = appType.Id,
                    Status = status,
                    Publisher = NullIfEmpty(Get(row, "Publisher")),
                    Version = NullIfEmpty(Get(row, "Version")),
                    LicenceKey = NullIfEmpty(Get(row, "LicenceKey")),
                    LicenceType = licenceType,
                    MaxSeats = maxSeats,
                    UsedSeats = usedSeats,
                    PurchaseDate = purchaseDate,
                    ExpiryDate = expiryDate,
                    PurchaseCost = purchaseCost,
                    AutoRenewal = autoRenewal,
                    Notes = NullIfEmpty(Get(row, "Notes")),
                };
                db.Applications.Add(application);
                await db.SaveChangesAsync();

                await audit.LogAsync(new AuditEntry(
                    Action: "Created",
                    EntityType: "Application",
                    EntityId: application.Id.ToString(),
                    EntityName: application.Name,
                    Details: "Imported via CSV import",
                    ActorId: currentUser.UserId,
                    ActorName: currentUser.UserName
                ));
                imported++;
            }
            catch (Exception ex)
            {
                failed++;
                errors.Add($"Row {i + 1}: {ex.Message}");
            }
        }

        return (imported, skipped, failed, errors);
    }

    // ─── Utility ─────────────────────────────────────────────────────────

    private static string? NullIfEmpty(string value) =>
        string.IsNullOrWhiteSpace(value) ? null : value;

    private static bool IsValidEmail(string email) =>
        email.Contains('@') && email.Contains('.') && email.IndexOf('@') < email.LastIndexOf('.');
}
