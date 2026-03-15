using CS2TeamManager.Application.Interfaces;
using CS2TeamManager.Domain.Entities;
using CS2TeamManager.Domain.Enums;
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

    public async Task<bool> IsUserInTeamAsync(int teamId, string userId)
    {
        return await _context.TeamMembers
            .AnyAsync(tm => tm.TeamId == teamId && tm.UserId == userId);
    }

    public async Task<int> GetTeamMemberCountAsync(int teamId)
    {
        return await _context.TeamMembers
            .CountAsync(tm => tm.TeamId == teamId);
    }

    public async Task<List<Match>> GetTeamMatchesAsync(int teamId)
    {
        return await _context.Matches
            .Where(m => m.TeamId == teamId)
            .OrderBy(m => m.ScheduledDate)
            .ToListAsync();
    }

    public async Task<List<(TeamMember Member, string Email, string Username)>> GetTeamMembersWithUserDetailsAsync(int teamId)
    {
        var query = from tm in _context.TeamMembers
                    join user in _context.Users on tm.UserId equals user.Id
                    where tm.TeamId == teamId
                    select new
                    {
                        Member = tm,
                        Email = user.Email,
                        Username = user.UserName
                    };

        var result = await query.ToListAsync();

        return result.Select(x => (x.Member, x.Email, x.Username)).ToList();
    }

    public async Task<TeamMember?> GetTeamMemberAsync(int teamId, string userId)
    {
        return await _context.TeamMembers
            .FirstOrDefaultAsync(tm => tm.TeamId == teamId && tm.UserId == userId);
    }

    public async Task UpdateTeamMemberAsync(TeamMember member)
    {
        _context.TeamMembers.Update(member);
        await _context.SaveChangesAsync();
    }

    public async Task<TeamInvite?> GetPendingInviteAsync(int teamId, string email)
    {
        return await _context.TeamInvites
            .FirstOrDefaultAsync(i => i.TeamId == teamId && i.TargetUserEmail == email && i.Status == InviteStatus.Pending);
    }

    public async Task CreateInviteAsync(TeamInvite invite)
    {
        await _context.TeamInvites.AddAsync(invite);
        await _context.SaveChangesAsync();
    }

    public async Task<List<TeamInvite>> GetUserPendingInvitesAsync(string userId)
    {
        return await _context.TeamInvites
            .Include(i => i.Team)
            .Where(i => i.TargetUserId == userId && i.Status == InviteStatus.Pending)
            .ToListAsync();
    }

    public async Task<TeamInvite?> GetInviteByIdAsync(int inviteId)
    {
        return await _context.TeamInvites
            .FirstOrDefaultAsync(i => i.Id == inviteId);
    }

    public async Task UpdateInviteAsync(TeamInvite invite)
    {
        _context.TeamInvites.Update(invite);
        await _context.SaveChangesAsync();
    }

    public async Task AddTeamMemberAsync(TeamMember member)
    {
        await _context.TeamMembers.AddAsync(member);
        await _context.SaveChangesAsync();
    }
}
