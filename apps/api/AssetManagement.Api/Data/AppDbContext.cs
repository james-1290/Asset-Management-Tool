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
    public DbSet<CertificateType> CertificateTypes => Set<CertificateType>();
    public DbSet<Certificate> Certificates => Set<Certificate>();
    public DbSet<CertificateHistory> CertificateHistory => Set<CertificateHistory>();
    public DbSet<CertificateHistoryChange> CertificateHistoryChanges => Set<CertificateHistoryChange>();
    public DbSet<ApplicationType> ApplicationTypes => Set<ApplicationType>();
    public DbSet<Application> Applications => Set<Application>();
    public DbSet<ApplicationHistory> ApplicationHistory => Set<ApplicationHistory>();
    public DbSet<ApplicationHistoryChange> ApplicationHistoryChanges => Set<ApplicationHistoryChange>();
    public DbSet<SavedView> SavedViews => Set<SavedView>();

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

        modelBuilder.Entity<Asset>()
            .HasMany(a => a.CustomFieldValues)
            .WithOne()
            .HasForeignKey(v => v.EntityId);

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

        // CertificateType
        modelBuilder.Entity<CertificateType>()
            .HasMany(ct => ct.CustomFieldDefinitions)
            .WithOne(d => d.CertificateType)
            .HasForeignKey(d => d.CertificateTypeId)
            .OnDelete(DeleteBehavior.Cascade);

        // Certificate
        modelBuilder.Entity<Certificate>()
            .HasOne(c => c.CertificateType)
            .WithMany(ct => ct.Certificates)
            .HasForeignKey(c => c.CertificateTypeId);

        modelBuilder.Entity<Certificate>()
            .HasOne(c => c.Asset)
            .WithMany()
            .HasForeignKey(c => c.AssetId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Certificate>()
            .HasOne(c => c.Person)
            .WithMany()
            .HasForeignKey(c => c.PersonId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Certificate>()
            .HasOne(c => c.Location)
            .WithMany()
            .HasForeignKey(c => c.LocationId)
            .OnDelete(DeleteBehavior.SetNull);

        // Certificate.CustomFieldValues: polymorphic via EntityId (shared with Asset).
        // No FK constraint — we ignore the navigation so EF doesn't create a second FK on EntityId.
        modelBuilder.Entity<Certificate>()
            .Ignore(c => c.CustomFieldValues);

        modelBuilder.Entity<Certificate>()
            .Property(c => c.Status)
            .HasConversion<string>();

        // CertificateHistory
        modelBuilder.Entity<CertificateHistory>()
            .HasOne(h => h.Certificate)
            .WithMany(c => c.History)
            .HasForeignKey(h => h.CertificateId);

        modelBuilder.Entity<CertificateHistory>()
            .HasIndex(h => h.CertificateId);

        modelBuilder.Entity<CertificateHistory>()
            .Property(h => h.EventType)
            .HasConversion<string>();

        // CertificateHistoryChange
        modelBuilder.Entity<CertificateHistoryChange>()
            .HasOne(c => c.CertificateHistory)
            .WithMany(h => h.Changes)
            .HasForeignKey(c => c.CertificateHistoryId)
            .OnDelete(DeleteBehavior.Cascade);

        // ApplicationType
        modelBuilder.Entity<ApplicationType>()
            .HasMany(at => at.CustomFieldDefinitions)
            .WithOne(d => d.ApplicationType)
            .HasForeignKey(d => d.ApplicationTypeId)
            .OnDelete(DeleteBehavior.Cascade);

        // Application
        modelBuilder.Entity<Application>()
            .HasOne(a => a.ApplicationType)
            .WithMany(at => at.Applications)
            .HasForeignKey(a => a.ApplicationTypeId);

        modelBuilder.Entity<Application>()
            .HasOne(a => a.Asset)
            .WithMany()
            .HasForeignKey(a => a.AssetId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Application>()
            .HasOne(a => a.Person)
            .WithMany()
            .HasForeignKey(a => a.PersonId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Application>()
            .HasOne(a => a.Location)
            .WithMany()
            .HasForeignKey(a => a.LocationId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Application>()
            .Ignore(a => a.CustomFieldValues);

        modelBuilder.Entity<Application>()
            .Property(a => a.Status)
            .HasConversion<string>();

        modelBuilder.Entity<Application>()
            .Property(a => a.LicenceType)
            .HasConversion<string>();

        modelBuilder.Entity<Application>()
            .Property(a => a.PurchaseCost)
            .HasPrecision(18, 2);

        // ApplicationHistory
        modelBuilder.Entity<ApplicationHistory>()
            .HasOne(h => h.Application)
            .WithMany(a => a.History)
            .HasForeignKey(h => h.ApplicationId);

        modelBuilder.Entity<ApplicationHistory>()
            .HasIndex(h => h.ApplicationId);

        modelBuilder.Entity<ApplicationHistory>()
            .Property(h => h.EventType)
            .HasConversion<string>();

        // ApplicationHistoryChange
        modelBuilder.Entity<ApplicationHistoryChange>()
            .HasOne(c => c.ApplicationHistory)
            .WithMany(h => h.Changes)
            .HasForeignKey(c => c.ApplicationHistoryId)
            .OnDelete(DeleteBehavior.Cascade);

        // SavedView
        modelBuilder.Entity<SavedView>()
            .HasOne(sv => sv.User)
            .WithMany()
            .HasForeignKey(sv => sv.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<SavedView>()
            .HasIndex(sv => new { sv.UserId, sv.EntityType });
    }
}
