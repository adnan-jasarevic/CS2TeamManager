using CS2TeamManager.Domain.Entities; 
using CS2TeamManager.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;

namespace CS2TeamManager.Infrastructure.Persistence
{
    public class AppDbContext : IdentityDbContext<AppUser>
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<Team> Teams { get; set; }
        public DbSet<User> DomainUsers { get; set; } 
        public DbSet<Domain.Entities.Match> Matches { get; set; }
        public DbSet<MatchParticipation> MatchParticipations { get; set; }
        public DbSet<MatchStat> MatchStats { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.Entity<Domain.Entities.Match>()
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
}
