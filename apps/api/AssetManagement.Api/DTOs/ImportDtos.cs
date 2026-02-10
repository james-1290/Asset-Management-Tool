namespace AssetManagement.Api.DTOs;

public record ImportRowResult(
    int RowNumber,
    bool IsValid,
    List<string> Errors,
    Dictionary<string, string?> Data
);

public record ImportValidationResponse(
    string EntityType,
    int TotalRows,
    int ValidRows,
    int InvalidRows,
    List<ImportRowResult> Rows
);

public record ImportExecuteResponse(
    string EntityType,
    int Imported,
    int Skipped,
    int Failed,
    List<string> Errors
);
