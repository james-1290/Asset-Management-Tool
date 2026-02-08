using System.Text;
using AssetManagement.Api.Data;
using AssetManagement.Api.Models;
using AssetManagement.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IAuditService, AuditService>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? ["http://localhost:5173"])
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Auto-migrate in development
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();

    // Seed admin role + user if not exists
    if (!await db.Roles.AnyAsync(r => r.Name == "Admin"))
    {
        var role = new Role
        {
            Id = Guid.NewGuid(),
            Name = "Admin",
            Description = "Full system administrator"
        };
        db.Roles.Add(role);

        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = "admin",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
            Email = "admin@localhost",
            DisplayName = "Administrator"
        };
        db.Users.Add(user);

        db.Set<UserRole>().Add(new UserRole { UserId = user.Id, RoleId = role.Id });

        await db.SaveChangesAsync();
    }

    // Seed "User" role if not exists
    if (!await db.Roles.AnyAsync(r => r.Name == "User"))
    {
        db.Roles.Add(new Role
        {
            Id = Guid.NewGuid(),
            Name = "User",
            Description = "Standard user"
        });
        await db.SaveChangesAsync();
    }

    // Seed default system settings
    var defaultSettings = new Dictionary<string, string>
    {
        ["org.name"] = "My Organisation",
        ["org.currency"] = "GBP",
        ["org.dateFormat"] = "DD/MM/YYYY",
        ["org.defaultPageSize"] = "25",
        ["alerts.warranty.enabled"] = "true",
        ["alerts.certificate.enabled"] = "true",
        ["alerts.licence.enabled"] = "true",
        ["alerts.thresholds"] = "90,30,14,7",
        ["alerts.smtp.host"] = "",
        ["alerts.smtp.port"] = "587",
        ["alerts.smtp.username"] = "",
        ["alerts.smtp.password"] = "",
        ["alerts.smtp.fromAddress"] = "",
        ["alerts.slack.webhookUrl"] = "",
        ["alerts.recipients"] = "",
    };

    foreach (var (key, value) in defaultSettings)
    {
        if (!await db.SystemSettings.AnyAsync(s => s.Key == key))
        {
            db.SystemSettings.Add(new SystemSetting
            {
                Key = key,
                Value = value,
                UpdatedBy = "System"
            });
        }
    }
    await db.SaveChangesAsync();
}

app.Run();
