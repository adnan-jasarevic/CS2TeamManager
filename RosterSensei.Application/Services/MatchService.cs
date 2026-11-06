using RosterSensei.Application.Common;
using RosterSensei.Application.DTOs;
using RosterSensei.Application.Interfaces;
using RosterSensei.Domain.Entities;
using RosterSensei.Domain.Enums;

namespace RosterSensei.Application.Services;

public class MatchService : IMatchService
{
    private readonly IMatchRepository _matchRepository;
    private readonly ITeamRepository _teamRepository;
    private readonly IIdentityService _identityService;

    public MatchService(IMatchRepository matchRepository, ITeamRepository teamRepository, IIdentityService identityService)
    {
        _matchRepository = matchRepository;
        _teamRepository = teamRepository;
        _identityService = identityService;
    }

    public async Task<Result<MatchDto>> AddMatchAsync(string userId, int teamId, CreateMatchDto dto)
    {
        var team = await _teamRepository.GetByIdAsync(teamId);
        if (team == null)
            return Result<MatchDto>.NotFound("Team was not found.");

        var member = team.Members.FirstOrDefault(m => m.UserId == userId);
        if (member == null || !member.CanManageTeam)
            return Result<MatchDto>.Forbidden("Only the team Owner, Captain or Officers can add matches.");

        var maps = (dto.Maps ?? new List<MatchMapDto>())
            .Select((map, index) => new MatchMap
            {
                Order = index + 1,
                MapName = map.MapName.Trim(),
                OurScore = map.OurScore,
                OpponentScore = map.OpponentScore,
                OurFirstHalf = map.OurFirstHalf,
                OpponentFirstHalf = map.OpponentFirstHalf,
                OurSecondHalf = map.OurSecondHalf,
                OpponentSecondHalf = map.OpponentSecondHalf
            })
            .ToList();

        var (ourScore, opponentScore) = SeriesScore(maps, dto.BestOf) ?? (dto.OurScore, dto.OpponentScore);

        var newMatch = new Match
        {
            TeamId = teamId,
            OpponentName = dto.OpponentName,
            Tournament = dto.Tournament,
            ScheduledDate = dto.ScheduledDate,
            PlayedDate = dto.PlayedDate,
            Status = dto.Status,
            Type = dto.Type,
            OurScore = ourScore,
            OpponentScore = opponentScore,
            BestOf = dto.BestOf,
            Maps = maps,
            Notes = dto.Notes
        };

        var savedMatch = await _matchRepository.AddAsync(newMatch);

        var resultDto = MapToDto(savedMatch, new Dictionary<string, string>());
        return Result<MatchDto>.SuccessResult(resultDto);
    }

    public async Task<Result<List<MatchDto>>> GetTeamMatchesAsync(string userId, int teamId, CancellationToken cancellationToken = default)
    {
        var team = await _teamRepository.GetByIdAsync(teamId, cancellationToken);
        if (team == null) return Result<List<MatchDto>>.NotFound("Team was not found.");

        if (!team.Members.Any(m => m.UserId == userId))
            return Result<List<MatchDto>>.Forbidden("You don't have access to the matches of this team.");

        var matches = await _matchRepository.GetMatchesByTeamIdAsync(teamId, cancellationToken);

        // One query for every name in every lineup.
        var usernames = await _identityService.GetUsernamesByIdsAsync(matches.SelectMany(m => m.Participations).Select(p => p.UserId));
        var dtoList = matches.Select(m => MapToDto(m, usernames)).ToList();

        return Result<List<MatchDto>>.SuccessResult(dtoList);
    }

    public async Task<Result<TeamStatsDto>> GetTeamStatsAsync(string userId, int teamId, MatchKind? type, CancellationToken cancellationToken = default)
    {
        if (await _teamRepository.GetTeamMemberAsync(teamId, userId, cancellationToken) == null)
            return Result<TeamStatsDto>.Forbidden("You don't have access to the statistics of this team.");

        var maps = await _matchRepository.GetMapStatsAsync(teamId, type, cancellationToken);
        foreach (var map in maps)
            map.WinRatePercentage = Percentage(map.Wins, map.Played);

        var finished = (await _matchRepository.GetMatchesByTeamIdAsync(teamId, cancellationToken))
            .Where(m => m.Status == MatchStatus.Finished && (!type.HasValue || m.Type == type.Value))
            .OrderBy(m => m.PlayedDate ?? m.ScheduledDate)
            .ToList();

        var form = new List<FormPointDto>();
        int wins = 0;
        foreach (var match in finished)
        {
            if (match.Outcome == MatchOutcome.Win) wins++;
            form.Add(new FormPointDto
            {
                MatchId = match.Id,
                Date = match.PlayedDate ?? match.ScheduledDate,
                OpponentName = match.OpponentName,
                MatchOutcome = match.Outcome.ToString(),
                WinRatePercentage = Percentage(wins, form.Count + 1)
            });
        }

        return Result<TeamStatsDto>.SuccessResult(new TeamStatsDto
        {
            MatchesPlayed = finished.Count,
            MapsPlayed = maps.Sum(m => m.Played),
            Maps = maps.OrderByDescending(m => m.Played).ThenBy(m => m.MapName).ToList(),
            Form = form
        });
    }

