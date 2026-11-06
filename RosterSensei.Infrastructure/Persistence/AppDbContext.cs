using RosterSensei.Domain.Entities;
using RosterSensei.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace RosterSensei.Infrastructure.Persistence;

public class AppDbContext : IdentityDbContext<AppUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Team> Teams { get; set; }
    public DbSet<Match> Matches { get; set; }
    public DbSet<MatchMap> MatchMaps { get; set; }
    public DbSet<TeamMember> TeamMembers { get; set; }
    public DbSet<TeamInvite> TeamInvites { get; set; }
    public DbSet<TeamEvent> TeamEvents { get; set; }
    public DbSet<TeamEventType> TeamEventTypes { get; set; }
    public DbSet<TeamOffDay> TeamOffDays { get; set; }


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

        // A Steam account can be linked to one user at most, even when two users link it at the same time.
        builder.Entity<AppUser>(user =>
        {
            user.Property(u => u.SteamId)
                .HasMaxLength(17)
                .IsUnicode(false);

            user.HasIndex(u => u.SteamId)
                .IsUnique()
                .HasFilter("[SteamId] IS NOT NULL");
        });

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

            // A type can't be deleted while events still use it; the service moves them to "Other" first.
            e.HasOne(te => te.EventType)
                .WithMany()
                .HasForeignKey(te => te.EventTypeId)
                .OnDelete(DeleteBehavior.Restrict);

            // EF adds "AND Version = @original" to every UPDATE, so a concurrent edit makes the save fail.
            e.Property(te => te.Version)
                .IsConcurrencyToken();
        });

        builder.Entity<TeamEventType>(type =>
        {
            type.HasOne(t => t.Team)
                .WithMany(t => t.EventTypes)
                .HasForeignKey(t => t.TeamId)
                .OnDelete(DeleteBehavior.Cascade);

            type.Property(t => t.Name)
                .IsRequired()
                .HasMaxLength(50);

            type.Property(t => t.Color)
                .IsRequired()
                .HasMaxLength(7);

            // Each premade type at most once per team, so a team has exactly one "Other" even when two
            // requests add a premade type at the same time.
            type.HasIndex(t => new { t.TeamId, t.Preset }, "IX_TeamEventTypes_OnePresetPerTeam")
                .IsUnique()
                .HasFilter("[Preset] IS NOT NULL");

            type.HasIndex(t => new { t.TeamId, t.Name })
                .IsUnique();
        });

        builder.Entity<TeamOffDay>(day =>
        {
            day.HasOne(d => d.Team)
                .WithMany()
                .HasForeignKey(d => d.TeamId)
                .OnDelete(DeleteBehavior.Cascade);

            day.Property(d => d.CreatedByUserId)
                .IsRequired()
                .HasMaxLength(450);

            day.HasIndex(d => new { d.TeamId, d.Date })
                .IsUnique();
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

        builder.Entity<Team>(team =>
        {
            team.Property(t => t.Name)
                .IsRequired()
                .HasMaxLength(100);

            // Ownership lives on the team, so a team always has exactly one Owner.
            team.Property(t => t.OwnerId)
                .IsRequired()
                .HasMaxLength(450);

            team.HasOne<AppUser>()
                .WithMany()
                .HasForeignKey(t => t.OwnerId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
