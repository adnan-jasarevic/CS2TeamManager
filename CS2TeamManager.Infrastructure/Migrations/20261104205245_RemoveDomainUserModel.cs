using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CS2TeamManager.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RemoveDomainUserModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_MatchParticipation_User_UserId",
                table: "MatchParticipation");

            migrationBuilder.DropForeignKey(
                name: "FK_MatchStat_User_UserId",
                table: "MatchStat");

            migrationBuilder.DropTable(
                name: "User");

            migrationBuilder.AddForeignKey(
                name: "FK_MatchParticipation_AspNetUsers_UserId",
                table: "MatchParticipation",
                column: "UserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_MatchStat_AspNetUsers_UserId",
                table: "MatchStat",
                column: "UserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_MatchParticipation_AspNetUsers_UserId",
                table: "MatchParticipation");

            migrationBuilder.DropForeignKey(
                name: "FK_MatchStat_AspNetUsers_UserId",
                table: "MatchStat");

            migrationBuilder.CreateTable(
                name: "User",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CurrentTeamId = table.Column<int>(type: "int", nullable: true),
                    Email = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SteamId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Username = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_User", x => x.Id);
                    table.ForeignKey(
                        name: "FK_User_Teams_CurrentTeamId",
                        column: x => x.CurrentTeamId,
                        principalTable: "Teams",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_User_CurrentTeamId",
                table: "User",
                column: "CurrentTeamId");

            migrationBuilder.AddForeignKey(
                name: "FK_MatchParticipation_User_UserId",
                table: "MatchParticipation",
                column: "UserId",
                principalTable: "User",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_MatchStat_User_UserId",
                table: "MatchStat",
                column: "UserId",
                principalTable: "User",
                principalColumn: "Id");
        }
    }
}
