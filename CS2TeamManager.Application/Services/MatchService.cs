using CS2TeamManager.Application.Common;
using CS2TeamManager.Application.DTOs;
using CS2TeamManager.Application.Interfaces;
using CS2TeamManager.Domain.Entities;
using CS2TeamManager.Domain.Enums;

namespace CS2TeamManager.Application.Services;

public class MatchService : IMatchService
{
    private readonly IMatchRepository _matchRepository;
    private readonly ITeamRepository _teamRepository; // Needed to check whether the user belongs to that team

    public MatchService(IMatchRepository matchRepository, ITeamRepository teamRepository)
    {
        _matchRepository = matchRepository;
        _teamRepository = teamRepository;
    }

    public async Task<Result<MatchDto>> AddMatchAsync(string userId, int teamId, CreateMatchDto dto)
    {
        var team = await _teamRepository.GetByIdAsync(teamId);
        if (team == null)
            return Result<MatchDto>.Failure("Team was not found.");

        var member = team.Members.FirstOrDefault(m => m.UserId == userId);
        if (member == null || (member.Role != TeamRole.Owner && member.Role != TeamRole.Captain))
            return Result<MatchDto>.Failure("Only Team Owners or Captains can add matches.");

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
            OurScore = ourScore,
            OpponentScore = opponentScore,
            BestOf = dto.BestOf,
            Maps = maps,
            Notes = dto.Notes
        };

        var savedMatch = await _matchRepository.AddAsync(newMatch);

        var resultDto = MapToDto(savedMatch);
        return Result<MatchDto>.SuccessResult(resultDto);
    }

    public async Task<Result<List<MatchDto>>> GetTeamMatchesAsync(string userId, int teamId)
    {
        var team = await _teamRepository.GetByIdAsync(teamId);
        if (team == null) return Result<List<MatchDto>>.Failure("Team was not found.");

        if (!team.Members.Any(m => m.UserId == userId))
            return Result<List<MatchDto>>.Failure("You don't have access to the matches of this team.");

        var matches = await _matchRepository.GetMatchesByTeamIdAsync(teamId);
        
        var dtoList = matches.Select(m => MapToDto(m)).ToList();

        return Result<List<MatchDto>>.SuccessResult(dtoList);
    }

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

    private MatchDto MapToDto(Match match)
    {
        string outcome = "Draw";
        if (match.OurScore > match.OpponentScore) outcome = "Win";
        else if (match.OurScore < match.OpponentScore) outcome = "Loss";

        return new MatchDto
        {
            Id = match.Id,
            OpponentName = match.OpponentName,
            Tournament = match.Tournament,
            ScheduledDate = match.ScheduledDate,
            PlayedDate = match.PlayedDate,
            Status = match.Status.ToString(), // turns enum into string for easier display in the UI
            FinalScore = $"{match.OurScore} - {match.OpponentScore}",
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
            MatchOutcome = outcome,
            Notes = match.Notes
        };
    }
}
