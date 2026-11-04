using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CS2TeamManager.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMatchMaps : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MatchMaps",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MatchId = table.Column<int>(type: "int", nullable: false),
                    Order = table.Column<int>(type: "int", nullable: false),
                    MapName = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    OurScore = table.Column<int>(type: "int", nullable: true),
                    OpponentScore = table.Column<int>(type: "int", nullable: true),
                    OurFirstHalf = table.Column<int>(type: "int", nullable: true),
                    OpponentFirstHalf = table.Column<int>(type: "int", nullable: true),
                    OurSecondHalf = table.Column<int>(type: "int", nullable: true),
                    OpponentSecondHalf = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MatchMaps", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MatchMaps_Matches_MatchId",
                        column: x => x.MatchId,
                        principalTable: "Matches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MatchMaps_MatchId_Order",
                table: "MatchMaps",
                columns: new[] { "MatchId", "Order" },
                unique: true);

            // Move the old comma-separated map names into rows, keeping their play order.
            migrationBuilder.Sql(@"
                INSERT INTO MatchMaps (MatchId, [Order], MapName)
                SELECT m.Id, CAST(j.[key] AS int) + 1, LEFT(LTRIM(RTRIM(j.[value])), 50)
                FROM Matches m
                CROSS APPLY OPENJSON('[""' + REPLACE(STRING_ESCAPE(m.Maps, 'json'), ',', '"",""') + '""]') j
                WHERE m.Maps <> '' AND LTRIM(RTRIM(j.[value])) <> '';");

            migrationBuilder.DropColumn(
                name: "Maps",
                table: "Matches");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Maps",
                table: "Matches",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            // Per-map scores and halves are lost when going back; only the map names survive.
            migrationBuilder.Sql(@"
                UPDATE m SET Maps = agg.Maps
                FROM Matches m
                JOIN (
                    SELECT MatchId, STRING_AGG(MapName, ',') WITHIN GROUP (ORDER BY [Order]) AS Maps
                    FROM MatchMaps
                    GROUP BY MatchId
                ) agg ON agg.MatchId = m.Id;");

            migrationBuilder.DropTable(
                name: "MatchMaps");
        }
    }
}
