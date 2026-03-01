using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CS2TeamManager.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UpdateTeamMembers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DomainUsers_Teams_CurrentTeamId",
                table: "DomainUsers");

            migrationBuilder.DropForeignKey(
                name: "FK_MatchParticipations_DomainUsers_UserId",
                table: "MatchParticipations");

            migrationBuilder.DropForeignKey(
                name: "FK_MatchParticipations_Matches_MatchId",
                table: "MatchParticipations");

            migrationBuilder.DropForeignKey(
                name: "FK_MatchStats_DomainUsers_UserId",
                table: "MatchStats");

            migrationBuilder.DropForeignKey(
                name: "FK_MatchStats_Matches_MatchId",
                table: "MatchStats");

            migrationBuilder.DropPrimaryKey(
                name: "PK_MatchStats",
                table: "MatchStats");

            migrationBuilder.DropPrimaryKey(
                name: "PK_MatchParticipations",
                table: "MatchParticipations");

            migrationBuilder.DropPrimaryKey(
                name: "PK_DomainUsers",
                table: "DomainUsers");

            migrationBuilder.DropColumn(
                name: "CaptainId",
                table: "Teams");

            migrationBuilder.RenameTable(
                name: "MatchStats",
                newName: "MatchStat");

            migrationBuilder.RenameTable(
                name: "MatchParticipations",
                newName: "MatchParticipation");

            migrationBuilder.RenameTable(
                name: "DomainUsers",
                newName: "User");

            migrationBuilder.RenameIndex(
                name: "IX_MatchStats_UserId",
                table: "MatchStat",
                newName: "IX_MatchStat_UserId");

            migrationBuilder.RenameIndex(
                name: "IX_MatchStats_MatchId",
                table: "MatchStat",
                newName: "IX_MatchStat_MatchId");

            migrationBuilder.RenameIndex(
                name: "IX_MatchParticipations_UserId",
                table: "MatchParticipation",
                newName: "IX_MatchParticipation_UserId");

            migrationBuilder.RenameIndex(
                name: "IX_MatchParticipations_MatchId",
                table: "MatchParticipation",
                newName: "IX_MatchParticipation_MatchId");

            migrationBuilder.RenameIndex(
                name: "IX_DomainUsers_CurrentTeamId",
                table: "User",
                newName: "IX_User_CurrentTeamId");

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "Teams",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddPrimaryKey(
                name: "PK_MatchStat",
                table: "MatchStat",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_MatchParticipation",
                table: "MatchParticipation",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_User",
                table: "User",
                column: "Id");

            migrationBuilder.CreateTable(
                name: "TeamMembers",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    TeamId = table.Column<int>(type: "int", nullable: false),
                    Role = table.Column<int>(type: "int", nullable: false),
                    JoinedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TeamMembers", x => new { x.UserId, x.TeamId });
                    table.ForeignKey(
                        name: "FK_TeamMembers_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TeamMembers_Teams_TeamId",
                        column: x => x.TeamId,
                        principalTable: "Teams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TeamMembers_TeamId",
                table: "TeamMembers",
                column: "TeamId");

            migrationBuilder.AddForeignKey(
                name: "FK_MatchParticipation_Matches_MatchId",
                table: "MatchParticipation",
                column: "MatchId",
                principalTable: "Matches",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_MatchParticipation_User_UserId",
                table: "MatchParticipation",
                column: "UserId",
                principalTable: "User",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_MatchStat_Matches_MatchId",
                table: "MatchStat",
                column: "MatchId",
                principalTable: "Matches",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_MatchStat_User_UserId",
                table: "MatchStat",
                column: "UserId",
                principalTable: "User",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_User_Teams_CurrentTeamId",
                table: "User",
                column: "CurrentTeamId",
                principalTable: "Teams",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_MatchParticipation_Matches_MatchId",
                table: "MatchParticipation");

            migrationBuilder.DropForeignKey(
                name: "FK_MatchParticipation_User_UserId",
                table: "MatchParticipation");

            migrationBuilder.DropForeignKey(
                name: "FK_MatchStat_Matches_MatchId",
                table: "MatchStat");

            migrationBuilder.DropForeignKey(
                name: "FK_MatchStat_User_UserId",
                table: "MatchStat");

            migrationBuilder.DropForeignKey(
                name: "FK_User_Teams_CurrentTeamId",
                table: "User");

            migrationBuilder.DropTable(
                name: "TeamMembers");

            migrationBuilder.DropPrimaryKey(
                name: "PK_User",
                table: "User");

            migrationBuilder.DropPrimaryKey(
                name: "PK_MatchStat",
                table: "MatchStat");

            migrationBuilder.DropPrimaryKey(
                name: "PK_MatchParticipation",
                table: "MatchParticipation");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "Teams");

            migrationBuilder.RenameTable(
                name: "User",
                newName: "DomainUsers");

            migrationBuilder.RenameTable(
                name: "MatchStat",
                newName: "MatchStats");

            migrationBuilder.RenameTable(
                name: "MatchParticipation",
                newName: "MatchParticipations");

            migrationBuilder.RenameIndex(
                name: "IX_User_CurrentTeamId",
                table: "DomainUsers",
                newName: "IX_DomainUsers_CurrentTeamId");

            migrationBuilder.RenameIndex(
                name: "IX_MatchStat_UserId",
                table: "MatchStats",
                newName: "IX_MatchStats_UserId");

            migrationBuilder.RenameIndex(
                name: "IX_MatchStat_MatchId",
                table: "MatchStats",
                newName: "IX_MatchStats_MatchId");

            migrationBuilder.RenameIndex(
                name: "IX_MatchParticipation_UserId",
                table: "MatchParticipations",
                newName: "IX_MatchParticipations_UserId");

            migrationBuilder.RenameIndex(
                name: "IX_MatchParticipation_MatchId",
                table: "MatchParticipations",
                newName: "IX_MatchParticipations_MatchId");

            migrationBuilder.AddColumn<string>(
                name: "CaptainId",
                table: "Teams",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddPrimaryKey(
                name: "PK_DomainUsers",
                table: "DomainUsers",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_MatchStats",
                table: "MatchStats",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_MatchParticipations",
                table: "MatchParticipations",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_DomainUsers_Teams_CurrentTeamId",
                table: "DomainUsers",
                column: "CurrentTeamId",
                principalTable: "Teams",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_MatchParticipations_DomainUsers_UserId",
                table: "MatchParticipations",
                column: "UserId",
                principalTable: "DomainUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_MatchParticipations_Matches_MatchId",
                table: "MatchParticipations",
                column: "MatchId",
                principalTable: "Matches",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_MatchStats_DomainUsers_UserId",
                table: "MatchStats",
                column: "UserId",
                principalTable: "DomainUsers",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_MatchStats_Matches_MatchId",
                table: "MatchStats",
                column: "MatchId",
                principalTable: "Matches",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
