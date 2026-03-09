import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface LeaderboardEntry {
    xp: bigint;
    title: string;
    username: string;
    jetonBalance: bigint;
    user: Principal;
}
export interface GameState {
    status: string;
    moves: Array<string>;
    lastHeartbeat1: bigint;
    lastHeartbeat2: bigint;
    difficulty: string;
    createdAt: bigint;
    player1: Principal;
    player2?: Principal;
    disconnectWinner?: Principal;
    jetonPot: bigint;
    sessionId: string;
}
export interface UserProfile {
    xp: bigint;
    title: string;
    username: string;
    jetonBalance: bigint;
    code: string;
    registeredAt: bigint;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    checkDisconnect(sessionId: string): Promise<Principal | null>;
    createGameSession(sessionId: string, jetonWager: bigint, difficulty: string): Promise<void>;
    deleteAccount(): Promise<void>;
    getActiveGameSessions(): Promise<Array<GameState>>;
    getAllUsers(): Promise<Array<UserProfile>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getGameMoves(sessionId: string): Promise<Array<string>>;
    getGameSession(sessionId: string): Promise<GameState | null>;
    getLeaderboard(): Promise<Array<LeaderboardEntry>>;
    getSystemStatistics(): Promise<{
        averageXP: bigint;
        totalJetons: bigint;
        totalUsers: bigint;
    }>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    initializeAccessControl(): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    joinGameSession(sessionId: string, jetonWager: bigint): Promise<void>;
    registerUser(username: string): Promise<string>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    sendJetonsToAllUsers(amount: bigint, message: string): Promise<void>;
    sendJetonsToUser(username: string, amount: bigint, message: string): Promise<void>;
    submitMove(sessionId: string, moveNotation: string): Promise<void>;
    updateJetonBalance(amount: bigint): Promise<void>;
    updatePlayerHeartbeat(sessionId: string): Promise<void>;
    updateXP(xpChange: bigint): Promise<string>;
    validateLoginCode(code: string): Promise<Principal | null>;
}
