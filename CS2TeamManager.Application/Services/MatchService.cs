using CS2TeamManager.Application.Common;
using CS2TeamManager.Application.DTOs;
using CS2TeamManager.Application.Interfaces;
using CS2TeamManager.Domain.Entities;

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

        if (!team.Members.Any(m => m.UserId == userId))
            return Result<MatchDto>.Failure("You don't have permission to add matches for this team.");

        var newMatch = new Match
        {
            TeamId = teamId,
            OpponentName = dto.OpponentName,
            Tournament = dto.Tournament,
            ScheduledDate = dto.ScheduledDate,
            PlayedDate = dto.PlayedDate,
            Status = dto.Status,
            OurScore = dto.OurScore,
            OpponentScore = dto.OpponentScore,
            BestOf = dto.BestOf,
            // turn list into string and divide it with commas for easier storage in the database
            Maps = dto.Maps != null && dto.Maps.Any() ? string.Join(",", dto.Maps) : string.Empty,
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
            Maps = string.IsNullOrEmpty(match.Maps) ? new List<string>() : match.Maps.Split(',').ToList(),
            MatchOutcome = outcome,
            Notes = match.Notes
        };
    }
}
