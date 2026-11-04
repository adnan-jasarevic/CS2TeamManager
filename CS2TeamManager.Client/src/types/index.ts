// types/index.ts

export interface UserUser {
    username: string;
    email: string;
    token: string;
}

export interface Team {
    id: number;
    name: string;
    createdAt: string;
    currentUserRole: string; // "Owner", "Player"
}

export interface MatchMap {
    mapName: string;
    ourScore?: number | null;
    opponentScore?: number | null;
    ourFirstHalf?: number | null;
    opponentFirstHalf?: number | null;
    ourSecondHalf?: number | null;
    opponentSecondHalf?: number | null;
}

export interface Match {
    id: number;
    opponentName: string;
    tournament?: string;
    scheduledDate: string;
    playedDate?: string;
    status: string;
    finalScore: string;
    bestOf?: number;
    maps: MatchMap[];
    matchOutcome: string;
    notes?: string;
}
export interface MatchResponse {
    id: number;
    opponentName: string;
    scheduledDate: string;
    status: string;
    finalScore?: string;
    matchOutcome?: string; // "WIN", "LOSS", "DRAW"
}

export interface TeamDashboardData {
    totalMatches: number;
    winRatePercentage: number;
    totalMembers: number;
    upcomingMatchesCount: number;
    recentMatches: MatchResponse[];
    upcomingMatches: MatchResponse[];
}

export interface TeamMember {
    id: string;
    email: string;
    username: string; 
    role: string; 
    joinedAt: string;
}

export interface AddTeamMemberRequest {
    userEmail: string;
}

export interface TeamInvite {
    inviteId: number;
    teamId: number;
    teamName: string;
    senderUsername: string;
    createdAt: string;
}


// Numeric values match the MatchStatus enum in CS2TeamManager.Domain.
export const MatchStatus = {
    Scheduled: 0,
    Live: 1,
    Finished: 2,
    Cancelled: 3,
} as const;

export type MatchStatusValue = typeof MatchStatus[keyof typeof MatchStatus];

export interface CreateMatchRequest {
    opponentName: string;
    tournament?: string;
    scheduledDate: string;
    playedDate?: string;
    status: MatchStatusValue;
    ourScore: number;
    opponentScore: number;
    bestOf?: number;
    maps: MatchMap[];
    notes?: string;
}
