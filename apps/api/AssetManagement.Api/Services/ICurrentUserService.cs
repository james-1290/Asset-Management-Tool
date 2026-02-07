namespace AssetManagement.Api.Services;

public interface ICurrentUserService
{
    Guid? UserId { get; }
    string UserName { get; }
}
