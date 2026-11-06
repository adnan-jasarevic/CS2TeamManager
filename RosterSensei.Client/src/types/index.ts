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
    currentUserRole: string; // "Captain", "Officer" or "Player"
    isOwner: boolean; // The Owner also has one of the roles above.
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

/** Every endpoint sends match results in this exact form. */
export type MatchOutcome = 'Win' | 'Loss' | 'Draw';

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
    matchOutcome: MatchOutcome;
    notes?: string;
}
export interface MatchResponse {
    id: number;
    opponentName: string;
    scheduledDate: string;
    playedDate?: string;
    status: string;
    finalScore?: string;
    matchOutcome?: MatchOutcome;
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
    isOwner: boolean;
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


// Numeric values match the MatchStatus enum in RosterSensei.Domain.
export const MatchStatus = {
    Scheduled: 0,
    Live: 1,
    Finished: 2,
    Cancelled: 3,
} as const;

export type MatchStatusValue = typeof MatchStatus[keyof typeof MatchStatus];

// Numeric values match the MatchKind enum in RosterSensei.Domain.
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

/** The premade types, by the name the API uses. Matches EventTypePreset in RosterSensei.Domain. */
export type EventTypePreset =
    | 'Pracc' | 'OfficialMatch' | 'Scrim' | 'VodReview' | 'RecordedMatch'
    | 'Theory' | 'Break' | 'Warmup' | 'Meet' | 'Other';

/** One of the team's own event types. */
export interface TeamEventType {
    id: number;
    name: string;
    /** "#RRGGBB" */
    color: string;
    /** The premade type it was made from (kept when renamed), or null for a custom type. */
    preset: EventTypePreset | null;
    /** True for "Other", which can't be changed or removed. */
    isLocked: boolean;
}

export interface EventTypePresetOption {
    preset: EventTypePreset;
    name: string;
    color: string;
}

export interface TeamEventTypes {
    types: TeamEventType[];
    /** Premade types the team doesn't have right now. */
    availablePresets: EventTypePresetOption[];
}

export interface SaveEventTypeRequest {
    name: string;
    color: string;
}

/** A day with no play. Events on it show as cancelled; no new ones can be added. */
export interface TeamOffDay {
    /** "yyyy-MM-dd" */
    date: string;
    startTime: string;
    endTime: string;
}

export interface TeamEvent {
    id: number;
    teamId: number;
    title: string;
    description?: string | null;
    startTime: string;
    endTime: string;
    eventTypeId: number;
    /** Goes up on every edit; sent back when saving so a newer edit isn't overwritten. */
    version: number;
}

export interface SaveTeamEventRequest {
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    eventTypeId: number;
    /** Required when editing: the version of the event the edit started from. */
    version?: number;
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
    matchOutcome: MatchOutcome;
    winRatePercentage: number;
}

export interface TeamStats {
    matchesPlayed: number;
    mapsPlayed: number;
    maps: MapStats[];
    form: FormPoint[];
}

// The Owner, the Captain and Officers can invite players and manage matches and the calendar.
export const canManageTeam = (team?: Team) =>
    !!team && (team.isOwner || team.currentUserRole === 'Captain' || team.currentUserRole === 'Officer');

// How the user's place in a team is shown, for example "Owner, Captain".
export const roleLabel = (team: Team) => team.isOwner ? `Owner, ${team.currentUserRole}` : team.currentUserRole;