    public async Task<Result<List<MatchLineupEntryDto>>> SetLineupAsync(string userId, int teamId, int matchId, SetMatchLineupDto dto)
    {
        var team = await _teamRepository.GetByIdAsync(teamId);
        if (team == null)
            return Result<List<MatchLineupEntryDto>>.NotFound("Team was not found.");

        var requester = team.Members.FirstOrDefault(m => m.UserId == userId);
        if (requester == null || !requester.CanManageTeam)
            return Result<List<MatchLineupEntryDto>>.Forbidden("Only the team Owner, Captain or Officers can set a lineup.");

        var players = dto.Players ?? new List<LineupPlayerDto>();
        if (players.Select(p => p.UserId).Distinct().Count() != players.Count)
            return Result<List<MatchLineupEntryDto>>.Failure("A player can only be in the lineup once.");

        var lineup = players
            .Select(p => new MatchParticipation
            {
                UserId = p.UserId,
                Role = string.IsNullOrWhiteSpace(p.Role) ? null : p.Role.Trim(),
                Played = p.Played
            })
            .ToList();

        // Match and membership checks run in the same transaction as the write.
        switch (await _matchRepository.ReplaceLineupAsync(teamId, matchId, lineup))
        {
            case LineupWriteOutcome.MatchNotFound:
                return Result<List<MatchLineupEntryDto>>.NotFound("Match was not found.");
            case LineupWriteOutcome.NotTeamMembers:
                return Result<List<MatchLineupEntryDto>>.Failure("Every player in the lineup must be a member of the team.");
            case LineupWriteOutcome.Conflict:
                return Result<List<MatchLineupEntryDto>>.Conflict("Someone else changed this lineup at the same time. Refresh and try again.");
        }

        var usernames = await _identityService.GetUsernamesByIdsAsync(lineup.Select(p => p.UserId));
        return Result<List<MatchLineupEntryDto>>.SuccessResult(ToLineupDto(lineup, usernames));
    }

    private static List<MatchLineupEntryDto> ToLineupDto(IEnumerable<MatchParticipation> lineup, IReadOnlyDictionary<string, string> usernames) =>
        lineup
            .OrderByDescending(p => p.Played)
            .ThenBy(p => p.Id)
            .Select(p => new MatchLineupEntryDto
            {
                UserId = p.UserId,
                Username = usernames.GetValueOrDefault(p.UserId) ?? "Unknown",
                Role = p.Role,
                Played = p.Played
            })
            .ToList();

    private static int Percentage(int part, int total) =>
        total == 0 ? 0 : (int)Math.Round((double)part / total * 100);

    // Works out the series score from the played maps: rounds for a Bo1, maps won otherwise.
    // Returns null when no map has a score, so the score entered for the match is used instead.
    private static (int Our, int Opponent)? SeriesScore(List<MatchMap> maps, int? bestOf)
    {
        var played = maps.Where(m => m.OurScore.HasValue && m.OpponentScore.HasValue).ToList();
        if (played.Count == 0)
            return null;

        if ((bestOf ?? 1) == 1 && played.Count == 1)
            return (played[0].OurScore!.Value, played[0].OpponentScore!.Value);

        return (
            played.Count(m => m.OurScore > m.OpponentScore),
            played.Count(m => m.OpponentScore > m.OurScore));
    }

    private static MatchDto MapToDto(Match match, IReadOnlyDictionary<string, string> usernames)
    {
        return new MatchDto
        {
            Id = match.Id,
            OpponentName = match.OpponentName,
            Tournament = match.Tournament,
            ScheduledDate = match.ScheduledDate,
            PlayedDate = match.PlayedDate,
            Status = match.Status.ToString(), // turns enum into string for easier display in the UI
            Type = match.Type.ToString(),
            FinalScore = match.FinalScore,
            BestOf = match.BestOf,
            Maps = match.Maps
                .OrderBy(m => m.Order)
                .Select(m => new MatchMapDto
                {
                    MapName = m.MapName,
                    OurScore = m.OurScore,
                    OpponentScore = m.OpponentScore,
                    OurFirstHalf = m.OurFirstHalf,
                    OpponentFirstHalf = m.OpponentFirstHalf,
                    OurSecondHalf = m.OurSecondHalf,
                    OpponentSecondHalf = m.OpponentSecondHalf
                })
                .ToList(),
            MatchOutcome = match.Outcome.ToString(),
            Notes = match.Notes,
            Lineup = ToLineupDto(match.Participations, usernames)
        };
    }
}
