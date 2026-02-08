using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AssetManagement.Api.Data.Migrations
{
    /// <inheritdoc />
    /// <summary>
    /// No-op: RetiredDate column already exists from a previous migration.
    /// This migration only updates the model snapshot.
    /// </summary>
    public partial class RestoreRetiredDateToSnapshot : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Column already exists in the database — snapshot sync only
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // No-op
        }
    }
}
