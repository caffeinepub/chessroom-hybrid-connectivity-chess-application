import AdNative from "@/components/AdNative";
import ConnectionStatus from "@/components/ConnectionStatus";
import FriendPanel from "@/components/FriendPanel";
import JetonShop from "@/components/JetonShop";
import LanguageSelector from "@/components/LanguageSelector";
import MatchHistory from "@/components/MatchHistory";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useActor } from "@/hooks/useActor";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { hybridStorage } from "@/lib/hybridStorage";
import { offlineStorage } from "@/lib/offlineStorage";
import { type Language, getTranslations } from "@/lib/translations";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  CalendarDays,
  Coins,
  Crown,
  History,
  LogOut,
  Pencil,
  ShoppingBag,
  Sparkles,
  Trash2,
  Trophy,
  User,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { AIDifficulty, GameMode, UserSession } from "../App";

interface MainScreenProps {
  session: UserSession;
  onLogout: () => void;
  onStartGame: (
    mode: GameMode,
    code?: string,
    difficulty?: AIDifficulty,
  ) => void;
  language: Language;
  onLanguageChange: (language: Language) => void;
}

const NATIVE_AD_UNIT_ID = "ca-app-pub-7936595519986908/9612240400";

function useCountdown(targetDate: Date | null): string {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    if (!targetDate) return;

    const update = () => {
      const diff = targetDate.getTime() - Date.now();
      if (diff <= 0) {
        setRemaining("00:00:00");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
      );
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return remaining;
}

export default function MainScreen({
  session,
  onLogout,
  onStartGame,
  language,
  onLanguageChange,
}: MainScreenProps) {
  const t = getTranslations(language);
  const { isOnline } = useNetworkStatus();
  const { actor } = useActor();
  const queryClient = useQueryClient();

  const [friendPanelOpen, setFriendPanelOpen] = useState(false);
  const [matchHistoryOpen, setMatchHistoryOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [nextDailyClaim, setNextDailyClaim] = useState<Date | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showChangeUsernameDialog, setShowChangeUsernameDialog] =
    useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [isChangingUsername, setIsChangingUsername] = useState(false);
  const [usernameChangeError, setUsernameChangeError] = useState<string | null>(
    null,
  );
  const [nextLeaderboardReset, setNextLeaderboardReset] = useState<Date | null>(
    null,
  );
  const dailyChecked = useRef(false);
  const weeklyChecked = useRef(false);

  // Fetch user data
  const { data: userData, refetch: refetchUser } = useQuery({
    queryKey: ["user", session.code],
    queryFn: async () => {
      const u = await offlineStorage.getUserByCode(session.code);
      if (u) offlineStorage.cacheUserJetons(session.code, u.jetons);
      return u;
    },
  });

  // Fetch leaderboard
  const { data: leaderboardData = [], isLoading: leaderboardLoading } =
    useQuery({
      queryKey: ["weeklyLeaderboard", isOnline],
      queryFn: async () => {
        return await offlineStorage.getWeeklyLeaderboard();
      },
      refetchInterval: 30000,
    });

  // Feature 1: Check daily jeton on load
  useEffect(() => {
    if (!session.code || dailyChecked.current || session.isAdmin) return;
    dailyChecked.current = true;

    const checkDaily = async () => {
      try {
        const result = await offlineStorage.checkAndClaimDailyJeton(
          session.code,
        );
        if (result.claimed) {
          toast.success(t.dailyJetonClaimed);
          await refetchUser();
          queryClient.invalidateQueries({ queryKey: ["user", session.code] });
        }
        setNextDailyClaim(result.nextClaimTime);
      } catch {
        // ignore
      }
    };

    checkDaily();
  }, [
    session.code,
    session.isAdmin,
    t.dailyJetonClaimed,
    refetchUser,
    queryClient,
  ]);

  // Feature 2: Check weekly leaderboard reset on load
  useEffect(() => {
    if (weeklyChecked.current) return;
    weeklyChecked.current = true;

    const checkWeekly = async () => {
      try {
        await offlineStorage.checkAndResetWeeklyLeaderboard();
        queryClient.invalidateQueries({ queryKey: ["weeklyLeaderboard"] });
        setNextLeaderboardReset(offlineStorage.getNextLeaderboardResetTime());
      } catch {
        // ignore
      }
    };

    checkWeekly();
  }, [queryClient]);

  // Set next leaderboard reset time
  useEffect(() => {
    setNextLeaderboardReset(offlineStorage.getNextLeaderboardResetTime());
  }, []);

  const dailyCountdown = useCountdown(nextDailyClaim);
  const leaderboardCountdown = useCountdown(nextLeaderboardReset);

  const userStats = {
    jetons: userData?.jetons ?? 1000,
    xp: userData?.xp ?? 0,
    title: userData?.title ?? "Başlangıç",
  };

  const getTranslatedTitle = (title: string) => {
    const titleMap: Record<string, string> = {
      Başlangıç: t.titleBeginner,
      Amatör: t.titleAmateur,
      Orta: t.titleIntermediate,
      İleri: t.titleAdvanced,
      Uzman: t.titleExpert,
      Usta: t.titleMaster,
      Büyükusta: t.titleGrandmaster,
    };
    return titleMap[title] || title;
  };

  const handleDeleteAccount = async () => {
    if (!actor) return;
    setIsDeleting(true);
    try {
      await actor.deleteAccount();
      setShowDeleteDialog(false);
      toast.success(t.accountDeleted);
      onLogout();
    } catch {
      // silently ignore
    } finally {
      setIsDeleting(false);
    }
  };

  const handleChangeUsername = async () => {
    if (!newUsername.trim()) return;
    setUsernameChangeError(null);
    setIsChangingUsername(true);
    try {
      // Check balance
      const currentUser = await offlineStorage.getUserByCode(session.code);
      if (!currentUser) throw new Error("User not found");
      if (currentUser.jetons < 100) {
        setUsernameChangeError(t.insufficientJetons);
        return;
      }
      // Check if taken
      const existing = await offlineStorage.getUserByUsername(
        newUsername.trim(),
      );
      if (existing && existing.code !== session.code) {
        setUsernameChangeError(t.usernameTaken);
        return;
      }
      // Update username and deduct 100 jetons
      const updatedJetons = currentUser.jetons - 100;
      await offlineStorage.updateUser(session.code, {
        username: newUsername.trim(),
        jetons: updatedJetons,
      });
      offlineStorage.cacheUserJetons(session.code, updatedJetons);
      toast.success(t.usernameChanged);
      setShowChangeUsernameDialog(false);
      setNewUsername("");
      await refetchUser();
    } catch (error: any) {
      setUsernameChangeError(error.message || t.unknownError);
    } finally {
      setIsChangingUsername(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 vibrant-gradient-bg-blue-gold" />

      <div className="absolute top-20 left-10 opacity-10 animate-float pointer-events-none">
        <img
          src="/assets/generated/chess-pieces.dim_400x400.png"
          alt=""
          className="w-40 h-40"
        />
      </div>
      <div className="absolute bottom-20 right-10 opacity-10 animate-float-delayed pointer-events-none">
        <img
          src="/assets/generated/black-chess-pieces-set.dim_400x400.png"
          alt=""
          className="w-40 h-40"
        />
      </div>
      <div className="absolute top-1/2 right-20 opacity-5 animate-float pointer-events-none">
        <img
          src="/assets/generated/white-chess-pieces-set.dim_400x400.png"
          alt=""
          className="w-32 h-32"
        />
      </div>

      <header className="border-b-4 border-white/20 solid-overlay backdrop-blur-md sticky top-0 z-50 shadow-2xl">
        <div className="container mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src="/assets/generated/chessroom-logo-transparent.dim_200x200.png"
                  alt="ChessRoom"
                  className="w-14 h-14 object-contain drop-shadow-2xl animate-glow"
                />
              </div>
              <div className="flex items-center gap-2">
                <Crown className="w-8 h-8 text-amber-400 drop-shadow-lg" />
                <h1 className="text-3xl font-bold gradient-text-gold">
                  {t.appName}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ConnectionStatus language={language} />
              <LanguageSelector
                currentLanguage={language}
                onLanguageChange={onLanguageChange}
              />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-4 border-primary/30 hover:bg-primary/20 transition-all duration-300 hover:scale-105 gap-2 px-3 py-2 h-auto"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div className="hidden sm:flex flex-col items-start">
                      <span className="text-xs font-semibold text-muted-foreground leading-tight">
                        {t.userProfile}
                      </span>
                      <span className="text-sm font-bold text-foreground leading-tight">
                        {session.username}
                      </span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-72 border-4 border-primary/30 solid-overlay backdrop-blur-md"
                >
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-primary/10 to-secondary/10 border-2 border-primary/30">
                      <Sparkles className="w-5 h-5 text-amber-400 animate-glow flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-muted-foreground">
                          {t.username}
                        </p>
                        <p className="text-base font-bold text-foreground truncate">
                          {session.username}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-secondary/10 to-accent/10 border-2 border-secondary/30">
                      <Crown className="w-5 h-5 text-amber-400 animate-glow flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-muted-foreground">
                          {t.yourLoginCode}
                        </p>
                        <Badge
                          variant="outline"
                          className="text-sm font-mono tracking-wider px-3 py-1 border-2 bg-gradient-to-r from-primary/20 to-secondary/20 border-primary/50 font-bold mt-1"
                        >
                          {session.code}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-2 border-amber-500/30">
                      <Coins className="w-5 h-5 text-amber-400 animate-glow flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-muted-foreground">
                          {t.jetons}
                        </p>
                        <p className="text-base font-bold text-foreground">
                          {userStats.jetons}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-2 border-purple-500/30">
                      <Zap className="w-5 h-5 text-purple-400 animate-glow flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-muted-foreground">
                          {t.xp} / {t.playerTitle}
                        </p>
                        <p className="text-base font-bold text-foreground">
                          {userStats.xp} XP -{" "}
                          {getTranslatedTitle(userStats.title)}
                        </p>
                      </div>
                    </div>

                    {/* Native Ad in Profile Section */}
                    <AdNative adUnitId={NATIVE_AD_UNIT_ID} style="compact" />
                  </div>

                  <DropdownMenuSeparator className="bg-primary/20" />

                  {/* Friends Button */}
                  <DropdownMenuItem
                    onClick={() => setFriendPanelOpen(true)}
                    data-ocid="friends.open_modal_button"
                    className="cursor-pointer m-2 p-3 border-2 border-blue-500/50 hover:bg-blue-500/20 hover:border-blue-500 text-foreground transition-all duration-300 font-bold rounded-md"
                  >
                    <Users className="w-4 h-4 mr-2 text-blue-400" />
                    {t.friends}
                  </DropdownMenuItem>

                  {/* Match History Button */}
                  <DropdownMenuItem
                    onClick={() => setMatchHistoryOpen(true)}
                    data-ocid="match-history.open_modal_button"
                    className="cursor-pointer m-2 p-3 border-2 border-purple-500/50 hover:bg-purple-500/20 hover:border-purple-500 text-foreground transition-all duration-300 font-bold rounded-md"
                  >
                    <History className="w-4 h-4 mr-2 text-purple-400" />
                    {t.matchHistory}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setShowChangeUsernameDialog(true)}
                    data-ocid="profile.change_username_button"
                    className="cursor-pointer m-2 p-3 border-2 border-blue-500/50 hover:bg-blue-500/20 hover:border-blue-500 text-foreground transition-all duration-300 font-bold rounded-md"
                  >
                    <Pencil className="w-4 h-4 mr-2 text-blue-400" />
                    {t.changeUsername}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    data-ocid="profile.delete_button"
                    className="cursor-pointer m-2 p-3 border-2 border-orange-500/50 hover:bg-orange-500/20 hover:border-orange-500 text-foreground hover:text-orange-600 dark:hover:text-orange-400 transition-all duration-300 font-bold rounded-md"
                  >
                    <Trash2 className="w-4 h-4 mr-2 text-orange-400" />
                    {t.deleteAccount}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={onLogout}
                    className="cursor-pointer m-2 p-3 border-2 border-red-500/50 hover:bg-red-500/20 hover:border-red-500 text-foreground hover:text-red-600 dark:hover:text-red-400 transition-all duration-300 font-bold rounded-md"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    {t.logout}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 sm:py-12 relative z-10">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Responsive Card-Based User Stats Display */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Jeton Card */}
            <Card
              data-ocid="daily-jeton.card"
              className="border-4 border-amber-500/50 shadow-2xl solid-overlay hover:shadow-amber-500/50 hover:shadow-2xl transition-all duration-300 overflow-hidden relative animate-border-glow hover:scale-105"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-yellow-500/20 opacity-50" />
              <CardHeader className="relative pb-2 sm:pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg sm:text-xl font-bold gradient-text-gold flex items-center gap-2">
                    <Coins className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 flex-shrink-0" />
                    <span className="truncate">{t.jetons}</span>
                  </CardTitle>
                  {nextDailyClaim && (
                    <Badge
                      variant="outline"
                      className="border border-amber-500/50 bg-amber-500/10 text-amber-400 text-xs font-bold flex items-center gap-1"
                    >
                      <CalendarDays className="w-3 h-3" />
                      {t.dailyBonusTitle}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="relative pt-0">
                <p className="text-3xl sm:text-4xl font-bold text-foreground">
                  {userStats.jetons}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {t.currentBalance}
                </p>
                {dailyCountdown && (
                  <p className="text-xs text-amber-400/80 font-semibold mt-2 flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" />
                    {t.dailyJetonTimer} {dailyCountdown}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* XP Card */}
            <Card className="border-4 border-purple-500/50 shadow-2xl solid-overlay hover:shadow-purple-500/50 hover:shadow-2xl transition-all duration-300 overflow-hidden relative animate-border-glow hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 opacity-50" />
              <CardHeader className="relative pb-2 sm:pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg sm:text-xl font-bold gradient-text-vibrant flex items-center gap-2">
                    <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400 flex-shrink-0" />
                    <span className="truncate">{t.xp}</span>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="relative pt-0">
                <p className="text-3xl sm:text-4xl font-bold text-foreground">
                  {userStats.xp}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {t.currentXP}
                </p>
                {userData?.weeklyXP !== undefined && (
                  <p className="text-xs text-purple-400/80 font-semibold mt-2">
                    {t.weeklyXP}: {userData.weeklyXP}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Title Card */}
            <Card className="border-4 border-blue-500/50 shadow-2xl solid-overlay hover:shadow-blue-500/50 hover:shadow-2xl transition-all duration-300 overflow-hidden relative animate-border-glow hover:scale-105 sm:col-span-2 lg:col-span-1">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 opacity-50" />
              <CardHeader className="relative pb-2 sm:pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg sm:text-xl font-bold gradient-text-primary flex items-center gap-2">
                    <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 flex-shrink-0" />
                    <span className="truncate">{t.playerTitle}</span>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="relative pt-0">
                <p className="text-xl sm:text-2xl font-bold text-foreground truncate">
                  {getTranslatedTitle(userStats.title)}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {t.title}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <h2 className="text-3xl sm:text-4xl font-bold text-center text-white drop-shadow-2xl">
              {t.selectGameMode}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              <Card
                className="border-4 border-blue-500/50 shadow-2xl solid-overlay hover:shadow-blue-500/50 hover:shadow-2xl transition-all duration-300 cursor-pointer group overflow-hidden relative hover:scale-105 hover-glow"
                onClick={() => onStartGame("ai")}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <CardHeader className="relative">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300 animate-border-glow">
                    <Bot className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                  </div>
                  <CardTitle className="text-center text-xl sm:text-2xl font-bold gradient-text-primary">
                    {t.playAgainstAI}
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  <p className="text-center text-sm sm:text-base font-bold text-foreground">
                    {t.playAgainstAIDesc}
                  </p>
                </CardContent>
              </Card>

              <Card
                className="border-4 border-purple-500/50 shadow-2xl solid-overlay hover:shadow-purple-500/50 hover:shadow-2xl transition-all duration-300 cursor-pointer group overflow-hidden relative hover:scale-105 hover-glow"
                onClick={() => onStartGame("random")}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <CardHeader className="relative">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300 animate-border-glow">
                    <Users className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                  </div>
                  <CardTitle className="text-center text-xl sm:text-2xl font-bold gradient-text-vibrant">
                    {t.randomRooms}
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  <p className="text-center text-sm sm:text-base font-bold text-foreground">
                    {t.randomRoomsDesc}
                  </p>
                </CardContent>
              </Card>

              <Card
                className="border-4 border-pink-500/50 shadow-2xl solid-overlay hover:shadow-pink-500/50 hover:shadow-2xl transition-all duration-300 cursor-pointer group overflow-hidden relative hover:scale-105 hover-glow"
                onClick={() => onStartGame("friend")}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-orange-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <CardHeader className="relative">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-pink-500 to-orange-600 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300 animate-border-glow">
                    <UserPlus className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                  </div>
                  <CardTitle className="text-center text-xl sm:text-2xl font-bold gradient-text-gold">
                    {t.playWithFriend}
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  <p className="text-center text-sm sm:text-base font-bold text-foreground">
                    {t.playWithFriendDesc}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-2xl flex items-center justify-center gap-3">
                <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-amber-400 animate-glow" />
                {t.weeklyLeaderboard}
              </h2>
              <p className="text-base sm:text-lg text-white/90 font-semibold">
                {t.leaderboardDesc}
              </p>
            </div>

            <Card className="border-4 border-amber-500/50 shadow-2xl solid-overlay overflow-hidden relative animate-border-glow">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-yellow-500/10 opacity-50" />
              <CardHeader className="relative border-b-4 border-amber-500/30">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div>
                    <CardTitle className="text-xl sm:text-2xl font-bold gradient-text-gold flex items-center gap-2">
                      <Crown className="w-6 h-6 sm:w-7 sm:h-7 text-amber-400" />
                      {t.topPlayers}
                    </CardTitle>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                      {t.leaderboardRewards}: {t.firstPlace}, {t.secondPlace},{" "}
                      {t.thirdPlace}
                    </p>
                  </div>
                  {leaderboardCountdown && (
                    <div
                      data-ocid="leaderboard.reset_timer"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-bold flex-shrink-0"
                    >
                      <CalendarDays className="w-3 h-3" />
                      <span>
                        {t.leaderboardResetIn} {leaderboardCountdown}
                      </span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="relative p-0">
                {leaderboardLoading ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400" />
                    <p className="text-base sm:text-lg text-muted-foreground font-semibold mt-4">
                      {t.loading}
                    </p>
                  </div>
                ) : leaderboardData.length === 0 ? (
                  <div className="text-center py-12">
                    <Trophy className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-base sm:text-lg text-muted-foreground font-semibold">
                      {t.noPlayersYet}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b-2 border-amber-500/30 hover:bg-transparent">
                          <TableHead className="text-center font-bold text-foreground text-sm sm:text-base">
                            {t.rank}
                          </TableHead>
                          <TableHead className="font-bold text-foreground text-sm sm:text-base">
                            {t.player}
                          </TableHead>
                          <TableHead className="text-center font-bold text-foreground text-sm sm:text-base">
                            {t.weeklyXP}
                          </TableHead>
                          <TableHead className="text-center font-bold text-foreground text-sm sm:text-base">
                            {t.title}
                          </TableHead>
                          <TableHead className="text-center font-bold text-foreground text-sm sm:text-base">
                            {t.jetons}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leaderboardData.slice(0, 3).map((player, index) => {
                          const rank = index + 1;
                          return (
                            <TableRow
                              key={player.username}
                              data-ocid={`leaderboard.item.${rank}`}
                              className={`border-b border-amber-500/20 hover:bg-amber-500/10 transition-colors ${
                                rank <= 3
                                  ? "bg-gradient-to-r from-amber-500/5 to-yellow-500/5"
                                  : ""
                              }`}
                            >
                              <TableCell className="text-center font-bold">
                                <div className="flex items-center justify-center">
                                  {rank === 1 && (
                                    <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 mr-1" />
                                  )}
                                  {rank === 2 && (
                                    <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mr-1" />
                                  )}
                                  {rank === 3 && (
                                    <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 mr-1" />
                                  )}
                                  <span
                                    className={`text-base sm:text-lg ${rank <= 3 ? "text-amber-400 font-extrabold" : "text-foreground"}`}
                                  >
                                    {rank}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="font-bold text-foreground text-sm sm:text-base">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg flex-shrink-0">
                                    <User className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                                  </div>
                                  <span className="truncate">
                                    {player.username}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center font-bold text-purple-400 text-sm sm:text-base">
                                {player.weeklyXP ?? player.xp}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  variant="outline"
                                  className="border-2 border-blue-500/50 bg-blue-500/10 font-bold text-xs sm:text-sm"
                                >
                                  {getTranslatedTitle(player.title)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center font-bold text-amber-400 text-sm sm:text-base">
                                <div className="flex items-center justify-center gap-1">
                                  <Coins className="w-3 h-3 sm:w-4 sm:h-4" />
                                  {player.jetons}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {/* Native Ad between leaderboard entries */}
                        {leaderboardData.length > 3 && (
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={5} className="p-2">
                              <AdNative
                                adUnitId={NATIVE_AD_UNIT_ID}
                                style="compact"
                              />
                            </TableCell>
                          </TableRow>
                        )}
                        {leaderboardData.slice(3).map((player, index) => {
                          const rank = index + 4;
                          return (
                            <TableRow
                              key={player.username}
                              data-ocid={`leaderboard.item.${rank}`}
                              className="border-b border-amber-500/20 hover:bg-amber-500/10 transition-colors"
                            >
                              <TableCell className="text-center font-bold">
                                <span className="text-base sm:text-lg text-foreground">
                                  {rank}
                                </span>
                              </TableCell>
                              <TableCell className="font-bold text-foreground text-sm sm:text-base">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg flex-shrink-0">
                                    <User className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                                  </div>
                                  <span className="truncate">
                                    {player.username}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center font-bold text-purple-400 text-sm sm:text-base">
                                {player.weeklyXP ?? player.xp}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  variant="outline"
                                  className="border-2 border-blue-500/50 bg-blue-500/10 font-bold text-xs sm:text-sm"
                                >
                                  {getTranslatedTitle(player.title)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center font-bold text-amber-400 text-sm sm:text-base">
                                <div className="flex items-center justify-center gap-1">
                                  <Coins className="w-3 h-3 sm:w-4 sm:h-4" />
                                  {player.jetons}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Dialogs */}
      <JetonShop
        isOpen={shopOpen}
        onClose={() => setShopOpen(false)}
        userCode={session.code}
        currentJetons={userStats.jetons}
        onPurchase={() => refetchUser()}
      />

      <FriendPanel
        open={friendPanelOpen}
        onClose={() => setFriendPanelOpen(false)}
        userCode={session.code}
        language={language}
      />

      <MatchHistory
        open={matchHistoryOpen}
        onClose={() => setMatchHistoryOpen(false)}
        userCode={session.code}
        language={language}
      />

      {/* Change Username Dialog */}
      <Dialog
        open={showChangeUsernameDialog}
        onOpenChange={(open) => {
          setShowChangeUsernameDialog(open);
          if (!open) {
            setNewUsername("");
            setUsernameChangeError(null);
          }
        }}
      >
        <DialogContent
          data-ocid="change_username.dialog"
          className="max-w-sm border-4 border-blue-500/50 solid-overlay"
        >
          <DialogHeader>
            <DialogTitle className="text-blue-400 flex items-center gap-2 text-xl font-bold">
              <Pencil className="w-5 h-5" />
              {t.changeUsernameTitle}
            </DialogTitle>
            <DialogDescription className="space-y-1 pt-2">
              <span className="block font-semibold">
                {t.changeUsernameDesc}
              </span>
              <span className="block text-amber-400 font-bold">
                {t.usernameChangeCost}
              </span>
              <span className="block text-sm">
                {t.currentBalance}: {userStats.jetons} {t.jetons}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="new-username" className="font-bold">
                {t.newUsername}
              </Label>
              <Input
                id="new-username"
                placeholder={t.newUsernamePlaceholder}
                value={newUsername}
                onChange={(e) => {
                  setNewUsername(e.target.value);
                  setUsernameChangeError(null);
                }}
                data-ocid="change_username.input"
                className="border-2 h-11 font-semibold"
              />
              {usernameChangeError && (
                <p
                  data-ocid="change_username.error_state"
                  className="text-sm text-destructive font-semibold"
                >
                  {usernameChangeError}
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowChangeUsernameDialog(false)}
              data-ocid="change_username.cancel_button"
              className="font-bold"
            >
              İptal
            </Button>
            <Button
              onClick={handleChangeUsername}
              disabled={isChangingUsername || !newUsername.trim()}
              data-ocid="change_username.submit_button"
              className="btn-gradient-primary text-white font-bold"
            >
              {isChangingUsername ? (
                <>
                  <Pencil className="w-4 h-4 mr-2 animate-spin" /> ...
                </>
              ) : (
                <>
                  <Pencil className="w-4 h-4 mr-2" />
                  {t.changeUsername}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent data-ocid="delete_account.dialog" className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              {t.deleteAccount}
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <span className="block font-medium text-foreground">
                {t.deleteAccountConfirm}
              </span>
              <span className="block text-sm text-muted-foreground">
                {t.deleteAccountWarning}
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              data-ocid="delete_account.cancel_button"
              className="flex-1"
            >
              "İptal"
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              data-ocid="delete_account.confirm_button"
              className="flex-1"
            >
              {isDeleting ? "..." : t.deleteAccount}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
