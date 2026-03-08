import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type MatchRecord, offlineStorage } from "@/lib/offlineStorage";
import { type Language, getTranslations } from "@/lib/translations";
import {
  Bot,
  ChevronDown,
  Coins,
  History,
  TrendingUp,
  Trophy,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface MatchHistoryProps {
  open: boolean;
  onClose: () => void;
  userCode: string;
  language: Language;
}

const PAGE_SIZE = 10;

export default function MatchHistory({
  open,
  onClose,
  userCode,
  language,
}: MatchHistoryProps) {
  const t = getTranslations(language);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [stats, setStats] = useState<{
    totalGames: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
    totalXPGained: number;
    totalJetonsGained: number;
  } | null>(null);
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!userCode) return;
    setIsLoading(true);
    try {
      const [matchData, statsData] = await Promise.all([
        offlineStorage.getMatchHistory(userCode, 200),
        offlineStorage.getMatchStats(userCode),
      ]);
      setMatches(matchData);
      setStats(statsData);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [userCode]);

  useEffect(() => {
    if (open) {
      setDisplayCount(PAGE_SIZE);
      loadData();
    }
  }, [open, loadData]);

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString(language === "tr" ? "tr-TR" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const getResultBadge = (result: MatchRecord["result"]) => {
    switch (result) {
      case "win":
        return (
          <Badge className="bg-green-500/20 text-green-400 border-2 border-green-500/50 font-bold text-xs">
            {t.matchWin}
          </Badge>
        );
      case "loss":
        return (
          <Badge className="bg-red-500/20 text-red-400 border-2 border-red-500/50 font-bold text-xs">
            {t.matchLoss}
          </Badge>
        );
      case "draw":
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-2 border-yellow-500/50 font-bold text-xs">
            {t.matchDraw}
          </Badge>
        );
    }
  };

  const getModeIcon = (mode: MatchRecord["gameMode"]) => {
    switch (mode) {
      case "ai":
        return <Bot className="w-3 h-3" />;
      case "random":
        return <Users className="w-3 h-3" />;
      case "friend":
        return <UserPlus className="w-3 h-3" />;
    }
  };

  const visibleMatches = matches.slice(0, displayCount);
  const hasMore = displayCount < matches.length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        data-ocid="match-history.dialog"
        className="border-4 border-primary/40 solid-overlay w-full max-w-lg mx-auto max-h-[90vh] overflow-hidden flex flex-col"
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-2xl font-bold gradient-text-primary flex items-center gap-2">
            <History className="w-6 h-6 text-blue-400" />
            {t.matchHistory}
          </DialogTitle>
        </DialogHeader>

        {/* Stats Summary */}
        {stats && (
          <div className="flex-shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
            <div className="p-2 rounded-lg border-2 border-primary/20 bg-primary/5 text-center">
              <p className="text-xs text-muted-foreground font-semibold">
                {t.totalGames}
              </p>
              <p className="text-xl font-bold text-foreground">
                {stats.totalGames}
              </p>
            </div>
            <div className="p-2 rounded-lg border-2 border-green-500/30 bg-green-500/5 text-center">
              <p className="text-xs text-muted-foreground font-semibold">
                {t.winRate}
              </p>
              <p className="text-xl font-bold text-green-400">
                {stats.winRate}%
              </p>
            </div>
            <div className="p-2 rounded-lg border-2 border-purple-500/30 bg-purple-500/5 text-center">
              <p className="text-xs text-muted-foreground font-semibold flex items-center justify-center gap-1">
                <Zap className="w-3 h-3" /> XP
              </p>
              <p
                className={`text-xl font-bold ${stats.totalXPGained >= 0 ? "text-purple-400" : "text-red-400"}`}
              >
                {stats.totalXPGained >= 0 ? "+" : ""}
                {stats.totalXPGained}
              </p>
            </div>
            <div className="p-2 rounded-lg border-2 border-amber-500/30 bg-amber-500/5 text-center">
              <p className="text-xs text-muted-foreground font-semibold flex items-center justify-center gap-1">
                <Coins className="w-3 h-3" /> Jeton
              </p>
              <p
                className={`text-xl font-bold ${stats.totalJetonsGained >= 0 ? "text-amber-400" : "text-red-400"}`}
              >
                {stats.totalJetonsGained >= 0 ? "+" : ""}
                {stats.totalJetonsGained}
              </p>
            </div>
          </div>
        )}

        {/* Win/Loss/Draw Row */}
        {stats && stats.totalGames > 0 && (
          <div className="flex-shrink-0 flex gap-2 mb-2">
            <div className="flex-1 flex items-center gap-1 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
              <Trophy className="w-3 h-3 text-green-400" />
              <span className="text-xs text-muted-foreground">{t.wins}:</span>
              <span className="text-sm font-bold text-green-400">
                {stats.wins}
              </span>
            </div>
            <div className="flex-1 flex items-center gap-1 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <TrendingUp className="w-3 h-3 text-red-400 rotate-180" />
              <span className="text-xs text-muted-foreground">{t.losses}:</span>
              <span className="text-sm font-bold text-red-400">
                {stats.losses}
              </span>
            </div>
            <div className="flex-1 flex items-center gap-1 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <span className="text-xs text-muted-foreground">{t.draws}:</span>
              <span className="text-sm font-bold text-yellow-400">
                {stats.draws}
              </span>
            </div>
          </div>
        )}

        {/* Match List */}
        <ScrollArea className="flex-1 min-h-0">
          {isLoading ? (
            <div
              data-ocid="match-history.loading_state"
              className="text-center py-12"
            >
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            </div>
          ) : matches.length === 0 ? (
            <div
              data-ocid="match-history.empty_state"
              className="text-center py-12 text-muted-foreground"
            >
              <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-semibold">{t.noMatchesYet}</p>
            </div>
          ) : (
            <div className="space-y-2 pr-2">
              {visibleMatches.map((match, index) => (
                <div
                  key={match.id}
                  data-ocid={`match-history.item.${index + 1}`}
                  className="flex items-center gap-3 p-3 rounded-lg border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5 hover:border-primary/40 transition-all duration-200"
                >
                  <div className="flex-shrink-0 flex flex-col items-center gap-1">
                    {getResultBadge(match.result)}
                    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                      {getModeIcon(match.gameMode)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground truncate">
                      {formatDate(match.date)}
                      {match.aiDifficulty && ` · ${match.aiDifficulty}`}
                      {match.opponentName && ` · vs ${match.opponentName}`}
                    </p>
                    <p className="text-xs text-foreground/60 mt-0.5">
                      ⏱ {formatDuration(match.duration)}
                    </p>
                  </div>
                  <div className="flex-shrink-0 flex flex-col items-end gap-1">
                    <span
                      className={`text-xs font-bold ${match.xpGained >= 0 ? "text-purple-400" : "text-red-400"}`}
                    >
                      <Zap className="w-3 h-3 inline mr-0.5" />
                      {match.xpGained >= 0 ? "+" : ""}
                      {match.xpGained} XP
                    </span>
                    <span
                      className={`text-xs font-bold ${match.jetonsGained >= 0 ? "text-amber-400" : "text-red-400"}`}
                    >
                      <Coins className="w-3 h-3 inline mr-0.5" />
                      {match.jetonsGained >= 0 ? "+" : ""}
                      {match.jetonsGained}
                    </span>
                  </div>
                </div>
              ))}

              {hasMore && (
                <Button
                  variant="outline"
                  onClick={() => setDisplayCount((prev) => prev + PAGE_SIZE)}
                  data-ocid="match-history.secondary_button"
                  className="w-full border-2 border-primary/30 hover:bg-primary/10 font-bold gap-2"
                >
                  <ChevronDown className="w-4 h-4" />
                  {t.loadMore}
                </Button>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
