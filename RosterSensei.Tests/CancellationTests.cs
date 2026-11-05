using RosterSensei.Tests.Infrastructure;

namespace RosterSensei.Tests;

// Read endpoints pass the request's cancellation token down to EF, so a request the browser
// gave up on stops its query and hands its pooled connection back instead of running on.
public class CancellationTests : IDisposable
{
    private readonly TestDatabase _db = new();
    private readonly string _owner;
    private readonly int _teamId;

    public CancellationTests()
    {
        _owner = _db.AddUser("owner");
        _teamId = _db.AddTeam(_owner);
    }

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task Cancelled_reads_stop_instead_of_querying()
    {
        using var cancelled = new CancellationTokenSource();
        cancelled.Cancel();
        var token = cancelled.Token;

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => _db.TeamService().GetUserTeamsAsync(_owner, token));
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => _db.TeamService().GetTeamMembersAsync(_teamId, _owner, token));
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => _db.TeamService().GetTeamDashboardAsync(_teamId, _owner, token));
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => _db.MatchService().GetTeamMatchesAsync(_owner, _teamId, token));
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => _db.MatchService().GetTeamStatsAsync(_owner, _teamId, null, token));
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => _db.EventService().GetEventsAsync(_owner, _teamId, DateTime.UtcNow, DateTime.UtcNow.AddDays(7), token));
    }
}
