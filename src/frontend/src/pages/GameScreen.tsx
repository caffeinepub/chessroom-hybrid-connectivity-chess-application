import LanguageSelector from "@/components/LanguageSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useInterstitialAd } from "@/hooks/useInterstitialAd";
import { offlineStorage } from "@/lib/offlineStorage";
import { type Language, getTranslations } from "@/lib/translations";
import {
  ArrowLeft,
  Bot,
  Check,
  Copy,
  Crown,
  Flame,
  Sparkles,
  Target,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";
import { useState } from "react";
import type { AIDifficulty, GameMode, UserSession } from "../App";
import ChessBoard from "../components/ChessBoard";

interface GameScreenProps {
  session: UserSession;
  gameMode: GameMode;
  roomCode: string | null;
  aiDifficulty: AIDifficulty | null;
  onExit: () => void;
  language: Language;
  onLanguageChange: (language: Language) => void;
}

type RandomDifficulty = "easy" | "medium" | "hard" | "expert";

// AdMob Interstitial Ad Unit ID
const INTERSTITIAL_AD_UNIT_ID = "ca-app-pub-7936595519986908/4971972028";

export default function GameScreen({
  session,
  gameMode,
  roomCode: initialRoomCode,
  aiDifficulty: initialDifficulty,
  onExit,
  language,
  onLanguageChange,
}: GameScreenProps) {
  const t = getTranslations(language);
  const [roomCode, setRoomCode] = useState(initialRoomCode || "");
  const [generatedCode, setGeneratedCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [gameStarted, setGameStarted] = useState(
    gameMode !== "ai" && gameMode !== "friend" && gameMode !== "random",
  );
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<AIDifficulty | null>(initialDifficulty);

  // Random mode states
  const [randomDifficulty, setRandomDifficulty] =
    useState<RandomDifficulty | null>(null);
  const [randomAction, setRandomAction] = useState<"create" | "join" | null>(
    null,
  );

  // Interstitial ad hook
  const { showAd: showInterstitialAd, isAdLoaded: isInterstitialLoaded } =
    useInterstitialAd(INTERSTITIAL_AD_UNIT_ID);

  const generateRoomCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedCode(code);
    setRoomCode(code);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoinRoom = () => {
    if (joinCode.length === 6) {
      setRoomCode(joinCode);
      setGameStarted(true);
    }
  };

  const handleCreateRoom = () => {
    if (generatedCode) {
      setGameStarted(true);
    }
  };

  const handleDifficultySelect = (difficulty: AIDifficulty) => {
    setSelectedDifficulty(difficulty);
    setGameStarted(true);
  };

  const handleRandomDifficultySelect = (difficulty: RandomDifficulty) => {
    setRandomDifficulty(difficulty);
  };

  const handleRandomActionSelect = (action: "create" | "join") => {
    setRandomAction(action);
    if (action === "create") {
      // Generate room code for random match
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let code = "";
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setGeneratedCode(code);
      setRoomCode(code);
      setGameStarted(true);
    }
  };

  const handleBackFromRandomAction = () => {
    setRandomAction(null);
  };

  const handleBackFromRandomDifficulty = () => {
    setRandomDifficulty(null);
    setRandomAction(null);
  };

  const handleJoinRandomGame = (roomCode: string) => {
    setRoomCode(roomCode);
    setGameStarted(true);
  };

  const handleExitGame = () => {
    // Show interstitial ad when exiting game
    if (gameStarted && isInterstitialLoaded) {
      showInterstitialAd();
    }
    onExit();
  };

  const handleGameEnd = () => {
    // Show interstitial ad when game ends
    if (isInterstitialLoaded) {
      showInterstitialAd();
    }
  };

  // Title thresholds for XP-based progression
  const getTitleFromXP = (xp: number): string => {
    if (xp >= 6000) return "Büyükusta";
    if (xp >= 3000) return "Usta";
    if (xp >= 1500) return "Uzman";
    if (xp >= 700) return "İleri";
    if (xp >= 300) return "Orta";
    if (xp >= 100) return "Amatör";
    return "Başlangıç";
  };

  // Feature 4: Match end handler - save to history and update user stats
  const handleMatchEnd = async (
    result: "win" | "loss" | "draw",
    xpGained: number,
    jetonsGained: number,
    duration: number,
  ) => {
    try {
      await offlineStorage.saveMatch(session.code, {
        date: Date.now(),
        gameMode: gameMode as "ai" | "random" | "friend",
        aiDifficulty: selectedDifficulty ?? undefined,
        result,
        xpGained,
        jetonsGained,
        duration,
        userCode: session.code,
      });
      // Also add weekly XP
      if (xpGained > 0) {
        await offlineStorage.addWeeklyXP(session.code, xpGained);
      }
      // Update user XP, jetons, and title
      const currentUser = await offlineStorage.getUserByCode(session.code);
      if (currentUser) {
        const newXp = currentUser.xp + xpGained;
        const newJetons = currentUser.jetons + jetonsGained;
        const newTitle = getTitleFromXP(newXp);
        await offlineStorage.updateUser(session.code, {
          xp: newXp,
          jetons: newJetons,
          title: newTitle,
        });
      }
    } catch {
      // ignore
    }
  };

  const getModeTitle = () => {
    switch (gameMode) {
      case "ai":
        return t.playAgainstAI;
      case "random":
        return t.randomRooms;
      case "friend":
        return t.playWithFriend;
      default:
        return "";
    }
  };

  const getModeIcon = () => {
    switch (gameMode) {
      case "ai":
        return <Bot className="w-6 h-6" />;
      case "random":
        return <Users className="w-6 h-6" />;
      case "friend":
        return <UserPlus className="w-6 h-6" />;
      default:
        return null;
    }
  };

  const getModeColor = () => {
    switch (gameMode) {
      case "ai":
        return "from-blue-500 to-purple-600";
      case "random":
        return "from-purple-500 to-pink-600";
      case "friend":
        return "from-pink-500 to-orange-600";
      default:
        return "from-primary to-secondary";
    }
  };

  const difficultyConfig = {
    easy: {
      icon: Zap,
      emoji: "🟢",
      title: t.difficultyEasy,
      subtitle: t.difficultyEasySubtitle,
      description: t.difficultyEasyDesc,
      color: "from-green-500 to-green-600",
      borderColor: "border-green-500/70",
      bgColor: "bg-green-500/20",
      hoverBg: "hover:bg-green-500/30",
    },
    medium: {
      icon: Target,
      emoji: "🔵",
      title: t.difficultyMedium,
      subtitle: t.difficultyMediumSubtitle,
      description: t.difficultyMediumDesc,
      color: "from-blue-500 to-blue-600",
      borderColor: "border-blue-500/70",
      bgColor: "bg-blue-500/20",
      hoverBg: "hover:bg-blue-500/30",
    },
    hard: {
      icon: Flame,
      emoji: "🟠",
      title: t.difficultyHard,
      subtitle: t.difficultyHardSubtitle,
      description: t.difficultyHardDesc,
      color: "from-orange-500 to-orange-600",
      borderColor: "border-orange-500/70",
      bgColor: "bg-orange-500/20",
      hoverBg: "hover:bg-orange-500/30",
    },
    expert: {
      icon: Crown,
      emoji: "🔴",
      title: t.difficultyExpert,
      subtitle: t.difficultyExpertSubtitle,
      description: t.difficultyExpertDesc,
      color: "from-red-500 to-red-600",
      borderColor: "border-red-500/70",
      bgColor: "bg-red-500/20",
      hoverBg: "hover:bg-red-500/30",
    },
  };

  // Mock available games for random mode (will be replaced with backend data)
  const mockAvailableGames = [
    { roomCode: "ABC123", playerName: "Player1", waitTime: "2m" },
    { roomCode: "XYZ789", playerName: "Player2", waitTime: "5m" },
    { roomCode: "DEF456", playerName: "Player3", waitTime: "1m" },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Vibrant animated gradient background */}
      <div className="absolute inset-0 vibrant-gradient-bg-blue-gold" />

      {/* Header */}
      <header className="border-b-4 border-white/20 solid-overlay backdrop-blur-md sticky top-0 z-50 shadow-2xl">
        <div className="container mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleExitGame}
                className="hover:bg-primary/20 transition-all duration-300 border-2 border-primary/30 hover:scale-110"
              >
                <ArrowLeft className="w-6 h-6" />
              </Button>
              <div className="relative">
                <img
                  src="/assets/generated/chessroom-logo-transparent.dim_200x200.png"
                  alt="ChessRoom"
                  className="w-14 h-14 object-contain drop-shadow-2xl animate-glow"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold gradient-text-gold">
                  {t.appName}
                </h1>
                <p className="text-base text-white font-bold flex items-center gap-2 drop-shadow-lg">
                  {getModeIcon()}
                  <span
                    className={`bg-gradient-to-r ${getModeColor()} bg-clip-text text-transparent`}
                  >
                    {getModeTitle()}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSelector
                currentLanguage={language}
                onLanguageChange={onLanguageChange}
              />
              <Badge
                variant="outline"
                className="text-base px-5 py-3 border-4 border-primary/50 bg-gradient-to-r from-primary/20 to-secondary/20 font-bold"
              >
                {session.username}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* AI Difficulty Selection */}
          {!gameStarted && gameMode === "ai" && (
            <Card className="border-4 glow-border-animated shadow-2xl solid-overlay mb-8 hover-glow">
              <CardHeader>
                <CardTitle
                  className={`text-4xl text-center font-bold bg-gradient-to-r ${getModeColor()} bg-clip-text text-transparent mb-3`}
                >
                  {t.selectDifficulty}
                </CardTitle>
                <p className="text-center text-foreground text-lg font-bold">
                  {t.selectDifficultyDesc}
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(Object.keys(difficultyConfig) as AIDifficulty[]).map(
                    (difficulty) => {
                      const config = difficultyConfig[difficulty];
                      const Icon = config.icon;

                      return (
                        <Card
                          key={difficulty}
                          className={`
                          border-4 ${config.borderColor} ${config.bgColor} 
                          cursor-pointer transition-all duration-300 
                          hover:shadow-2xl hover:scale-105 ${config.hoverBg}
                          group relative overflow-hidden
                        `}
                          onClick={() => handleDifficultySelect(difficulty)}
                        >
                          <div
                            className={`absolute inset-0 bg-gradient-to-br ${config.color} opacity-0 group-hover:opacity-20 transition-opacity duration-300`}
                          />
                          <CardHeader className="relative">
                            <div className="flex items-start gap-4">
                              <div
                                className={`w-20 h-20 rounded-full bg-gradient-to-br ${config.color} flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300 animate-border-glow`}
                              >
                                <Icon className="w-10 h-10 text-white" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <span className="text-3xl">
                                    {config.emoji}
                                  </span>
                                  <h3
                                    className={`text-2xl font-bold bg-gradient-to-r ${config.color} bg-clip-text text-transparent`}
                                  >
                                    {config.title}
                                  </h3>
                                </div>
                                <p className="text-base font-bold text-foreground mb-3">
                                  {config.subtitle}
                                </p>
                                <p className="text-base text-foreground font-semibold">
                                  {config.description}
                                </p>
                              </div>
                            </div>
                          </CardHeader>
                        </Card>
                      );
                    },
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Random Mode - Difficulty Category Selection */}
          {!gameStarted && gameMode === "random" && !randomDifficulty && (
            <Card className="border-4 glow-border-animated shadow-2xl solid-overlay mb-8 hover-glow">
              <CardHeader>
                <CardTitle
                  className={`text-4xl text-center font-bold bg-gradient-to-r ${getModeColor()} bg-clip-text text-transparent mb-3`}
                >
                  {t.randomSelectCategory}
                </CardTitle>
                <p className="text-center text-foreground text-lg font-bold">
                  {t.randomSelectCategoryDesc}
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(Object.keys(difficultyConfig) as RandomDifficulty[]).map(
                    (difficulty) => {
                      const config = difficultyConfig[difficulty];
                      const Icon = config.icon;

                      return (
                        <Card
                          key={difficulty}
                          className={`
                          border-4 ${config.borderColor} ${config.bgColor} 
                          cursor-pointer transition-all duration-300 
                          hover:shadow-2xl hover:scale-105 ${config.hoverBg}
                          group relative overflow-hidden
                        `}
                          onClick={() =>
                            handleRandomDifficultySelect(difficulty)
                          }
                        >
                          <div
                            className={`absolute inset-0 bg-gradient-to-br ${config.color} opacity-0 group-hover:opacity-20 transition-opacity duration-300`}
                          />
                          <CardHeader className="relative">
                            <div className="flex items-start gap-4">
                              <div
                                className={`w-20 h-20 rounded-full bg-gradient-to-br ${config.color} flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300 animate-border-glow`}
                              >
                                <Icon className="w-10 h-10 text-white" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <span className="text-3xl">
                                    {config.emoji}
                                  </span>
                                  <h3
                                    className={`text-2xl font-bold bg-gradient-to-r ${config.color} bg-clip-text text-transparent`}
                                  >
                                    {config.title}
                                  </h3>
                                </div>
                                <p className="text-base font-bold text-foreground">
                                  {config.subtitle}
                                </p>
                              </div>
                            </div>
                          </CardHeader>
                        </Card>
                      );
                    },
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Random Mode - Create or Join Selection */}
          {!gameStarted &&
            gameMode === "random" &&
            randomDifficulty &&
            !randomAction && (
              <Card className="border-4 glow-border-animated shadow-2xl solid-overlay mb-8 hover-glow">
                <CardHeader>
                  <div className="flex items-center gap-4 mb-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleBackFromRandomDifficulty}
                      className="hover:bg-primary/20 transition-all duration-300 border-2 border-primary/30"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">
                        {difficultyConfig[randomDifficulty].emoji}
                      </span>
                      <CardTitle
                        className={`text-3xl font-bold bg-gradient-to-r ${difficultyConfig[randomDifficulty].color} bg-clip-text text-transparent`}
                      >
                        {difficultyConfig[randomDifficulty].title}
                      </CardTitle>
                    </div>
                  </div>
                  <p className="text-center text-foreground text-lg font-bold">
                    {t.randomChooseAction}
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Create New Game */}
                    <Card
                      className="border-4 border-green-500/70 bg-green-500/20 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-105 hover:bg-green-500/30 group relative overflow-hidden"
                      onClick={() => handleRandomActionSelect("create")}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-green-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
                      <CardHeader className="relative">
                        <div className="text-center space-y-4">
                          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-2xl mx-auto group-hover:scale-110 transition-transform duration-300">
                            <Sparkles className="w-12 h-12 text-white" />
                          </div>
                          <h3 className="text-2xl font-bold bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent">
                            {t.randomCreateGame}
                          </h3>
                          <p className="text-base text-foreground font-semibold">
                            {t.randomCreateGameDesc}
                          </p>
                        </div>
                      </CardHeader>
                    </Card>

                    {/* Join Game */}
                    <Card
                      className="border-4 border-blue-500/70 bg-blue-500/20 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-105 hover:bg-blue-500/30 group relative overflow-hidden"
                      onClick={() => handleRandomActionSelect("join")}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
                      <CardHeader className="relative">
                        <div className="text-center space-y-4">
                          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-2xl mx-auto group-hover:scale-110 transition-transform duration-300">
                            <Users className="w-12 h-12 text-white" />
                          </div>
                          <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
                            {t.randomJoinGame}
                          </h3>
                          <p className="text-base text-foreground font-semibold">
                            {t.randomJoinGameDesc}
                          </p>
                        </div>
                      </CardHeader>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Random Mode - Join Game List */}
          {!gameStarted &&
            gameMode === "random" &&
            randomDifficulty &&
            randomAction === "join" && (
              <Card className="border-4 glow-border-animated shadow-2xl solid-overlay mb-8 hover-glow">
                <CardHeader>
                  <div className="flex items-center gap-4 mb-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleBackFromRandomAction}
                      className="hover:bg-primary/20 transition-all duration-300 border-2 border-primary/30"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">
                        {difficultyConfig[randomDifficulty].emoji}
                      </span>
                      <CardTitle
                        className={`text-3xl font-bold bg-gradient-to-r ${difficultyConfig[randomDifficulty].color} bg-clip-text text-transparent`}
                      >
                        {t.randomAvailableGames}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {mockAvailableGames.map((game) => (
                    <Card
                      key={game.roomCode}
                      className="border-4 border-primary/50 bg-gradient-to-r from-primary/10 to-secondary/10 cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-102 hover:border-primary/70"
                      onClick={() => handleJoinRandomGame(game.roomCode)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
                              <Users className="w-8 h-8 text-white" />
                            </div>
                            <div>
                              <h4 className="text-xl font-bold text-foreground">
                                {game.playerName}
                              </h4>
                              <p className="text-base text-foreground/70 font-semibold">
                                {t.room}: {game.roomCode}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge
                              variant="outline"
                              className="text-base px-4 py-2 border-2 font-bold"
                            >
                              {game.waitTime}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            )}

          {/* Friend Mode Room Setup */}
          {!gameStarted && gameMode === "friend" && (
            <Card className="border-4 glow-border-animated shadow-2xl solid-overlay mb-8 hover-glow">
              <CardHeader>
                <CardTitle
                  className={`text-3xl font-bold bg-gradient-to-r ${getModeColor()} bg-clip-text text-transparent`}
                >
                  {t.roomSetup}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Create Room */}
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-foreground">
                    {t.createRoom}
                  </h3>
                  <div className="flex gap-3 flex-wrap">
                    <Button
                      onClick={generateRoomCode}
                      className="btn-gradient-secondary text-white shadow-xl font-bold text-base"
                    >
                      {t.generateCode}
                    </Button>
                    {generatedCode && (
                      <>
                        <Badge
                          variant="outline"
                          className="text-2xl font-mono tracking-wider px-6 py-4 border-4 bg-gradient-to-r from-accent/20 to-accent/10 border-accent/50 font-bold"
                        >
                          {generatedCode}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleCopyCode}
                          className="hover:bg-accent/20 border-2 border-accent/30 hover:scale-110"
                        >
                          {copied ? (
                            <Check className="w-6 h-6 text-green-500" />
                          ) : (
                            <Copy className="w-6 h-6 text-accent" />
                          )}
                        </Button>
                        <Button
                          onClick={handleCreateRoom}
                          className="btn-gradient-primary text-white shadow-xl font-bold text-base"
                        >
                          {t.startRoom}
                        </Button>
                      </>
                    )}
                  </div>
                  {generatedCode && (
                    <p className="text-base text-foreground font-semibold">
                      {t.shareCodeWithFriend}
                    </p>
                  )}
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t-2 border-primary/30" />
                  </div>
                  <div className="relative flex justify-center text-sm uppercase">
                    <span className="solid-overlay px-3 text-foreground font-bold">
                      {t.or}
                    </span>
                  </div>
                </div>

                {/* Join Room */}
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-foreground">
                    {t.joinRoom}
                  </h3>
                  <div className="flex gap-3">
                    <Input
                      placeholder={t.enterRoomCode}
                      value={joinCode}
                      onChange={(e) =>
                        setJoinCode(e.target.value.toUpperCase())
                      }
                      maxLength={6}
                      className="font-mono text-xl tracking-wider border-4 h-14 bg-white dark:bg-gray-900 text-foreground font-bold"
                    />
                    <Button
                      onClick={handleJoinRoom}
                      disabled={joinCode.length !== 6}
                      className="btn-gradient-primary text-white shadow-xl font-bold text-base"
                    >
                      {t.join}
                    </Button>
                  </div>
                  <p className="text-base text-foreground font-semibold">
                    {t.enterFriendCode}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {gameStarted && (
            <ChessBoard
              gameMode={gameMode}
              roomCode={roomCode}
              playerName={session.username}
              aiDifficulty={selectedDifficulty || "medium"}
              language={language}
              onGameEnd={handleGameEnd}
              onMatchEnd={handleMatchEnd}
            />
          )}
        </div>
      </main>
    </div>
  );
}
