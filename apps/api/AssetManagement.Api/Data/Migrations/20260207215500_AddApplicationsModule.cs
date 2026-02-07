using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AssetManagement.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddApplicationsModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ApplicationTypeId",
                table: "CustomFieldDefinitions",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ApplicationTypes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    IsArchived = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ApplicationTypes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Applications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    ApplicationTypeId = table.Column<Guid>(type: "uuid", nullable: false),
                    Publisher = table.Column<string>(type: "text", nullable: true),
                    Version = table.Column<string>(type: "text", nullable: true),
                    LicenceKey = table.Column<string>(type: "text", nullable: true),
                    LicenceType = table.Column<string>(type: "text", nullable: true),
                    MaxSeats = table.Column<int>(type: "integer", nullable: true),
                    UsedSeats = table.Column<int>(type: "integer", nullable: true),
                    PurchaseDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ExpiryDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    PurchaseCost = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    AutoRenewal = table.Column<bool>(type: "boolean", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    AssetId = table.Column<Guid>(type: "uuid", nullable: true),
                    PersonId = table.Column<Guid>(type: "uuid", nullable: true),
                    LocationId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsArchived = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Applications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Applications_ApplicationTypes_ApplicationTypeId",
                        column: x => x.ApplicationTypeId,
                        principalTable: "ApplicationTypes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Applications_Assets_AssetId",
                        column: x => x.AssetId,
                        principalTable: "Assets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Applications_Locations_LocationId",
                        column: x => x.LocationId,
                        principalTable: "Locations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Applications_People_PersonId",
                        column: x => x.PersonId,
                        principalTable: "People",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "ApplicationHistory",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ApplicationId = table.Column<Guid>(type: "uuid", nullable: false),
                    EventType = table.Column<string>(type: "text", nullable: false),
                    PerformedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    Details = table.Column<string>(type: "text", nullable: true),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ApplicationHistory", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ApplicationHistory_Applications_ApplicationId",
                        column: x => x.ApplicationId,
                        principalTable: "Applications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ApplicationHistory_Users_PerformedByUserId",
                        column: x => x.PerformedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ApplicationHistoryChanges",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ApplicationHistoryId = table.Column<Guid>(type: "uuid", nullable: false),
                    FieldName = table.Column<string>(type: "text", nullable: false),
                    OldValue = table.Column<string>(type: "text", nullable: true),
                    NewValue = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ApplicationHistoryChanges", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ApplicationHistoryChanges_ApplicationHistory_ApplicationHis~",
                        column: x => x.ApplicationHistoryId,
                        principalTable: "ApplicationHistory",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CustomFieldDefinitions_ApplicationTypeId",
                table: "CustomFieldDefinitions",
                column: "ApplicationTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_ApplicationHistory_ApplicationId",
                table: "ApplicationHistory",
                column: "ApplicationId");

            migrationBuilder.CreateIndex(
                name: "IX_ApplicationHistory_PerformedByUserId",
                table: "ApplicationHistory",
                column: "PerformedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ApplicationHistoryChanges_ApplicationHistoryId",
                table: "ApplicationHistoryChanges",
                column: "ApplicationHistoryId");

            migrationBuilder.CreateIndex(
                name: "IX_Applications_ApplicationTypeId",
                table: "Applications",
                column: "ApplicationTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_Applications_AssetId",
                table: "Applications",
                column: "AssetId");

            migrationBuilder.CreateIndex(
                name: "IX_Applications_LocationId",
                table: "Applications",
                column: "LocationId");

            migrationBuilder.CreateIndex(
                name: "IX_Applications_PersonId",
                table: "Applications",
                column: "PersonId");

            migrationBuilder.AddForeignKey(
                name: "FK_CustomFieldDefinitions_ApplicationTypes_ApplicationTypeId",
                table: "CustomFieldDefinitions",
                column: "ApplicationTypeId",
                principalTable: "ApplicationTypes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CustomFieldDefinitions_ApplicationTypes_ApplicationTypeId",
                table: "CustomFieldDefinitions");

            migrationBuilder.DropTable(
                name: "ApplicationHistoryChanges");

            migrationBuilder.DropTable(
                name: "ApplicationHistory");

            migrationBuilder.DropTable(
                name: "Applications");

            migrationBuilder.DropTable(
                name: "ApplicationTypes");

            migrationBuilder.DropIndex(
                name: "IX_CustomFieldDefinitions_ApplicationTypeId",
                table: "CustomFieldDefinitions");

            migrationBuilder.DropColumn(
                name: "ApplicationTypeId",
                table: "CustomFieldDefinitions");
        }
    }
}
