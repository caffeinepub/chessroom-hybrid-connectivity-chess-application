import type { backendInterface } from "../backend";
// Hybrid storage system that syncs with backend when online
import { type User, offlineStorage } from "./offlineStorage";

class HybridStorage {
  private syncQueue: Array<{ type: string; data: any }> = [];
  private isSyncing = false;

  // Register user - try backend first, fallback to offline
  async registerUser(
    username: string,
    actor: backendInterface | null,
    isOnline: boolean,
  ): Promise<User> {
    if (isOnline && actor) {
      try {
        const code = await actor.registerUser(username);
        // Also save to offline storage
        const user = await offlineStorage.registerUser(username);
        // Update the code from backend
        await offlineStorage.updateUser(user.code, { code });
        return { ...user, code };
      } catch (error) {
        console.error("Backend registration failed, using offline:", error);
      }
    }

    // Fallback to offline storage
    return await offlineStorage.registerUser(username);
  }

  // Login user - validate with backend if online, fallback to offline
  async loginUser(
    code: string,
    actor: backendInterface | null,
    isOnline: boolean,
  ): Promise<string> {
    if (isOnline && actor && code !== "KING +154") {
      try {
        const principal = await actor.validateLoginCode(code);
        if (principal) {
          // Valid login, also check offline storage
          const username = await offlineStorage.loginUser(code);
          return username;
        }
      } catch (error) {
        console.error("Backend login validation failed, using offline:", error);
      }
    }

    // Fallback to offline storage
    return await offlineStorage.loginUser(code);
  }

  // Sync user data with backend
  async syncUserData(
    actor: backendInterface | null,
    isOnline: boolean,
  ): Promise<void> {
    if (!isOnline || !actor || this.isSyncing) return;

    this.isSyncing = true;
    try {
      // Get all local users
      const localUsers = await offlineStorage.getAllUsers();

      // Sync each user with backend
      for (const user of localUsers) {
        try {
          // Check if user exists on backend
          const backendProfile = await actor.getUserProfile(user.code as any);

          if (!backendProfile) {
            // User doesn't exist on backend, register them
            await actor.registerUser(user.username);
          } else {
            // Update backend with local data if needed
            // This would require additional backend methods
          }
        } catch (error) {
          console.error("Failed to sync user:", user.username, error);
        }
      }

      // Process sync queue
      await this.processSyncQueue(actor);
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      this.isSyncing = false;
    }
  }

  // Add operation to sync queue
  addToSyncQueue(type: string, data: any): void {
    this.syncQueue.push({ type, data });
  }

  // Process sync queue
  private async processSyncQueue(actor: backendInterface): Promise<void> {
    while (this.syncQueue.length > 0) {
      const operation = this.syncQueue.shift();
      if (!operation) continue;

      try {
        switch (operation.type) {
          case "updateJetons":
            await actor.updateJetonBalance(BigInt(operation.data.amount));
            break;
          case "updateXP":
            await actor.updateXP(BigInt(operation.data.xpChange));
            break;
          // Add more sync operations as needed
        }
      } catch (error) {
        console.error("Failed to process sync operation:", operation, error);
        // Re-add to queue for retry
        this.syncQueue.push(operation);
        break;
      }
    }
  }

  // Get leaderboard - try backend first, fallback to offline
  async getLeaderboard(
    actor: backendInterface | null,
    isOnline: boolean,
  ): Promise<User[]> {
    if (isOnline && actor) {
      try {
        const backendLeaderboard = await actor.getLeaderboard();
        // Convert backend format to local format
        const leaderboard: User[] = backendLeaderboard.map((entry) => ({
          username: entry.username,
          code: "", // Backend doesn't expose codes
          jetons: Number(entry.jetonBalance),
          xp: Number(entry.xp),
          title: entry.title,
          isAdmin: false,
        }));
        return leaderboard;
      } catch (error) {
        console.error("Backend leaderboard failed, using offline:", error);
      }
    }

    // Fallback to offline storage
    return await offlineStorage.getWeeklyLeaderboard();
  }

  // Get all users - try backend first, fallback to offline
  async getAllUsers(
    actor: backendInterface | null,
    isOnline: boolean,
  ): Promise<User[]> {
    if (isOnline && actor) {
      try {
        const backendUsers = await actor.getAllUsers();
        // Convert backend format to local format
        const users: User[] = backendUsers.map((profile) => ({
          username: profile.username,
          code: profile.code,
          jetons: Number(profile.jetonBalance),
          xp: Number(profile.xp),
          title: profile.title,
          isAdmin: false,
        }));
        return users;
      } catch (error) {
        console.error("Backend users failed, using offline:", error);
      }
    }

    // Fallback to offline storage
    return await offlineStorage.getAllUsers();
  }

  // Admin: Send jetons to user
  async sendJetonsToUser(
    username: string,
    amount: number,
    message: string | null,
    actor: backendInterface | null,
    isOnline: boolean,
  ): Promise<void> {
    // Always update offline storage
    await offlineStorage.sendJetonsToUser(username, amount, message);

    // Sync with backend if online
    if (isOnline && actor) {
      try {
        await actor.sendJetonsToUser(username, BigInt(amount), message || "");
      } catch (error) {
        console.error("Backend sendJetonsToUser failed:", error);
        // Add to sync queue for later
        this.addToSyncQueue("sendJetonsToUser", { username, amount, message });
      }
    } else {
      // Add to sync queue for when we're back online
      this.addToSyncQueue("sendJetonsToUser", { username, amount, message });
    }
  }

  // Admin: Gift jetons to all users
  async giftJetonsToAllUsers(
    amount: number,
    message: string | null,
    actor: backendInterface | null,
    isOnline: boolean,
  ): Promise<void> {
    // Always update offline storage
    await offlineStorage.giftJetonsToAllUsers(amount, message);

    // Sync with backend if online
    if (isOnline && actor) {
      try {
        await actor.sendJetonsToAllUsers(BigInt(amount), message || "");
      } catch (error) {
        console.error("Backend giftJetonsToAllUsers failed:", error);
        // Add to sync queue for later
        this.addToSyncQueue("giftJetonsToAllUsers", { amount, message });
      }
    } else {
      // Add to sync queue for when we're back online
      this.addToSyncQueue("giftJetonsToAllUsers", { amount, message });
    }
  }
}

export const hybridStorage = new HybridStorage();
