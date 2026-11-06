using RosterSensei.Application.Interfaces;
using RosterSensei.Domain.Entities;
using RosterSensei.Domain.Enums;
using RosterSensei.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System.Data;
using System.Data.Common;

namespace RosterSensei.Infrastructure.Repositories;

public class TeamRepository : ITeamRepository
{
    private readonly AppDbContext _context;

    public TeamRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Team?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await _context.Teams
            .Include(t => t.Members)
            .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
    }

    public async Task<List<Team>> GetTeamsByUserIdAsync(string userId, CancellationToken cancellationToken = default)
    {
        return await _context.Teams
            .Include(t => t.Members)
            .Where(t => t.Members.Any(m => m.UserId == userId))
            .ToListAsync(cancellationToken);
    }

    public async Task<WriteOutcome> AddOwnedTeamAsync(Team team, int maxOwnedTeams)
    {
        // Serializable keeps the counted range locked until commit, so a second create for the same
        // user waits or becomes the deadlock victim instead of also passing the check.
        await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            if (await _context.Teams.CountAsync(t => t.OwnerId == team.OwnerId) >= maxOwnedTeams)
                return WriteOutcome.Rejected;

            _context.Teams.Add(team);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
            return WriteOutcome.Done;
        }
        catch (Exception ex) when (ex is DbUpdateException or DbException)
        {
            _context.ChangeTracker.Clear();
            return WriteOutcome.Conflict;
        }
    }

    public async Task<bool> IsUserInTeamAsync(int teamId, string userId, CancellationToken cancellationToken = default)
    {
        return await _context.TeamMembers
            .AnyAsync(tm => tm.TeamId == teamId && tm.UserId == userId, cancellationToken);
    }

    public async Task<int> GetTeamMemberCountAsync(int teamId, CancellationToken cancellationToken = default)
    {
        return await _context.TeamMembers
            .CountAsync(tm => tm.TeamId == teamId, cancellationToken);
    }

    public async Task<List<Match>> GetTeamMatchesAsync(int teamId, CancellationToken cancellationToken = default)
    {
        return await _context.Matches
            .Where(m => m.TeamId == teamId)
            .OrderBy(m => m.ScheduledDate)
            .ToListAsync(cancellationToken);
    }

    public async Task<List<(TeamMember Member, string Email, string Username, string? SteamId)>> GetTeamMembersWithUserDetailsAsync(int teamId, CancellationToken cancellationToken = default)
    {
        var query = from tm in _context.TeamMembers
                    join user in _context.Users on tm.UserId equals user.Id
                    where tm.TeamId == teamId
                    select new
                    {
                        Member = tm,
                        Email = user.Email,
                        Username = user.UserName,
                        user.SteamId
                    };

        var result = await query.ToListAsync(cancellationToken);

        return result
            .Select(x => (x.Member, x.Email, x.Username, (string?)x.SteamId))
            .ToList();
    }

    public async Task<TeamMember?> GetTeamMemberAsync(int teamId, string userId, CancellationToken cancellationToken = default)
    {
        return await _context.TeamMembers
            .Include(tm => tm.Team)
            .FirstOrDefaultAsync(tm => tm.TeamId == teamId && tm.UserId == userId, cancellationToken);
    }

    public async Task<WriteOutcome> ChangeMemberRoleAsync(int teamId, string ownerId, string memberId, TeamRole newRole)
    {
        try
        {
            // One conditional update that writes only the Role column, and only while the requester
            // still owns the team, so an Owner who just handed the team on can't change roles any more.
            var updated = await _context.TeamMembers
                .Where(tm => tm.TeamId == teamId && tm.UserId == memberId && tm.Team.OwnerId == ownerId)
                .ExecuteUpdateAsync(s => s.SetProperty(tm => tm.Role, newRole));

            return updated == 1 ? WriteOutcome.Done : WriteOutcome.Conflict;
        }
        catch (DbException)
        {
            // The one-Captain-per-team index rejected a second Captain made at the same time.
            return WriteOutcome.Rejected;
        }
    }

    public async Task<WriteOutcome> TransferOwnershipAsync(int teamId, string currentOwnerId, string newOwnerId, int maxOwnedTeams)
    {
        // Serializable for the same reason as AddOwnedTeamAsync: two teams handed to the same Officer at once
        // can't both pass the limit.
        await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            if (await _context.Teams.CountAsync(t => t.OwnerId == newOwnerId) >= maxOwnedTeams)
                return WriteOutcome.Rejected;

            // Only applies while the requester still owns the team and the new Owner is still an Officer in it.
            var updated = await _context.Teams
                .Where(t => t.Id == teamId
                    && t.OwnerId == currentOwnerId
                    && t.Members.Any(m => m.UserId == newOwnerId && m.Role == TeamRole.Officer))
                .ExecuteUpdateAsync(s => s.SetProperty(t => t.OwnerId, newOwnerId));

            if (updated != 1)
                return WriteOutcome.Conflict;

            await transaction.CommitAsync();
            return WriteOutcome.Done;
        }
        catch (DbException)
        {
            // Deadlock victim of a concurrent transfer or create for the same user.
            return WriteOutcome.Conflict;
        }
    }

    public async Task<bool> RemoveMemberAsync(int teamId, string memberId, string requesterId)
    {
        // Conditional delete: the member must not own the team (a team always keeps its Owner), and the
        // requester must own it at this moment, unless members are removing themselves.
        var deleted = await _context.TeamMembers
            .Where(tm => tm.TeamId == teamId
                && tm.UserId == memberId
                && tm.Team.OwnerId != memberId
                && (memberId == requesterId || tm.Team.OwnerId == requesterId))
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
