using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CS2TeamManager.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class EnforceTeamInvariants : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "TargetUserId",
                table: "TeamInvites",
                type: "nvarchar(450)",
                maxLength: 450,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_TeamMembers_OneOwnerPerTeam",
                table: "TeamMembers",
                column: "TeamId",
                unique: true,
                filter: "[Role] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_TeamInvites_OnePendingPerUser",
                table: "TeamInvites",
                columns: new[] { "TeamId", "TargetUserId" },
                unique: true,
                filter: "[Status] = 0 AND [TargetUserId] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TeamMembers_OneOwnerPerTeam",
                table: "TeamMembers");

            migrationBuilder.DropIndex(
                name: "IX_TeamInvites_OnePendingPerUser",
                table: "TeamInvites");

            migrationBuilder.AlterColumn<string>(
                name: "TargetUserId",
                table: "TeamInvites",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)",
                oldMaxLength: 450,
                oldNullable: true);
        }
    }
}
