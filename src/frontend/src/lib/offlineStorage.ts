// Offline storage management using IndexedDB for WebView bundle

const DB_NAME = "ChessRoomDB";
const DB_VERSION = 2;

export interface User {
  username: string;
  code: string;
  jetons: number;
  xp: number;
  title: string;
  isAdmin: boolean;
  lastDailyClaimDate?: string; // 'YYYY-MM-DD' TR time
  weeklyXP?: number;
  weeklyLeaderboardResetDate?: string; // 'YYYY-WW'
  friends?: string[]; // list of followed usernames
}

export interface GameSession {
  id: string;
  difficulty: string;
  jetonAmount?: number;
  playerCount: number;
  createdAt: number;
}

export interface AdminAction {
  id: string;
  type: "bulk_jeton" | "individual_jeton" | "announcement";
  timestamp: number;
  data: any;
}

export interface MatchRecord {
  id: string;
  date: number;
  gameMode: "ai" | "random" | "friend";
  aiDifficulty?: string;
  result: "win" | "loss" | "draw";
  xpGained: number;
  jetonsGained: number;
  duration: number; // seconds
  opponentName?: string;
  userCode: string;
}

// Helper: Get Turkey time date string YYYY-MM-DD
function getTurkeyDateString(): string {
  const now = new Date();
  // UTC+3
  const tr = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const y = tr.getUTCFullYear();
  const m = String(tr.getUTCMonth() + 1).padStart(2, "0");
  const d = String(tr.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Helper: Get ISO week number 'YYYY-WW'
function getTurkeyWeekString(): string {
  const now = new Date();
  const tr = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  // ISO week: Monday=1
  const dayOfWeek = tr.getUTCDay() || 7; // 1=Mon..7=Sun
  const nearestThursday = new Date(tr.getTime() + (4 - dayOfWeek) * 86400000);
  const yearStart = new Date(Date.UTC(nearestThursday.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(
    ((nearestThursday.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `${nearestThursday.getUTCFullYear()}-${String(weekNum).padStart(2, "0")}`;
}

// Get next 00:00 Turkey time as Date
function getNextTRMidnight(): Date {
  const now = new Date();
  const trOffset = 3 * 60 * 60 * 1000;
  const trNow = new Date(now.getTime() + trOffset);
  // Next midnight in TR: set to next day 00:00 UTC+3
  const trMidnight = new Date(
    Date.UTC(
      trNow.getUTCFullYear(),
      trNow.getUTCMonth(),
      trNow.getUTCDate() + 1,
      0,
      0,
      0,
      0,
    ),
  );
  // Convert back to UTC
  return new Date(trMidnight.getTime() - trOffset);
}

// Get next Monday 00:00 Turkey time
function getNextMondayTR(): Date {
  const now = new Date();
  const trOffset = 3 * 60 * 60 * 1000;
  const trNow = new Date(now.getTime() + trOffset);
  const dayOfWeek = trNow.getUTCDay() || 7; // 1=Mon..7=Sun
  const daysUntilNextMonday = dayOfWeek === 1 ? 7 : 8 - dayOfWeek;
  const nextMonday = new Date(
    Date.UTC(
      trNow.getUTCFullYear(),
      trNow.getUTCMonth(),
      trNow.getUTCDate() + daysUntilNextMonday,
      0,
      0,
      0,
      0,
    ),
  );
  return new Date(nextMonday.getTime() - trOffset);
}

class OfflineStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion;

        // Version 1 stores
        if (oldVersion < 1) {
          if (!db.objectStoreNames.contains("users")) {
            const userStore = db.createObjectStore("users", {
              keyPath: "code",
            });
            userStore.createIndex("username", "username", { unique: true });
          }
          if (!db.objectStoreNames.contains("codes")) {
            db.createObjectStore("codes", { keyPath: "code" });
          }
          if (!db.objectStoreNames.contains("sessions")) {
            db.createObjectStore("sessions", { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains("adminActions")) {
            db.createObjectStore("adminActions", {
              keyPath: "id",
              autoIncrement: true,
            });
          }
          if (!db.objectStoreNames.contains("currentSession")) {
            db.createObjectStore("currentSession", { keyPath: "key" });
          }
        }

        // Version 2 stores
        if (oldVersion < 2) {
          // Protect existing stores
          if (!db.objectStoreNames.contains("users")) {
            const userStore = db.createObjectStore("users", {
              keyPath: "code",
            });
            userStore.createIndex("username", "username", { unique: true });
          }
          if (!db.objectStoreNames.contains("codes")) {
            db.createObjectStore("codes", { keyPath: "code" });
          }
          if (!db.objectStoreNames.contains("sessions")) {
            db.createObjectStore("sessions", { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains("adminActions")) {
            db.createObjectStore("adminActions", {
              keyPath: "id",
              autoIncrement: true,
            });
          }
          if (!db.objectStoreNames.contains("currentSession")) {
            db.createObjectStore("currentSession", { keyPath: "key" });
          }

          // New in v2: matchHistory
          if (!db.objectStoreNames.contains("matchHistory")) {
            const matchStore = db.createObjectStore("matchHistory", {
              keyPath: "id",
            });
            matchStore.createIndex("userCode", "userCode", { unique: false });
          }
        }
      };
    });
  }

  // Generate unique 8-character code
  generateCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      if (i === 4) code += " ";
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Register new user
  async registerUser(username: string): Promise<User> {
    if (!this.db) throw new Error("Database not initialized");

    const existingUser = await this.getUserByUsername(username);
    if (existingUser) {
      throw new Error("Kullanıcı adı zaten mevcut");
    }

    let code = this.generateCode();
    while (await this.getUserByCode(code)) {
      code = this.generateCode();
    }

    const user: User = {
      username,
      code,
      jetons: 1000,
      xp: 0,
      title: "Başlangıç",
      isAdmin: code === "KING +154",
      weeklyXP: 0,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["users", "codes"], "readwrite");
      const userStore = transaction.objectStore("users");
      const codeStore = transaction.objectStore("codes");

      userStore.add(user);
      codeStore.add({ code, username });

      transaction.oncomplete = () => resolve(user);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Login user
  async loginUser(code: string): Promise<string> {
    if (!this.db) throw new Error("Database not initialized");

    if (code === "KING +154") {
      return "Admin";
    }

    const user = await this.getUserByCode(code);
    if (!user) {
      throw new Error(
        "Geçersiz kod. Lütfen kodunuzu kontrol edip tekrar deneyin.",
      );
    }

    return user.username;
  }

  // Get user by code
  async getUserByCode(code: string): Promise<User | null> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["users"], "readonly");
      const store = transaction.objectStore("users");
      const request = store.get(code);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  // Get user by username
  async getUserByUsername(username: string): Promise<User | null> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["users"], "readonly");
      const store = transaction.objectStore("users");
      const index = store.index("username");
      const request = index.get(username);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  // Get all users
  async getAllUsers(): Promise<User[]> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["users"], "readonly");
      const store = transaction.objectStore("users");
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Update user
  async updateUser(code: string, updates: Partial<User>): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    const user = await this.getUserByCode(code);
    if (!user) throw new Error("User not found");

    const updatedUser = { ...user, ...updates };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["users"], "readwrite");
      const store = transaction.objectStore("users");
      const request = store.put(updatedUser);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ─── FEATURE 1: Daily Jeton System ───────────────────────────────────────

  async checkAndClaimDailyJeton(
    userCode: string,
  ): Promise<{ claimed: boolean; amount: number; nextClaimTime: Date }> {
    const user = await this.getUserByCode(userCode);
    if (!user) throw new Error("User not found");

    const today = getTurkeyDateString();
    const nextClaimTime = getNextTRMidnight();

    if (user.lastDailyClaimDate === today) {
      return { claimed: false, amount: 0, nextClaimTime };
    }

    const amount = 50;
    await this.updateUser(userCode, {
      jetons: user.jetons + amount,
      lastDailyClaimDate: today,
    });

    return { claimed: true, amount, nextClaimTime };
  }

  async getNextDailyClaimTime(): Promise<Date> {
    return getNextTRMidnight();
  }

  // ─── FEATURE 2: Weekly Leaderboard Reset ─────────────────────────────────

  async checkAndResetWeeklyLeaderboard(): Promise<boolean> {
    const currentWeek = getTurkeyWeekString();

    // Check stored reset date (use a special system entry)
    const stored = localStorage.getItem("chessroom_leaderboard_week");
    if (stored === currentWeek) return false;

    // Reset all users' weeklyXP
    const users = await this.getAllUsers();
    for (const user of users) {
      await this.updateUser(user.code, {
        weeklyXP: 0,
        weeklyLeaderboardResetDate: currentWeek,
      });
    }

    localStorage.setItem("chessroom_leaderboard_week", currentWeek);
    return true;
  }

  async addWeeklyXP(userCode: string, amount: number): Promise<void> {
    const user = await this.getUserByCode(userCode);
    if (!user) return;
    const current = user.weeklyXP ?? 0;
    await this.updateUser(userCode, { weeklyXP: current + amount });
  }

  async getWeeklyLeaderboard(): Promise<User[]> {
    const users = await this.getAllUsers();
    return users
      .sort((a, b) => (b.weeklyXP ?? b.xp) - (a.weeklyXP ?? a.xp))
      .slice(0, 10);
  }

  getNextLeaderboardResetTime(): Date {
    return getNextMondayTR();
  }

  // ─── FEATURE 3: Friends System ───────────────────────────────────────────

  async addFriend(userCode: string, friendUsername: string): Promise<void> {
    const user = await this.getUserByCode(userCode);
    if (!user) throw new Error("User not found");
    const friends = user.friends ?? [];
    if (!friends.includes(friendUsername)) {
      await this.updateUser(userCode, {
        friends: [...friends, friendUsername],
      });
    }
  }

  async removeFriend(userCode: string, friendUsername: string): Promise<void> {
    const user = await this.getUserByCode(userCode);
    if (!user) throw new Error("User not found");
    const friends = (user.friends ?? []).filter((f) => f !== friendUsername);
    await this.updateUser(userCode, { friends });
  }

  async getFriends(userCode: string): Promise<User[]> {
    const user = await this.getUserByCode(userCode);
    if (!user || !user.friends?.length) return [];
    const results: User[] = [];
    for (const username of user.friends) {
      const friend = await this.getUserByUsername(username);
      if (friend) results.push(friend);
    }
    return results;
  }

  async searchUsers(query: string): Promise<User[]> {
    if (!query.trim()) return [];
    const users = await this.getAllUsers();
    const q = query.toLowerCase();
    return users
      .filter((u) => u.username.toLowerCase().includes(q))
      .slice(0, 10);
  }

  // ─── FEATURE 4: Match History ────────────────────────────────────────────

  async saveMatch(
    userCode: string,
    match: Omit<MatchRecord, "id">,
  ): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    const record: MatchRecord = {
      ...match,
      id: `${userCode}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userCode,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["matchHistory"], "readwrite");
      const store = transaction.objectStore("matchHistory");
      const request = store.add(record);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getMatchHistory(userCode: string, limit = 20): Promise<MatchRecord[]> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["matchHistory"], "readonly");
      const store = transaction.objectStore("matchHistory");
      const index = store.index("userCode");
      const request = index.getAll(userCode);

      request.onsuccess = () => {
        const all: MatchRecord[] = request.result || [];
        all.sort((a, b) => b.date - a.date);
        resolve(all.slice(0, limit));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getMatchStats(userCode: string): Promise<{
    totalGames: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
    totalXPGained: number;
    totalJetonsGained: number;
  }> {
    const history = await this.getMatchHistory(userCode, 1000);
    const totalGames = history.length;
    const wins = history.filter((m) => m.result === "win").length;
    const losses = history.filter((m) => m.result === "loss").length;
    const draws = history.filter((m) => m.result === "draw").length;
    const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
    const totalXPGained = history.reduce((s, m) => s + m.xpGained, 0);
    const totalJetonsGained = history.reduce((s, m) => s + m.jetonsGained, 0);
    return {
      totalGames,
      wins,
      losses,
      draws,
      winRate,
      totalXPGained,
      totalJetonsGained,
    };
  }

  // ─── EXISTING METHODS ────────────────────────────────────────────────────

  // Get weekly leaderboard (legacy - now uses weeklyXP)
  async getLegacyWeeklyLeaderboard(): Promise<User[]> {
    const users = await this.getAllUsers();
    return users.sort((a, b) => b.xp - a.xp).slice(0, 10);
  }

  // Save current session
  async saveCurrentSession(
    username: string,
    code: string,
    isAdmin: boolean,
  ): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["currentSession"], "readwrite");
      const store = transaction.objectStore("currentSession");
      const request = store.put({ key: "current", username, code, isAdmin });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get current session
  async getCurrentSession(): Promise<{
    username: string;
    code: string;
    isAdmin: boolean;
  } | null> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["currentSession"], "readonly");
      const store = transaction.objectStore("currentSession");
      const request = store.get("current");

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  // Clear current session
  async clearCurrentSession(): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["currentSession"], "readwrite");
      const store = transaction.objectStore("currentSession");
      const request = store.delete("current");

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Admin: Gift jetons to all users
  async giftJetonsToAllUsers(
    amount: number,
    message: string | null,
  ): Promise<void> {
    const users = await this.getAllUsers();

    for (const user of users) {
      await this.updateUser(user.code, {
        jetons: user.jetons + amount,
      });
    }

    await this.logAdminAction({
      type: "bulk_jeton",
      timestamp: Date.now(),
      data: { amount, message },
    });
  }

  // Admin: Send jetons to specific user
  async sendJetonsToUser(
    username: string,
    amount: number,
    message: string | null,
  ): Promise<void> {
    const user = await this.getUserByUsername(username);
    if (!user) throw new Error("User not found");

    await this.updateUser(user.code, {
      jetons: user.jetons + amount,
    });

    await this.logAdminAction({
      type: "individual_jeton",
      timestamp: Date.now(),
      data: { username, amount, message },
    });
  }

  // Log admin action
  async logAdminAction(action: Omit<AdminAction, "id">): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["adminActions"], "readwrite");
      const store = transaction.objectStore("adminActions");
      const request = store.add(action);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get system statistics
  async getSystemStats(): Promise<{
    totalUsers: number;
    totalJetons: number;
    averageXP: number;
  }> {
    const users = await this.getAllUsers();
    const totalUsers = users.length;
    const totalJetons = users.reduce((sum, user) => sum + user.jetons, 0);
    const averageXP =
      totalUsers > 0
        ? users.reduce((sum, user) => sum + user.xp, 0) / totalUsers
        : 0;

    return { totalUsers, totalJetons, averageXP: Math.round(averageXP) };
  }
}

export const offlineStorage = new OfflineStorage();
