// types/index.ts

// Response of POST /Auth/login.
export interface LoginResponse {
    username: string;
    token: string;
}

export interface Team {
    id: number;
    name: string;
    createdAt: string;
    currentUserRole: string; // "Owner", "Captain", "Officer" or "Player"
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
    type: string;
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
    matchOutcome?: string; // "WIN", "LOSS" or "DRAW"
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

// Numeric values match the MatchKind enum in CS2TeamManager.Domain.
export const MatchKind = {
    Official: 0,
    Scrim: 1,
} as const;

export type MatchKindValue = typeof MatchKind[keyof typeof MatchKind];

export interface CreateMatchRequest {
    opponentName: string;
    tournament?: string;
    scheduledDate: string;
    playedDate?: string;
    status: MatchStatusValue;
    type: MatchKindValue;
    ourScore: number;
    opponentScore: number;
    bestOf?: number;
    maps: MatchMap[];
    notes?: string;
}

// Numeric values match the TeamEventType enum in CS2TeamManager.Domain.
export const TeamEventType = {
    Pracc: 0,
    OfficialMatch: 1,
    VodReview: 2,
    Other: 3,
} as const;

export type TeamEventTypeValue = typeof TeamEventType[keyof typeof TeamEventType];

export const EVENT_TYPE_LABELS: Record<keyof typeof TeamEventType, string> = {
    Pracc: 'Pracc',
    OfficialMatch: 'Official Match',
    VodReview: 'VOD Review',
    Other: 'Other',
};

export interface TeamEvent {
    id: number;
    teamId: number;
    title: string;
    description?: string | null;
    startTime: string;
    endTime: string;
    eventType: keyof typeof TeamEventType;
}

export interface SaveTeamEventRequest {
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    eventType: TeamEventTypeValue;
}

export interface MapStats {
    mapName: string;
    played: number;
    wins: number;
    losses: number;
    draws: number;
    roundsWon: number;
    roundsLost: number;
    winRatePercentage: number;
}

export interface FormPoint {
    matchId: number;
    date: string;
    opponentName: string;
    matchOutcome: string;
    winRatePercentage: number;
}

export interface TeamStats {
    matchesPlayed: number;
    mapsPlayed: number;
    maps: MapStats[];
    form: FormPoint[];
}

// Owner, Captain and Officers can invite players and manage matches and the calendar.
export const canManageTeam = (role?: string) => role === 'Owner' || role === 'Captain' || role === 'Officer';
