using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AssetManagement.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class ConfigureCustomFieldValueEntityFK : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CustomFieldValues_Assets_AssetId",
                table: "CustomFieldValues");

            migrationBuilder.DropIndex(
                name: "IX_CustomFieldValues_AssetId",
                table: "CustomFieldValues");

            migrationBuilder.DropColumn(
                name: "AssetId",
                table: "CustomFieldValues");

            migrationBuilder.CreateIndex(
                name: "IX_CustomFieldValues_EntityId",
                table: "CustomFieldValues",
                column: "EntityId");

            migrationBuilder.AddForeignKey(
                name: "FK_CustomFieldValues_Assets_EntityId",
                table: "CustomFieldValues",
                column: "EntityId",
                principalTable: "Assets",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CustomFieldValues_Assets_EntityId",
                table: "CustomFieldValues");

            migrationBuilder.DropIndex(
                name: "IX_CustomFieldValues_EntityId",
                table: "CustomFieldValues");

            migrationBuilder.AddColumn<Guid>(
                name: "AssetId",
                table: "CustomFieldValues",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_CustomFieldValues_AssetId",
                table: "CustomFieldValues",
                column: "AssetId");

            migrationBuilder.AddForeignKey(
                name: "FK_CustomFieldValues_Assets_AssetId",
                table: "CustomFieldValues",
                column: "AssetId",
                principalTable: "Assets",
                principalColumn: "Id");
        }
    }
}
