namespace AssetManagement.Api.DTOs;

public record PagedResponse<T>(List<T> Items, int Page, int PageSize, int TotalCount);
