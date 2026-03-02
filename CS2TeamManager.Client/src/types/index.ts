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

export interface Match {
    id: number;
    opponentName: string;
    tournament?: string;
    scheduledDate: string;
    playedDate?: string;
    status: string;
    finalScore: string;
    bestOf?: number;
    maps: string[];
    matchOutcome: string;
    notes?: string;
}
