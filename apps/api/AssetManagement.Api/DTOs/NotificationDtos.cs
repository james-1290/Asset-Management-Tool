namespace AssetManagement.Api.DTOs;

public record NotificationItem(string Id, string Name, DateTime ExpiryDate);

public record NotificationGroup(int Count, List<NotificationItem> Items);

public record NotificationSummary(
    int TotalCount,
    NotificationGroup Warranties,
    NotificationGroup Certificates,
    NotificationGroup Licences);
