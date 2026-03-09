import LanguageSelector from "@/components/LanguageSelector";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { offlineStorage } from "@/lib/offlineStorage";
import { type Language, getTranslations } from "@/lib/translations";
import {
  AlertCircle,
  Check,
  Copy,
  Crown,
  Loader2,
  LogIn,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { UserSession } from "../App";

interface EntryScreenProps {
  onLogin: (user: UserSession) => void;
  language: Language;
  onLanguageChange: (language: Language) => void;
}

type RegisteredUser = {
  username: string;
  code: string;
};

export default function EntryScreen({
  onLogin,
  language,
  onLanguageChange,
}: EntryScreenProps) {
  const t = getTranslations(language);
  const [registerUsername, setRegisterUsername] = useState("");
  const [loginCode, setLoginCode] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registeredUser, setRegisteredUser] = useState<RegisteredUser | null>(
    null,
  );
  const [codeCopied, setCodeCopied] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [assetsLoaded, setAssetsLoaded] = useState(false);

  // Defer asset loading until after initial render
  useEffect(() => {
    const timer = setTimeout(() => {
      setAssetsLoaded(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const formatLoginCode = (value: string): string => {
    const cleaned = value.replace(/\s/g, "");
    let formatted = "";
    for (let i = 0; i < cleaned.length && i < 8; i++) {
      if (i === 4) {
        formatted += " ";
      }
      formatted += cleaned[i];
    }
    return formatted;
  };

  const handleLoginCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = formatLoginCode(value);
    setLoginCode(formatted);
    setLoginError(null);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerUsername.trim()) {
      setRegisterError(t.usernameEmpty);
      return;
    }

    setRegisterError(null);
    setIsRegistering(true);

    try {
      const user = await offlineStorage.registerUser(registerUsername.trim());
      setRegisteredUser({
        username: user.username,
        code: user.code,
      });
      setRegisterUsername("");
    } catch (error: any) {
      console.error("Registration error:", error);
      setRegisterError(error.message || t.registrationFailed);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleContinueAfterRegistration = () => {
    if (registeredUser) {
      const isAdmin = registeredUser.code === "KING +154";
      onLogin({
        username: registeredUser.username,
        code: registeredUser.code,
        isAdmin,
      });
    }
  };

  const handleCopyCode = () => {
    if (registeredUser) {
      navigator.clipboard.writeText(registeredUser.code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginCode.trim()) {
      setLoginError(t.enterCode);
      return;
    }

    setLoginError(null);
    setIsLoggingIn(true);

    try {
      const username = await offlineStorage.loginUser(loginCode.trim());
      const isAdmin = loginCode.trim() === "KING +154";

      onLogin({
        username,
        code: loginCode.trim(),
        isAdmin,
      });
    } catch (error: any) {
      console.error("Login error:", error);
      setLoginError(error.message || t.loginFailed);
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (registeredUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600" />

        {/* Lightweight decorative elements - loaded after initial render */}
        {assetsLoaded && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-0 animate-fade-in">
            <div className="absolute top-[10%] left-[5%] opacity-5">
              <img
                src="/assets/generated/chess-pieces.dim_400x400.png"
                alt=""
                className="w-32 h-32 object-contain"
                loading="lazy"
              />
            </div>
            <div className="absolute bottom-[15%] right-[8%] opacity-5">
              <img
                src="/assets/generated/chessroom-logo-transparent.dim_200x200.png"
                alt=""
                className="w-28 h-28 object-contain"
                loading="lazy"
              />
            </div>
          </div>
        )}

        <div className="absolute top-4 right-4 z-50">
          <LanguageSelector
            currentLanguage={language}
            onLanguageChange={onLanguageChange}
          />
        </div>

        <div className="w-full max-w-md space-y-8 relative z-10">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="relative">
                <img
                  src="/assets/generated/chessroom-logo-transparent.dim_200x200.png"
                  alt="ChessRoom Logo"
                  className="w-32 h-32 object-contain drop-shadow-2xl"
                />
              </div>
            </div>
          </div>

          <Card className="border-2 shadow-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                  <Check className="w-10 h-10 text-white" />
                </div>
              </div>
              <CardTitle className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {t.registrationSuccess}
              </CardTitle>
              <CardDescription className="text-lg mt-2 font-semibold text-foreground">
                {t.registrationSuccessSubtitle}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="text-lg font-bold text-foreground">
                  {t.yourUsername}
                </Label>
                <div className="p-5 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl border-2 border-purple-300 dark:border-purple-700 shadow-lg">
                  <p className="text-2xl font-bold text-center text-foreground">
                    {registeredUser.username}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-lg font-bold text-foreground">
                  {t.yourLoginCode}
                </Label>
                <div className="p-8 bg-gradient-to-br from-amber-100 via-yellow-100 to-orange-100 dark:from-amber-900/30 dark:via-yellow-900/30 dark:to-orange-900/30 rounded-xl border-2 border-amber-400 dark:border-amber-600 shadow-xl">
                  <p className="text-4xl font-mono font-bold text-center tracking-widest bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                    {registeredUser.code}
                  </p>
                </div>
                <Button
                  onClick={handleCopyCode}
                  variant="outline"
                  className="w-full border-2 hover:bg-accent/20 transition-all duration-300 text-lg font-bold"
                  size="lg"
                >
                  {codeCopied ? (
                    <>
                      <Check className="w-6 h-6 mr-2 text-green-500" />
                      {t.copied}
                    </>
                  ) : (
                    <>
                      <Copy className="w-6 h-6 mr-2" />
                      {t.copyCode}
                    </>
                  )}
                </Button>
              </div>

              <Alert className="border-2 border-amber-500 bg-amber-50 dark:bg-amber-900/20">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <AlertDescription className="text-foreground font-bold text-base">
                  {t.saveCodeWarning}
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleContinueAfterRegistration}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-xl transition-all duration-300 text-lg font-bold py-6"
                size="lg"
              >
                <Sparkles className="w-6 h-6 mr-2" />
                {t.continue}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Lightweight gradient background - instant render */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600" />

      {/* Decorative elements - loaded asynchronously after initial render */}
      {assetsLoaded && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-0 animate-fade-in">
          <div className="absolute top-[8%] left-[3%] opacity-5">
            <img
              src="/assets/generated/chess-pieces.dim_400x400.png"
              alt=""
              className="w-48 h-48 md:w-64 md:h-64 object-contain"
              loading="lazy"
            />
          </div>
          <div className="absolute top-[15%] right-[5%] opacity-5">
            <img
              src="/assets/generated/white-chess-pieces-set.dim_400x400.png"
              alt=""
              className="w-40 h-40 md:w-56 md:h-56 object-contain"
              loading="lazy"
            />
          </div>
          <div className="absolute bottom-[10%] left-[8%] opacity-5">
            <img
              src="/assets/generated/black-chess-pieces-set.dim_400x400.png"
              alt=""
              className="w-44 h-44 md:w-60 md:h-60 object-contain"
              loading="lazy"
            />
          </div>
        </div>
      )}

      <div className="absolute top-4 right-4 z-50">
        <LanguageSelector
          currentLanguage={language}
          onLanguageChange={onLanguageChange}
        />
      </div>

      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <img
                src="/assets/generated/chessroom-logo-transparent.dim_200x200.png"
                alt="ChessRoom Logo"
                className="w-32 h-32 object-contain drop-shadow-2xl"
              />
            </div>
          </div>
          <div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight flex items-center justify-center gap-3 text-white drop-shadow-2xl">
              <Crown className="w-10 h-10 md:w-12 md:h-12 text-amber-400 drop-shadow-lg" />
              {t.appName}
            </h1>
            <p className="text-white mt-4 text-lg md:text-xl flex items-center justify-center gap-2 font-bold drop-shadow-lg px-4">
              <Sparkles className="w-5 h-5 text-amber-300" />
              {t.appTagline}
              <Sparkles className="w-5 h-5 text-amber-300" />
            </p>
          </div>
        </div>

        <Card className="border-2 shadow-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 p-1">
              <TabsTrigger
                value="login"
                className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white transition-all duration-300 font-bold text-base"
              >
                <LogIn className="w-5 h-5" />
                {t.login}
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all duration-300 font-bold text-base"
              >
                <UserPlus className="w-5 h-5" />
                {t.register}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <CardHeader>
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {t.loginTitle}
                </CardTitle>
                <CardDescription className="text-lg font-semibold text-foreground">
                  {t.loginDescription}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-5">
                  {loginError && (
                    <Alert variant="destructive" className="border-2">
                      <AlertCircle className="h-5 w-5" />
                      <AlertDescription className="font-bold">
                        {loginError}
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-3">
                    <Label
                      htmlFor="login-code"
                      className="text-lg font-bold text-foreground"
                    >
                      {t.loginCode}
                    </Label>
                    <Input
                      id="login-code"
                      placeholder={t.loginCodePlaceholder}
                      value={loginCode}
                      onChange={handleLoginCodeChange}
                      className="text-center text-xl tracking-widest font-mono h-14 border-2 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/30 transition-all duration-300 bg-white dark:bg-gray-900 text-foreground font-bold"
                      disabled={isLoggingIn}
                      maxLength={9}
                    />
                    <p className="text-sm text-foreground text-center font-semibold">
                      {t.loginCodeHint}
                    </p>
                    <p className="text-xs text-muted-foreground text-center mt-1">
                      {t.codeLostMessage}
                    </p>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-xl transition-all duration-300 text-lg font-bold py-6"
                    size="lg"
                    disabled={isLoggingIn || !loginCode.trim()}
                  >
                    {isLoggingIn ? (
                      <>
                        <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                        {t.loggingIn}
                      </>
                    ) : (
                      <>
                        <LogIn className="w-6 h-6 mr-2" />
                        {t.loginButton}
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>

            <TabsContent value="register">
              <CardHeader>
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {t.registerTitle}
                </CardTitle>
                <CardDescription className="text-lg font-semibold text-foreground">
                  {t.registerDescription}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegister} className="space-y-5">
                  {registerError && (
                    <Alert variant="destructive" className="border-2">
                      <AlertCircle className="h-5 w-5" />
                      <AlertDescription className="font-bold">
                        {registerError}
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-3">
                    <Label
                      htmlFor="username"
                      className="text-lg font-bold text-foreground"
                    >
                      {t.username}
                    </Label>
                    <Input
                      id="username"
                      placeholder={t.usernamePlaceholder}
                      value={registerUsername}
                      onChange={(e) => {
                        setRegisterUsername(e.target.value);
                        setRegisterError(null);
                      }}
                      className="h-14 border-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/30 transition-all duration-300 text-lg bg-white dark:bg-gray-900 text-foreground font-semibold"
                      disabled={isRegistering}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-xl transition-all duration-300 text-lg font-bold py-6"
                    size="lg"
                    disabled={isRegistering || !registerUsername.trim()}
                  >
                    {isRegistering ? (
                      <>
                        <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                        {t.registering}
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-6 h-6 mr-2" />
                        {t.registerButton}
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
