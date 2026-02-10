namespace AssetManagement.Api.DTOs;

public record SearchResultItem(string Id, string Name, string? Subtitle);

public record SearchResponse(
    List<SearchResultItem> Assets,
    List<SearchResultItem> Certificates,
    List<SearchResultItem> Applications,
    List<SearchResultItem> People,
    List<SearchResultItem> Locations);
