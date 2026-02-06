using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AssetManagement.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class ChangeAssetAssignmentToPersonFromUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Assets_Users_AssignedUserId",
                table: "Assets");

            migrationBuilder.RenameColumn(
                name: "AssignedUserId",
                table: "Assets",
                newName: "AssignedPersonId");

            migrationBuilder.RenameIndex(
                name: "IX_Assets_AssignedUserId",
                table: "Assets",
                newName: "IX_Assets_AssignedPersonId");

            migrationBuilder.AddForeignKey(
                name: "FK_Assets_People_AssignedPersonId",
                table: "Assets",
                column: "AssignedPersonId",
                principalTable: "People",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Assets_People_AssignedPersonId",
                table: "Assets");

            migrationBuilder.RenameColumn(
                name: "AssignedPersonId",
                table: "Assets",
                newName: "AssignedUserId");

            migrationBuilder.RenameIndex(
                name: "IX_Assets_AssignedPersonId",
                table: "Assets",
                newName: "IX_Assets_AssignedUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Assets_Users_AssignedUserId",
                table: "Assets",
                column: "AssignedUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
