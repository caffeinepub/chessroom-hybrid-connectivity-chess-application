import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useEffect, useState } from "react";
import { useActor } from "./hooks/useActor";
import {
  setNetworkStatusLanguage,
  useNetworkStatus,
} from "./hooks/useNetworkStatus";
import { hybridStorage } from "./lib/hybridStorage";
import { offlineStorage } from "./lib/offlineStorage";
import {
  type Language,
  detectBrowserLanguage,
  getTranslations,
  isRTL,
} from "./lib/translations";
import AdminDashboard from "./pages/AdminDashboard";
import EntryScreen from "./pages/EntryScreen";
import GameScreen from "./pages/GameScreen";
import MainScreen from "./pages/MainScreen";

export type UserSession = {
  username: string;
  code: string;
  isAdmin: boolean;
};

export type GameMode = "ai" | "random" | "friend" | null;

export type AIDifficulty = "easy" | "medium" | "hard" | "expert";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AppContent() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [gameMode, setGameMode] = useState<GameMode>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty | null>(null);
  const [language, setLanguage] = useState<Language>("tr");

  const { isOnline } = useNetworkStatus();
  const { actor } = useActor();

  // Initialize offline storage and check for existing session
  useEffect(() => {
    const initApp = async () => {
      try {
        await offlineStorage.init();

        // Check for existing session
        const currentSession = await offlineStorage.getCurrentSession();
        if (currentSession) {
          setSession({
            username: currentSession.username,
            code: currentSession.code,
            isAdmin: currentSession.isAdmin,
          });
        }
      } catch (error) {
        console.error("Failed to initialize app:", error);
      }
    };

    initApp();
  }, []);

  // Load language preference from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem("chessroom_language");
    if (
      savedLanguage &&
      [
        "tr",
        "en",
        "zh-CN",
        "es",
        "hi",
        "ar",
        "pt",
        "fr",
        "ru",
        "ja",
        "de",
      ].includes(savedLanguage)
    ) {
      setLanguage(savedLanguage as Language);
    } else {
      const detectedLang = detectBrowserLanguage();
      setLanguage(detectedLang);
      localStorage.setItem("chessroom_language", detectedLang);
    }
    setIsLoading(false);
  }, []);

  // Save language to localStorage and update document direction
  useEffect(() => {
    localStorage.setItem("chessroom_language", language);
    document.documentElement.dir = isRTL(language) ? "rtl" : "ltr";
    document.documentElement.lang = language;
    setNetworkStatusLanguage(language);
  }, [language]);

  // Sync data when coming back online
  useEffect(() => {
    if (isOnline && actor) {
      hybridStorage.syncUserData(actor, isOnline).catch((error) => {
        console.error("Failed to sync data:", error);
      });
    }
  }, [isOnline, actor]);

  const handleLogin = async (user: UserSession) => {
    setSession(user);
    // Save session to offline storage
    await offlineStorage.saveCurrentSession(
      user.username,
      user.code,
      user.isAdmin,
    );
  };

  const handleLogout = async () => {
    setSession(null);
    setGameMode(null);
    setRoomCode(null);
    setAiDifficulty(null);
    queryClient.clear();
    // Clear session from offline storage
    await offlineStorage.clearCurrentSession();
  };

  const handleStartGame = (
    mode: GameMode,
    code?: string,
    difficulty?: AIDifficulty,
  ) => {
    setGameMode(mode);
    if (code) {
      setRoomCode(code);
    }
    if (difficulty) {
      setAiDifficulty(difficulty);
    }
  };

  const handleExitGame = () => {
    setGameMode(null);
    setRoomCode(null);
    setAiDifficulty(null);
  };

  const handleLanguageChange = (newLanguage: Language) => {
    setLanguage(newLanguage);
  };

  const t = getTranslations(language);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">{t.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {!session ? (
        <EntryScreen
          onLogin={handleLogin}
          language={language}
          onLanguageChange={handleLanguageChange}
        />
      ) : session.isAdmin ? (
        <AdminDashboard
          session={session}
          onLogout={handleLogout}
          language={language}
          onLanguageChange={handleLanguageChange}
        />
      ) : gameMode ? (
        <GameScreen
          session={session}
          gameMode={gameMode}
          roomCode={roomCode}
          aiDifficulty={aiDifficulty}
          onExit={handleExitGame}
          language={language}
          onLanguageChange={handleLanguageChange}
        />
      ) : (
        <MainScreen
          session={session}
          onLogout={handleLogout}
          onStartGame={handleStartGame}
          language={language}
          onLanguageChange={handleLanguageChange}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <AppContent />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
