using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RosterSensei.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMatchLineups : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_MatchParticipation_MatchId",
                table: "MatchParticipation");

            migrationBuilder.AlterColumn<string>(
                name: "Role",
                table: "MatchParticipation",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.CreateIndex(
                name: "IX_MatchParticipation_MatchId_UserId",
                table: "MatchParticipation",
                columns: new[] { "MatchId", "UserId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_MatchParticipation_MatchId_UserId",
                table: "MatchParticipation");

            migrationBuilder.AlterColumn<string>(
                name: "Role",
                table: "MatchParticipation",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(30)",
                oldMaxLength: 30,
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_MatchParticipation_MatchId",
                table: "MatchParticipation",
                column: "MatchId");
        }
    }
}
