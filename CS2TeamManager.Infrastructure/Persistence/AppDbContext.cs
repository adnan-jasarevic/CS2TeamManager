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
    public DbSet<TeamMember> TeamMembers { get; set; }
    public DbSet<TeamInvite> TeamInvites { get; set; }


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

        // Teams and Members Config (many-to-many)
        builder.Entity<TeamMember>()
            .HasKey(tm => new { tm.UserId, tm.TeamId }); // Composite key

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

        // Match config
        builder.Entity<Match>()
            .HasOne(m => m.Team)
            .WithMany(t => t.Matches)
            .HasForeignKey(m => m.TeamId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.Entity<Team>()
            .Property(t => t.Name)
            .IsRequired()
            .HasMaxLength(100);
    }
}
