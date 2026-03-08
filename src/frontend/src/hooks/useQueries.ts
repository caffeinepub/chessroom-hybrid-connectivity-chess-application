import { type User, offlineStorage } from "@/lib/offlineStorage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useGetCallerUserProfile() {
  // This hook is no longer needed in offline mode but kept for compatibility
  return {
    data: null,
    isLoading: false,
    isFetched: true,
    error: null,
  };
}

export function useSaveCallerUserProfile() {
  // This hook is no longer needed in offline mode but kept for compatibility
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (_profile: { name: string }): Promise<void> => {
      // No-op in offline mode
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

// Registration hook - calls offline storage
export function useRegisterUser() {
  return useMutation({
    mutationFn: async (username: string): Promise<User> => {
      return await offlineStorage.registerUser(username);
    },
    onError: (error: any) => {
      console.error("Registration error:", error);
    },
  });
}

// Login hook - calls offline storage
export function useLoginUser() {
  return useMutation({
    mutationFn: async (code: string): Promise<string> => {
      return await offlineStorage.loginUser(code);
    },
    onError: (error: any) => {
      console.error("Login error:", error);
    },
  });
}

// Weekly leaderboard hook - fetches from offline storage
export function useGetWeeklyLeaderboard() {
  return useQuery<User[]>({
    queryKey: ["weeklyLeaderboard"],
    queryFn: async () => {
      return await offlineStorage.getWeeklyLeaderboard();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

// Admin: Get all users from offline storage
export function useGetAllUsers() {
  return useQuery<User[]>({
    queryKey: ["allUsers"],
    queryFn: async () => {
      return await offlineStorage.getAllUsers();
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });
}

// Admin: Send jetons to specific user
export function useSendJetonsToUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      username,
      amount,
      message,
    }: {
      username: string;
      amount: number;
      message: string | null;
    }): Promise<void> => {
      await offlineStorage.sendJetonsToUser(username, amount, message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allUsers"] });
      queryClient.invalidateQueries({ queryKey: ["weeklyLeaderboard"] });
    },
    onError: (error: any) => {
      console.error("Send jetons error:", error);
    },
  });
}

// Admin: Gift jetons to all users
export function useGiftJetonsToAllUsers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      amount,
      message,
    }: { amount: number; message: string | null }): Promise<void> => {
      await offlineStorage.giftJetonsToAllUsers(amount, message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allUsers"] });
      queryClient.invalidateQueries({ queryKey: ["weeklyLeaderboard"] });
    },
    onError: (error: any) => {
      console.error("Gift jetons error:", error);
    },
  });
}

// Admin: Update user data (XP, title, jetons)
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      code,
      jetons,
      xp,
      title,
    }: {
      code: string;
      jetons: number;
      xp: number;
      title: string;
    }): Promise<void> => {
      await offlineStorage.updateUser(code, { jetons, xp, title });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allUsers"] });
      queryClient.invalidateQueries({ queryKey: ["weeklyLeaderboard"] });
    },
    onError: (error: any) => {
      console.error("Update user error:", error);
    },
  });
}
