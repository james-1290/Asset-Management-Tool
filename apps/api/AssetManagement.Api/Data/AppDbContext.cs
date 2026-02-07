using AssetManagement.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AssetManagement.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<Location> Locations => Set<Location>();
    public DbSet<AssetType> AssetTypes => Set<AssetType>();
    public DbSet<Asset> Assets => Set<Asset>();
    public DbSet<AssetHistory> AssetHistory => Set<AssetHistory>();
    public DbSet<AssetHistoryChange> AssetHistoryChanges => Set<AssetHistoryChange>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<CustomFieldDefinition> CustomFieldDefinitions => Set<CustomFieldDefinition>();
    public DbSet<CustomFieldValue> CustomFieldValues => Set<CustomFieldValue>();
    public DbSet<Person> People => Set<Person>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // UserRole composite key
        modelBuilder.Entity<UserRole>()
            .HasKey(ur => new { ur.UserId, ur.RoleId });

        modelBuilder.Entity<UserRole>()
            .HasOne(ur => ur.User)
            .WithMany(u => u.UserRoles)
            .HasForeignKey(ur => ur.UserId);

        modelBuilder.Entity<UserRole>()
            .HasOne(ur => ur.Role)
            .WithMany(r => r.UserRoles)
            .HasForeignKey(ur => ur.RoleId);

        // RolePermission composite key
        modelBuilder.Entity<RolePermission>()
            .HasKey(rp => new { rp.RoleId, rp.PermissionId });

        modelBuilder.Entity<RolePermission>()
            .HasOne(rp => rp.Role)
            .WithMany(r => r.RolePermissions)
            .HasForeignKey(rp => rp.RoleId);

        modelBuilder.Entity<RolePermission>()
            .HasOne(rp => rp.Permission)
            .WithMany(p => p.RolePermissions)
            .HasForeignKey(rp => rp.PermissionId);

        // User
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Username)
            .IsUnique();

        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        // Asset
        modelBuilder.Entity<Asset>()
            .HasIndex(a => a.AssetTag)
            .IsUnique();

        modelBuilder.Entity<Asset>()
            .HasOne(a => a.AssetType)
            .WithMany(at => at.Assets)
            .HasForeignKey(a => a.AssetTypeId);

        modelBuilder.Entity<Asset>()
            .HasOne(a => a.Location)
            .WithMany(l => l.Assets)
            .HasForeignKey(a => a.LocationId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Asset>()
            .HasOne(a => a.AssignedPerson)
            .WithMany(p => p.AssignedAssets)
            .HasForeignKey(a => a.AssignedPersonId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Asset>()
            .Property(a => a.PurchaseCost)
            .HasPrecision(18, 2);

        modelBuilder.Entity<Asset>()
            .Property(a => a.SoldPrice)
            .HasPrecision(18, 2);

        // AssetHistory
        modelBuilder.Entity<AssetHistory>()
            .HasOne(h => h.Asset)
            .WithMany(a => a.History)
            .HasForeignKey(h => h.AssetId);

        modelBuilder.Entity<AssetHistory>()
            .HasIndex(h => h.AssetId);

        // AssetHistoryChange
        modelBuilder.Entity<AssetHistoryChange>()
            .HasOne(c => c.AssetHistory)
            .WithMany(h => h.Changes)
            .HasForeignKey(c => c.AssetHistoryId)
            .OnDelete(DeleteBehavior.Cascade);

        // AuditLog
        modelBuilder.Entity<AuditLog>()
            .HasIndex(a => a.Timestamp);

        modelBuilder.Entity<AuditLog>()
            .HasIndex(a => new { a.EntityType, a.EntityId });

        // CustomFieldDefinition
        modelBuilder.Entity<CustomFieldDefinition>()
            .HasOne(d => d.AssetType)
            .WithMany(at => at.CustomFieldDefinitions)
            .HasForeignKey(d => d.AssetTypeId)
            .OnDelete(DeleteBehavior.Cascade);

        // CustomFieldValue
        modelBuilder.Entity<CustomFieldValue>()
            .HasOne(v => v.CustomFieldDefinition)
            .WithMany(d => d.Values)
            .HasForeignKey(v => v.CustomFieldDefinitionId);

        modelBuilder.Entity<CustomFieldValue>()
            .HasIndex(v => new { v.CustomFieldDefinitionId, v.EntityId });

        // Store enums as strings in PostgreSQL
        modelBuilder.Entity<Asset>()
            .Property(a => a.Status)
            .HasConversion<string>();

        modelBuilder.Entity<AssetHistory>()
            .Property(h => h.EventType)
            .HasConversion<string>();

        modelBuilder.Entity<AuditLog>()
            .Property(a => a.Source)
            .HasConversion<string>();

        modelBuilder.Entity<CustomFieldDefinition>()
            .Property(d => d.EntityType)
            .HasConversion<string>();

        modelBuilder.Entity<CustomFieldDefinition>()
            .Property(d => d.FieldType)
            .HasConversion<string>();

        // Person
        modelBuilder.Entity<Person>()
            .HasOne(p => p.Location)
            .WithMany()
            .HasForeignKey(p => p.LocationId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
