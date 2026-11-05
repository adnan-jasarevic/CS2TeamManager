using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RosterSensei.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class OwnerSeparateFromRole : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TeamMembers_OneOwnerPerTeam",
                table: "TeamMembers");

            migrationBuilder.AddColumn<string>(
                name: "OwnerId",
                table: "Teams",
                type: "nvarchar(450)",
                maxLength: 450,
                nullable: true);

            // The member with the old Owner role (0) owns the team. A team without one falls back to its
            // Captain, then an Officer, then its longest-standing member.
            migrationBuilder.Sql(@"
UPDATE t SET OwnerId = (
    SELECT TOP 1 tm.UserId FROM TeamMembers tm
    WHERE tm.TeamId = t.Id
    ORDER BY CASE tm.Role WHEN 0 THEN 0 WHEN 1 THEN 1 WHEN 3 THEN 2 ELSE 3 END, tm.JoinedAt)
FROM Teams t;");

            // A team with no members can't be opened by anyone, and has no one to own it.
            migrationBuilder.Sql("DELETE FROM Teams WHERE OwnerId IS NULL;");

            // Owner is no longer a role: the old Owner becomes the Captain, or an Officer if the team has a Captain already.
            migrationBuilder.Sql(@"
UPDATE tm SET Role = CASE
    WHEN EXISTS (SELECT 1 FROM TeamMembers c WHERE c.TeamId = tm.TeamId AND c.Role = 1) THEN 3
    ELSE 1 END
FROM TeamMembers tm
WHERE tm.Role = 0;");

            migrationBuilder.AlterColumn<string>(
                name: "OwnerId",
                table: "Teams",
                type: "nvarchar(450)",
                maxLength: 450,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)",
                oldMaxLength: 450,
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Teams_OwnerId",
                table: "Teams",
                column: "OwnerId");

            migrationBuilder.AddForeignKey(
                name: "FK_Teams_AspNetUsers_OwnerId",
                table: "Teams",
                column: "OwnerId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Teams_AspNetUsers_OwnerId",
                table: "Teams");

            migrationBuilder.DropIndex(
                name: "IX_Teams_OwnerId",
                table: "Teams");

            // Back to the Owner role. The Owner loses their Captain or Officer role, as before this migration.
            migrationBuilder.Sql(@"
UPDATE tm SET Role = 0
FROM TeamMembers tm
JOIN Teams t ON t.Id = tm.TeamId AND t.OwnerId = tm.UserId;");

            migrationBuilder.DropColumn(
                name: "OwnerId",
                table: "Teams");

            migrationBuilder.CreateIndex(
                name: "IX_TeamMembers_OneOwnerPerTeam",
                table: "TeamMembers",
                column: "TeamId",
                unique: true,
                filter: "[Role] = 0");
        }
    }
}
