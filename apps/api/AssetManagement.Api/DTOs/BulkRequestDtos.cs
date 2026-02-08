namespace AssetManagement.Api.DTOs;

public record BulkArchiveRequest(List<Guid> Ids);
public record BulkStatusRequest(List<Guid> Ids, string Status);
public record BulkActionResponse(int Succeeded, int Failed);
