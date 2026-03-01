using CS2TeamManager.Application.Interfaces;
using CS2TeamManager.Domain.Entities;
using CS2TeamManager.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CS2TeamManager.Infrastructure.Repositories;

public class TeamRepository : ITeamRepository
{
    private readonly AppDbContext _context;

    public TeamRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Team?> GetByIdAsync(int id)
    {
        return await _context.Teams
            .Include(t => t.Members)
            .FirstOrDefaultAsync(t => t.Id == id);
    }

    public async Task<List<Team>> GetTeamsByUserIdAsync(string userId)
    {
        return await _context.Teams
            .Include(t => t.Members)
            .Where(t => t.Members.Any(m => m.UserId == userId))
            .ToListAsync();
    }

    public async Task<int> GetOwnedTeamsCountAsync(string userId)
    {
        return await _context.TeamMembers
            .CountAsync(tm => tm.UserId == userId && tm.Role == Domain.Enums.TeamRole.Owner);
    }

    public async Task<Team> AddAsync(Team team)
    {
        _context.Teams.Add(team);
        await _context.SaveChangesAsync();
        return team;
    }

    public async Task UpdateAsync(Team team)
    {
        _context.Teams.Update(team);
        await _context.SaveChangesAsync();
    }

}
