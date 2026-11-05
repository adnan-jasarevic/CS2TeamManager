using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RosterSensei.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddOfficerRoleOneCaptain : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Teams with more than one Captain keep the longest-serving one; the rest become Officers (Role 3).
            migrationBuilder.Sql(@"
                WITH Ranked AS (
                    SELECT Role, ROW_NUMBER() OVER (PARTITION BY TeamId ORDER BY JoinedAt, UserId) AS CaptainNumber
                    FROM TeamMembers
                    WHERE Role = 1
                )
                UPDATE Ranked SET Role = 3 WHERE CaptainNumber > 1;");

            migrationBuilder.CreateIndex(
                name: "IX_TeamMembers_OneCaptainPerTeam",
                table: "TeamMembers",
                column: "TeamId",
                unique: true,
                filter: "[Role] = 1");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TeamMembers_OneCaptainPerTeam",
                table: "TeamMembers");
        }
    }
}
