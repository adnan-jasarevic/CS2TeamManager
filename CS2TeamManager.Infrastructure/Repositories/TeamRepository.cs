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
        return await _context.Teams.CountAsync(t => t.OwnerId == userId);
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
            .Include(tm => tm.Team)
            .FirstOrDefaultAsync(tm => tm.TeamId == teamId && tm.UserId == userId);
    }

    public async Task<bool> UpdateTeamMemberAsync(TeamMember member)
    {
        // Marks only the member as changed, not the Team loaded with it.
        _context.Entry(member).State = EntityState.Modified;
        try
        {
            await _context.SaveChangesAsync();
            return true;
        }
        catch (DbUpdateException)
        {
            // A unique index (one Captain per team) rejected the change.
            await _context.Entry(member).ReloadAsync();
            return false;
        }
    }

    public async Task<bool> TransferOwnershipAsync(int teamId, string currentOwnerId, string newOwnerId)
    {
        // One conditional update: it only applies while the requester still owns the team and the
        // new Owner is still an Officer in it, so a concurrent change makes the transfer fail cleanly.
        var updated = await _context.Teams
            .Where(t => t.Id == teamId
                && t.OwnerId == currentOwnerId
                && t.Members.Any(m => m.UserId == newOwnerId && m.Role == TeamRole.Officer))
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.OwnerId, newOwnerId));

        return updated == 1;
    }

    public async Task<bool> RemoveNonOwnerMemberAsync(int teamId, string userId)
    {
        // Conditional delete, so a member who just received ownership can't leave the team without an Owner.
        var deleted = await _context.TeamMembers
            .Where(tm => tm.TeamId == teamId && tm.UserId == userId && tm.Team.OwnerId != userId)
            .ExecuteDeleteAsync();

        return deleted == 1;
    }

    public async Task<bool> DeleteTeamAsync(int teamId, string ownerId)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync();

        // Only goes ahead while ownerId still owns the team.
        if (!await _context.Teams.AnyAsync(t => t.Id == teamId && t.OwnerId == ownerId))
        {
            await transaction.RollbackAsync();
            return false;
        }

        // Matches only set TeamId to null when their team goes, so delete them explicitly.
        // Their maps, participations and stats cascade with them.
        await _context.Matches.Where(m => m.TeamId == teamId).ExecuteDeleteAsync();

        // Events, members and invites cascade from the team.
        var deleted = await _context.Teams
            .Where(t => t.Id == teamId && t.OwnerId == ownerId)
            .ExecuteDeleteAsync();

        if (deleted != 1)
        {
            await transaction.RollbackAsync();
            return false;
        }

        await transaction.CommitAsync();
        return true;
    }

    public async Task<TeamInvite?> GetPendingInviteAsync(int teamId, string email)
    {
        return await _context.TeamInvites
            .FirstOrDefaultAsync(i => i.TeamId == teamId && i.TargetUserEmail == email && i.Status == InviteStatus.Pending);
    }

    public async Task<bool> CreateInviteAsync(TeamInvite invite)
    {
        _context.TeamInvites.Add(invite);
        try
        {
            await _context.SaveChangesAsync();
            return true;
        }
        catch (DbUpdateException)
        {
            // The one-pending-invite index rejected a duplicate sent at the same time.
            _context.Entry(invite).State = EntityState.Detached;
            return false;
        }
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

    // Moves a Pending invite to newStatus and, if given, adds the new member, all in one transaction.
    // The status change only applies while the invite is still Pending, so when two requests race,
    // exactly one wins and the other gets false.
    public async Task<bool> CompletePendingInviteAsync(int inviteId, InviteStatus newStatus, TeamMember? newMember = null)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync();

        var updated = await _context.TeamInvites
            .Where(i => i.Id == inviteId && i.Status == InviteStatus.Pending)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(i => i.Status, newStatus)
                .SetProperty(i => i.RespondedAt, DateTime.UtcNow));

        if (updated == 0)
        {
            await transaction.RollbackAsync();
            return false;
        }

        if (newMember != null)
        {
            _context.TeamMembers.Add(newMember);
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                // The (UserId, TeamId) key already exists, so the user joined some other way.
                _context.Entry(newMember).State = EntityState.Detached;
                await transaction.RollbackAsync();
                return false;
            }
        }

        await transaction.CommitAsync();
        return true;
    }
}
