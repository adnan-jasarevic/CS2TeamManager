using RosterSensei.Application.Interfaces;
using RosterSensei.Domain.Entities;
using RosterSensei.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace RosterSensei.Infrastructure.Repositories;

public class TeamOffDayRepository : ITeamOffDayRepository
{
    private readonly AppDbContext _context;

    public TeamOffDayRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<TeamOffDay>> GetAsync(int teamId, DateTime from, DateTime to, CancellationToken cancellationToken = default)
    {
        return await _context.TeamOffDays
            .AsNoTracking()
            .Where(d => d.TeamId == teamId && d.StartTime < to && d.EndTime > from)
            .OrderBy(d => d.Date)
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> AddAsync(TeamOffDay offDay)
    {
        // Cheap check for the usual case; the unique index below still catches two requests at once.
        if (await _context.TeamOffDays.AnyAsync(d => d.TeamId == offDay.TeamId && d.Date == offDay.Date))
            return false;

        _context.TeamOffDays.Add(offDay);
        try
        {
            await _context.SaveChangesAsync();
            return true;
        }
        catch (DbUpdateException)
        {
            // The unique (TeamId, Date) index: the day is already off.
            _context.ChangeTracker.Clear();
            return false;
        }
    }

    public async Task<bool> DeleteAsync(int teamId, DateOnly date)
    {
        var deleted = await _context.TeamOffDays
            .Where(d => d.TeamId == teamId && d.Date == date)
            .ExecuteDeleteAsync();

        return deleted == 1;
    }
}
