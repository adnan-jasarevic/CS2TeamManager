using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RosterSensei.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomEventTypesAndOffDays : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // The old column held the fixed type (0 Pracc, 1 Official Match, 2 VOD Review, 3 Other). It keeps
            // those numbers until the UPDATE below swaps them for the IDs of the team's own types.
            migrationBuilder.RenameColumn(
                name: "EventType",
                table: "TeamEvents",
                newName: "EventTypeId");

            migrationBuilder.CreateTable(
                name: "TeamEventTypes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TeamId = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Color = table.Column<string>(type: "nvarchar(7)", maxLength: 7, nullable: false),
                    Preset = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TeamEventTypes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TeamEventTypes_Teams_TeamId",
                        column: x => x.TeamId,
                        principalTable: "Teams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TeamOffDays",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TeamId = table.Column<int>(type: "int", nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    StartTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TeamOffDays", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TeamOffDays_Teams_TeamId",
                        column: x => x.TeamId,
                        principalTable: "Teams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            // Every existing team gets the default types, in the same order a new team gets them.
            migrationBuilder.Sql(@"
INSERT INTO TeamEventTypes (TeamId, Name, Color, Preset, CreatedAt)
SELECT t.Id, d.Name, d.Color, d.Preset, GETUTCDATE()
FROM Teams t
CROSS JOIN (VALUES
    (1, N'Pracc', N'#3B82F6', 0),
    (2, N'Official Match', N'#E0243F', 1),
    (3, N'VOD Review', N'#D9A441', 2),
    (4, N'Theory', N'#8B5CF6', 6),
    (5, N'Other', N'#6E6468', 3)
) AS d(SortOrder, Name, Color, Preset)
ORDER BY t.Id, d.SortOrder;");

            // Point each event at its team's type for the old value, falling back to the team's Other.
            // EXEC compiles the UPDATE on its own, so it also works in a generated SQL script where the
            // renamed column doesn't exist yet when the batch is compiled.
            migrationBuilder.Sql(@"
EXEC(N'UPDATE e SET EventTypeId = COALESCE(
    (SELECT et.Id FROM TeamEventTypes et WHERE et.TeamId = e.TeamId AND et.Preset = e.EventTypeId),
    (SELECT et.Id FROM TeamEventTypes et WHERE et.TeamId = e.TeamId AND et.Preset = 3))
FROM TeamEvents e;');");

            migrationBuilder.CreateIndex(
                name: "IX_TeamEvents_EventTypeId",
                table: "TeamEvents",
                column: "EventTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_TeamEventTypes_OnePresetPerTeam",
                table: "TeamEventTypes",
                columns: new[] { "TeamId", "Preset" },
                unique: true,
                filter: "[Preset] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_TeamEventTypes_TeamId_Name",
                table: "TeamEventTypes",
                columns: new[] { "TeamId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TeamOffDays_TeamId_Date",
                table: "TeamOffDays",
                columns: new[] { "TeamId", "Date" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_TeamEvents_TeamEventTypes_EventTypeId",
                table: "TeamEvents",
                column: "EventTypeId",
                principalTable: "TeamEventTypes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TeamEvents_TeamEventTypes_EventTypeId",
                table: "TeamEvents");

            // Back to the fixed types: premade types 0 to 3 keep their number, everything else becomes Other (3).
            migrationBuilder.Sql(@"
UPDATE e SET EventTypeId = CASE WHEN et.Preset IN (0, 1, 2, 3) THEN et.Preset ELSE 3 END
FROM TeamEvents e
LEFT JOIN TeamEventTypes et ON et.Id = e.EventTypeId;");

            migrationBuilder.DropTable(
                name: "TeamEventTypes");

            migrationBuilder.DropTable(
                name: "TeamOffDays");

            migrationBuilder.DropIndex(
                name: "IX_TeamEvents_EventTypeId",
                table: "TeamEvents");

            migrationBuilder.RenameColumn(
                name: "EventTypeId",
                table: "TeamEvents",
                newName: "EventType");
        }
    }
}
