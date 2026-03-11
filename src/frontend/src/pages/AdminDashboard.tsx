import LanguageSelector from "@/components/LanguageSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import {
  useGetAllUsers,
  useGiftJetonsToAllUsers,
  useSendJetonsToUser,
} from "@/hooks/useQueries";
import { offlineStorage } from "@/lib/offlineStorage";
import { type Language, getTranslations } from "@/lib/translations";
import { useQuery } from "@tanstack/react-query";
import {
  Ban,
  Coins,
  Crown,
  Gift,
  Loader2,
  LogOut,
  Megaphone,
  Search,
  Send,
  TrendingUp,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { UserSession } from "../App";

interface AdminDashboardProps {
  session: UserSession;
  onLogout: () => void;
  language: Language;
  onLanguageChange: (language: Language) => void;
}

export default function AdminDashboard({
  session,
  onLogout,
  language,
  onLanguageChange,
}: AdminDashboardProps) {
  const t = getTranslations(language);

  // Fetch all users
  const { data: users = [], isLoading: usersLoading } = useGetAllUsers();

  // Fetch system statistics
  const { data: stats } = useQuery({
    queryKey: ["systemStats"],
    queryFn: async () => {
      return await offlineStorage.getSystemStats();
    },
    refetchInterval: 10000,
  });

  // Mutations
  const sendJetonsMutation = useSendJetonsToUser();
  const giftJetonsMutation = useGiftJetonsToAllUsers();

  // Bulk jeton distribution state
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkAmount, setBulkAmount] = useState("");
  const [bulkMessage, setBulkMessage] = useState("");

  // Individual jeton distribution state
  const [individualModalOpen, setIndividualModalOpen] = useState(false);
  const [targetUsername, setTargetUsername] = useState("");
  const [individualAmount, setIndividualAmount] = useState("");
  const [individualMessage, setIndividualMessage] = useState("");

  // Global announcement state
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
  const [announcementMessage, setAnnouncementMessage] = useState("");

  // Ban management state
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [banSearchQuery, setBanSearchQuery] = useState("");
  const [banSearchResults, setBanSearchResults] = useState<
    import("@/lib/offlineStorage").User[]
  >([]);
  const [banLoading, setBanLoading] = useState(false);

  const handleBulkDistribution = async () => {
    const amount = Number.parseInt(bulkAmount);
    // biome-ignore lint/suspicious/noGlobalIsNan: acceptable here
    if (isNaN(amount) || amount <= 0) {
      toast.error("Geçersiz jeton miktarı");
      return;
    }

    try {
      await giftJetonsMutation.mutateAsync({
        amount,
        message: bulkMessage || null,
      });
      toast.success(`Tüm kullanıcılara ${amount} jeton gönderildi`);
      setBulkModalOpen(false);
      setBulkAmount("");
      setBulkMessage("");
    } catch (error: any) {
      toast.error(error.message || "İşlem başarısız oldu");
    }
  };

  const handleIndividualDistribution = async () => {
    const amount = Number.parseInt(individualAmount);
    // biome-ignore lint/suspicious/noGlobalIsNan: acceptable here
    if (isNaN(amount) || amount <= 0) {
      toast.error("Geçersiz jeton miktarı");
      return;
    }

    if (!targetUsername.trim()) {
      toast.error("Kullanıcı adı gerekli");
      return;
    }

    try {
      await sendJetonsMutation.mutateAsync({
        username: targetUsername.trim(),
        amount,
        message: individualMessage || null,
      });
      toast.success(
        `${targetUsername} kullanıcısına ${amount} jeton gönderildi`,
      );
      setIndividualModalOpen(false);
      setTargetUsername("");
      setIndividualAmount("");
      setIndividualMessage("");
    } catch (error: any) {
      toast.error(error.message || "İşlem başarısız oldu");
    }
  };

  const handleGlobalAnnouncement = async () => {
    if (!announcementMessage.trim()) {
      toast.error("Mesaj gerekli");
      return;
    }

    try {
      await offlineStorage.logAdminAction({
        type: "announcement",
        timestamp: Date.now(),
        data: { message: announcementMessage },
      });
      toast.success("Genel duyuru gönderildi");
      setAnnouncementModalOpen(false);
      setAnnouncementMessage("");
    } catch (error: any) {
      toast.error(error.message || "İşlem başarısız oldu");
    }
  };

  const handleBanSearch = async () => {
    if (!banSearchQuery.trim()) {
      // Show all users if query empty
      const all = await offlineStorage.getAllUsers();
      setBanSearchResults(all.filter((u) => !u.isAdmin));
      return;
    }
    setBanLoading(true);
    try {
      const results = await offlineStorage.searchUsers(banSearchQuery.trim());
      setBanSearchResults(results.filter((u) => !u.isAdmin));
    } finally {
      setBanLoading(false);
    }
  };

  const handleBanUser = async (username: string, permanent: boolean) => {
    try {
      await offlineStorage.banUser(username, permanent ? null : 7);
      toast.success(
        `${username} ${permanent ? t.permanentBan : t.tempBan7Days} - ${t.userBanned}`,
      );
      // Refresh results
      await handleBanSearch();
    } catch (error: any) {
      toast.error(error.message || t.unknownError);
    }
  };

  const handleUnbanUser = async (username: string) => {
    try {
      await offlineStorage.unbanUser(username);
      toast.success(`${username} - ${t.userUnbanned}`);
      await handleBanSearch();
    } catch (error: any) {
      toast.error(error.message || t.unknownError);
    }
  };

  const isBanned = (user: import("@/lib/offlineStorage").User): boolean => {
    if (user.bannedUntil === undefined) return false;
    if (user.bannedUntil === null) return true;
    return user.bannedUntil > Date.now();
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 vibrant-gradient-bg-blue-gold" />

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
              <div>
                <div className="flex items-center gap-2">
                  <Crown className="w-8 h-8 text-amber-400 drop-shadow-lg animate-glow" />
                  <h1 className="text-3xl font-bold gradient-text-gold">
                    {t.adminPanel}
                  </h1>
                </div>
                <p className="text-sm text-white/80 font-semibold">
                  {t.adminPanelSubtitle}
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
                className="text-base px-5 py-3 border-4 border-amber-500/50 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 font-bold"
              >
                <Crown className="w-4 h-4 mr-2 text-amber-400" />
                {session.username}
              </Badge>
              <Button
                variant="outline"
                onClick={onLogout}
                className="gap-2 border-4 border-red-500/50 hover:bg-red-500/20 font-bold"
              >
                <LogOut className="w-5 h-5" />
                {t.logout}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 relative z-10">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* System Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-4 border-blue-500/50 shadow-2xl solid-overlay hover:shadow-blue-500/50 hover:shadow-2xl transition-all duration-300 overflow-hidden relative animate-border-glow">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 opacity-50" />
              <CardHeader className="relative pb-3">
                <CardTitle className="text-xl font-bold gradient-text-primary flex items-center gap-2">
                  <Users className="w-6 h-6 text-blue-400" />
                  {t.totalUsers}
                </CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <p className="text-4xl font-bold text-foreground">
                  {stats?.totalUsers || 0}
                </p>
              </CardContent>
            </Card>

            <Card className="border-4 border-amber-500/50 shadow-2xl solid-overlay hover:shadow-amber-500/50 hover:shadow-2xl transition-all duration-300 overflow-hidden relative animate-border-glow">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-yellow-500/20 opacity-50" />
              <CardHeader className="relative pb-3">
                <CardTitle className="text-xl font-bold gradient-text-gold flex items-center gap-2">
                  <Coins className="w-6 h-6 text-amber-400" />
                  Toplam Jeton
                </CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <p className="text-4xl font-bold text-foreground">
                  {stats?.totalJetons || 0}
                </p>
              </CardContent>
            </Card>

            <Card className="border-4 border-purple-500/50 shadow-2xl solid-overlay hover:shadow-purple-500/50 hover:shadow-2xl transition-all duration-300 overflow-hidden relative animate-border-glow">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 opacity-50" />
              <CardHeader className="relative pb-3">
                <CardTitle className="text-xl font-bold gradient-text-vibrant flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-purple-400" />
                  Ortalama XP
                </CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <p className="text-4xl font-bold text-foreground">
                  {stats?.averageXP || 0}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Admin Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card
              className="border-4 border-green-500/50 shadow-2xl solid-overlay hover:shadow-green-500/50 hover:shadow-2xl transition-all duration-300 cursor-pointer group overflow-hidden relative hover:scale-105"
              onClick={() => setBulkModalOpen(true)}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-emerald-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="relative">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300">
                  <Gift className="w-10 h-10 text-white" />
                </div>
                <CardTitle className="text-center text-2xl font-bold gradient-text-primary">
                  Toplu Jeton Gönder
                </CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <p className="text-center text-base font-bold text-foreground">
                  Tüm kullanıcılara jeton dağıt
                </p>
              </CardContent>
            </Card>

            <Card
              className="border-4 border-blue-500/50 shadow-2xl solid-overlay hover:shadow-blue-500/50 hover:shadow-2xl transition-all duration-300 cursor-pointer group overflow-hidden relative hover:scale-105"
              onClick={() => setIndividualModalOpen(true)}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="relative">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300">
                  <Send className="w-10 h-10 text-white" />
                </div>
                <CardTitle className="text-center text-2xl font-bold gradient-text-primary">
                  Kullanıcıya Jeton Gönder
                </CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <p className="text-center text-base font-bold text-foreground">
                  Belirli kullanıcıya jeton gönder
                </p>
              </CardContent>
            </Card>

            <Card
              className="border-4 border-purple-500/50 shadow-2xl solid-overlay hover:shadow-purple-500/50 hover:shadow-2xl transition-all duration-300 cursor-pointer group overflow-hidden relative hover:scale-105"
              onClick={() => setAnnouncementModalOpen(true)}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="relative">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300">
                  <Megaphone className="w-10 h-10 text-white" />
                </div>
                <CardTitle className="text-center text-2xl font-bold gradient-text-vibrant">
                  Genel Duyuru
                </CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <p className="text-center text-base font-bold text-foreground">
                  Tüm kullanıcılara mesaj gönder
                </p>
              </CardContent>
            </Card>

            <Card
              className="border-4 border-red-500/50 shadow-2xl solid-overlay hover:shadow-red-500/50 hover:shadow-2xl transition-all duration-300 cursor-pointer group overflow-hidden relative hover:scale-105"
              onClick={() => {
                setBanModalOpen(true);
                handleBanSearch();
              }}
              data-ocid="admin.ban_management_card"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-orange-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="relative">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300">
                  <Ban className="w-10 h-10 text-white" />
                </div>
                <CardTitle className="text-center text-2xl font-bold text-red-400">
                  {t.userManagement}
                </CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <p className="text-center text-base font-bold text-foreground">
                  {t.banUser} / {t.unbanUser}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* All Users Table */}
          <Card className="border-4 border-primary/50 shadow-2xl solid-overlay overflow-hidden relative animate-border-glow">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 opacity-50" />
            <CardHeader className="relative border-b-4 border-primary/30">
              <CardTitle className="text-2xl font-bold gradient-text-primary flex items-center gap-2">
                <Users className="w-7 h-7" />
                {t.allUsers}
              </CardTitle>
              <CardDescription className="text-base font-semibold">
                {t.allUsersDesc}
              </CardDescription>
            </CardHeader>
            <CardContent className="relative p-0">
              {usersLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
                  <p className="text-lg text-muted-foreground font-semibold mt-4">
                    {t.loading}
                  </p>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-lg text-muted-foreground font-semibold">
                    {t.noUsersYet}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b-2 border-primary/30 hover:bg-transparent">
                        <TableHead className="font-bold text-foreground text-base">
                          {t.username}
                        </TableHead>
                        <TableHead className="text-center font-bold text-foreground text-base">
                          Kod
                        </TableHead>
                        <TableHead className="text-center font-bold text-foreground text-base">
                          {t.jetons}
                        </TableHead>
                        <TableHead className="text-center font-bold text-foreground text-base">
                          {t.xp}
                        </TableHead>
                        <TableHead className="text-center font-bold text-foreground text-base">
                          {t.title}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow
                          key={user.code}
                          className="border-b border-primary/20 hover:bg-primary/10 transition-colors"
                        >
                          <TableCell className="font-bold text-foreground">
                            <div className="flex items-center gap-2">
                              {user.isAdmin && (
                                <Crown className="w-4 h-4 text-amber-400" />
                              )}
                              {user.username}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className="font-mono text-sm"
                            >
                              {user.code}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-bold text-amber-400">
                            {user.jetons}
                          </TableCell>
                          <TableCell className="text-center font-bold text-purple-400">
                            {user.xp}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className="border-2 border-blue-500/50 bg-blue-500/10 font-bold"
                            >
                              {user.title}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Bulk Distribution Modal */}
      <Dialog open={bulkModalOpen} onOpenChange={setBulkModalOpen}>
        <DialogContent className="sm:max-w-md border-4 border-green-500/50 solid-overlay">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold gradient-text-primary flex items-center gap-2">
              <Gift className="w-6 h-6 text-green-500" />
              Toplu Jeton Gönder
            </DialogTitle>
            <DialogDescription className="text-base font-semibold">
              Tüm kullanıcılara jeton dağıtın
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-amount" className="text-base font-bold">
                Jeton Miktarı
              </Label>
              <Input
                id="bulk-amount"
                type="number"
                placeholder="Örn: 100"
                value={bulkAmount}
                onChange={(e) => setBulkAmount(e.target.value)}
                className="border-2 h-12 text-lg font-semibold"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulk-message" className="text-base font-bold">
                Mesaj (Opsiyonel)
              </Label>
              <Textarea
                id="bulk-message"
                placeholder="Kullanıcılara gösterilecek mesaj..."
                value={bulkMessage}
                onChange={(e) => setBulkMessage(e.target.value)}
                className="border-2 min-h-24 font-semibold"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkModalOpen(false)}
              className="font-bold"
            >
              İptal
            </Button>
            <Button
              onClick={handleBulkDistribution}
              disabled={giftJetonsMutation.isPending}
              className="btn-gradient-primary text-white font-bold"
            >
              {giftJetonsMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gönderiliyor...
                </>
              ) : (
                <>
                  <Gift className="w-4 h-4 mr-2" />
                  Gönder
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Individual Distribution Modal */}
      <Dialog open={individualModalOpen} onOpenChange={setIndividualModalOpen}>
        <DialogContent className="sm:max-w-md border-4 border-blue-500/50 solid-overlay">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold gradient-text-primary flex items-center gap-2">
              <Send className="w-6 h-6 text-blue-500" />
              Kullanıcıya Jeton Gönder
            </DialogTitle>
            <DialogDescription className="text-base font-semibold">
              Belirli bir kullanıcıya jeton gönderin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="target-username" className="text-base font-bold">
                Kullanıcı Adı
              </Label>
              <Input
                id="target-username"
                placeholder="Kullanıcı adını girin"
                value={targetUsername}
                onChange={(e) => setTargetUsername(e.target.value)}
                className="border-2 h-12 text-lg font-semibold"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="individual-amount"
                className="text-base font-bold"
              >
                Jeton Miktarı
              </Label>
              <Input
                id="individual-amount"
                type="number"
                placeholder="Örn: 50"
                value={individualAmount}
                onChange={(e) => setIndividualAmount(e.target.value)}
                className="border-2 h-12 text-lg font-semibold"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="individual-message"
                className="text-base font-bold"
              >
                Mesaj (Opsiyonel)
              </Label>
              <Textarea
                id="individual-message"
                placeholder="Kullanıcıya gösterilecek mesaj..."
                value={individualMessage}
                onChange={(e) => setIndividualMessage(e.target.value)}
                className="border-2 min-h-24 font-semibold"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIndividualModalOpen(false)}
              className="font-bold"
            >
              İptal
            </Button>
            <Button
              onClick={handleIndividualDistribution}
              disabled={sendJetonsMutation.isPending}
              className="btn-gradient-primary text-white font-bold"
            >
              {sendJetonsMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gönderiliyor...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Gönder
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Global Announcement Modal */}
      <Dialog
        open={announcementModalOpen}
        onOpenChange={setAnnouncementModalOpen}
      >
        <DialogContent className="sm:max-w-md border-4 border-purple-500/50 solid-overlay">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold gradient-text-vibrant flex items-center gap-2">
              <Megaphone className="w-6 h-6 text-purple-500" />
              Genel Duyuru
            </DialogTitle>
            <DialogDescription className="text-base font-semibold">
              Tüm kullanıcılara duyuru gönderin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="announcement-message"
                className="text-base font-bold"
              >
                Duyuru Mesajı
              </Label>
              <Textarea
                id="announcement-message"
                placeholder="Duyuru mesajınızı yazın..."
                value={announcementMessage}
                onChange={(e) => setAnnouncementMessage(e.target.value)}
                className="border-2 min-h-32 font-semibold"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAnnouncementModalOpen(false)}
              className="font-bold"
            >
              İptal
            </Button>
            <Button
              onClick={handleGlobalAnnouncement}
              className="btn-gradient-secondary text-white font-bold"
            >
              <Megaphone className="w-4 h-4 mr-2" />
              Gönder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Ban Management Modal */}
      <Dialog open={banModalOpen} onOpenChange={setBanModalOpen}>
        <DialogContent
          data-ocid="ban.dialog"
          className="sm:max-w-lg border-4 border-red-500/50 solid-overlay"
        >
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-red-400 flex items-center gap-2">
              <Ban className="w-6 h-6" />
              {t.userManagement}
            </DialogTitle>
            <DialogDescription className="text-base font-semibold">
              {t.banUser} / {t.unbanUser}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder={t.searchPlayersPlaceholder}
                value={banSearchQuery}
                onChange={(e) => setBanSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleBanSearch()}
                data-ocid="ban.search_input"
                className="border-2 h-11 font-semibold"
              />
              <Button
                onClick={handleBanSearch}
                disabled={banLoading}
                data-ocid="ban.search_button"
                className="btn-gradient-primary text-white font-bold"
              >
                {banLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>
            <div className="max-h-80 overflow-y-auto space-y-2">
              {banSearchResults.length === 0 && (
                <p className="text-center text-muted-foreground py-4 font-semibold">
                  {t.noResults}
                </p>
              )}
              {banSearchResults.map((user, idx) => {
                const banned = isBanned(user);
                return (
                  <div
                    key={user.code}
                    data-ocid={`ban.item.${idx + 1}`}
                    className={`flex items-center justify-between p-3 rounded-lg border-2 ${banned ? "border-red-500/50 bg-red-500/10" : "border-border/50 bg-card/50"}`}
                  >
                    <div>
                      <p className="font-bold text-foreground">
                        {user.username}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {user.code}
                      </p>
                      {banned && (
                        <p className="text-xs text-red-400 font-bold mt-0.5">
                          {user.bannedUntil === null
                            ? t.permanentBan
                            : `${t.tempBan7Days} - ${new Date(user.bannedUntil!).toLocaleDateString()}`}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {banned ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUnbanUser(user.username)}
                          data-ocid={`ban.unban_button.${idx + 1}`}
                          className="border-2 border-green-500/50 text-green-400 hover:bg-green-500/20 font-bold text-xs"
                        >
                          {t.unbanUser}
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleBanUser(user.username, false)}
                            data-ocid={`ban.temp_ban_button.${idx + 1}`}
                            className="border-2 border-amber-500/50 text-amber-400 hover:bg-amber-500/20 font-bold text-xs"
                          >
                            7 Gün
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleBanUser(user.username, true)}
                            data-ocid={`ban.perm_ban_button.${idx + 1}`}
                            className="border-2 border-red-500/50 text-red-400 hover:bg-red-500/20 font-bold text-xs"
                          >
                            {t.permanentBan}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBanModalOpen(false)}
              data-ocid="ban.close_button"
              className="font-bold"
            >
              Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
