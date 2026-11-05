using CS2TeamManager.Domain.Entities;
using CS2TeamManager.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace CS2TeamManager.Infrastructure.Persistence;

public class AppDbContext : IdentityDbContext<AppUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Team> Teams { get; set; }
    public DbSet<Match> Matches { get; set; }
    public DbSet<MatchMap> MatchMaps { get; set; }
    public DbSet<TeamMember> TeamMembers { get; set; }
    public DbSet<TeamInvite> TeamInvites { get; set; }
    public DbSet<TeamEvent> TeamEvents { get; set; }


    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        // All DateTime values are stored in UTC. Reading them back as DateTimeKind.Utc makes the API
        // serialize them with a trailing "Z", so the browser converts them to the user's local time.
        configurationBuilder.Properties<DateTime>().HaveConversion<UtcDateTimeConverter>();
        configurationBuilder.Properties<DateTime?>().HaveConversion<UtcDateTimeConverter>();
    }

    private class UtcDateTimeConverter : ValueConverter<DateTime, DateTime>
    {
        public UtcDateTimeConverter()
            : base(
                v => v.Kind == DateTimeKind.Local ? v.ToUniversalTime() : DateTime.SpecifyKind(v, DateTimeKind.Utc),
                v => DateTime.SpecifyKind(v, DateTimeKind.Utc))
        {
        }
    }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<TeamMember>()
            .HasKey(tm => new { tm.UserId, tm.TeamId });

        // Plain index for the Team foreign key, kept alongside the filtered one below.
        builder.Entity<TeamMember>()
            .HasIndex(tm => tm.TeamId);

        // At most one Captain per team, enforced by the database as well as the service.
        builder.Entity<TeamMember>()
            .HasIndex(tm => tm.TeamId, "IX_TeamMembers_OneCaptainPerTeam")
            .IsUnique()
            .HasFilter("[Role] = 1");

        // Exactly one Owner per team: a transfer can never leave two.
        builder.Entity<TeamMember>()
            .HasIndex(tm => tm.TeamId, "IX_TeamMembers_OneOwnerPerTeam")
            .IsUnique()
            .HasFilter("[Role] = 0");

        // At most one pending invite per user per team, even when two invites are sent at the same time.
        builder.Entity<TeamInvite>(invite =>
        {
            invite.Property(i => i.TargetUserId)
                .HasMaxLength(450);

            // Plain index for the Team foreign key, kept alongside the filtered one below.
            invite.HasIndex(i => i.TeamId);

            invite.HasIndex(i => new { i.TeamId, i.TargetUserId }, "IX_TeamInvites_OnePendingPerUser")
                .IsUnique()
                .HasFilter("[Status] = 0 AND [TargetUserId] IS NOT NULL");
        });

        builder.Entity<TeamMember>()
            .HasOne<AppUser>()
            .WithMany(u => u.TeamMemberships)
            .HasForeignKey(tm => tm.UserId);

        builder.Entity<TeamMember>()
            .HasOne(tm => tm.Team)
            .WithMany(t => t.Members)
            .HasForeignKey(tm => tm.TeamId);

        // Participations and stats point at the Identity user, the only user model.
        builder.Entity<MatchParticipation>()
            .HasOne<AppUser>()
            .WithMany(u => u.MatchParticipations)
            .HasForeignKey(p => p.UserId);

        builder.Entity<MatchStat>()
            .HasOne<AppUser>()
            .WithMany(u => u.MatchStats)
            .HasForeignKey(s => s.UserId);

        builder.Entity<Match>()
            .HasOne(m => m.Team)
            .WithMany(t => t.Matches)
            .HasForeignKey(m => m.TeamId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.Entity<TeamEvent>(e =>
        {
            e.HasOne(te => te.Team)
                .WithMany()
                .HasForeignKey(te => te.TeamId)
                .OnDelete(DeleteBehavior.Cascade);

            e.Property(te => te.Title)
                .IsRequired()
                .HasMaxLength(100);

            e.Property(te => te.Description)
                .HasMaxLength(1000);

            e.Property(te => te.CreatedByUserId)
                .IsRequired()
                .HasMaxLength(450);

            e.HasIndex(te => new { te.TeamId, te.StartTime });
        });

        builder.Entity<MatchMap>(map =>
        {
            map.HasOne(mm => mm.Match)
                .WithMany(m => m.Maps)
                .HasForeignKey(mm => mm.MatchId)
                .OnDelete(DeleteBehavior.Cascade);

            map.Property(mm => mm.MapName)
                .IsRequired()
                .HasMaxLength(50);

            map.HasIndex(mm => new { mm.MatchId, mm.Order })
                .IsUnique();
        });

        builder.Entity<Team>()
            .Property(t => t.Name)
            .IsRequired()
            .HasMaxLength(100);
    }
}
