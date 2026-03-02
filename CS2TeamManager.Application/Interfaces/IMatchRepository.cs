using CS2TeamManager.Domain.Entities;

namespace CS2TeamManager.Application.Interfaces;

public interface IMatchRepository
{
    Task<Match> AddAsync(Match match);
    Task<List<Match>> GetMatchesByTeamIdAsync(int teamId);
}
