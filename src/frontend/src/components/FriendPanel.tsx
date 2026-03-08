import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { offlineStorage } from "@/lib/offlineStorage";
import type { User as UserType } from "@/lib/offlineStorage";
import { type Language, getTranslations } from "@/lib/translations";
import {
  Crown,
  Search,
  User,
  UserMinus,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface FriendPanelProps {
  open: boolean;
  onClose: () => void;
  userCode: string;
  language: Language;
}

export default function FriendPanel({
  open,
  onClose,
  userCode,
  language,
}: FriendPanelProps) {
  const t = getTranslations(language);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserType[]>([]);
  const [friends, setFriends] = useState<UserType[]>([]);
  const [myFriendNames, setMyFriendNames] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const loadFriends = useCallback(async () => {
    try {
      const [friendList, currentUser] = await Promise.all([
        offlineStorage.getFriends(userCode),
        offlineStorage.getUserByCode(userCode),
      ]);
      setFriends(friendList);
      setMyFriendNames(currentUser?.friends ?? []);
    } catch {
      // ignore
    }
  }, [userCode]);

  useEffect(() => {
    if (open) {
      loadFriends();
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [open, loadFriends]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await offlineStorage.searchUsers(searchQuery);
      // Exclude self
      const filtered = results.filter((u) => u.code !== userCode);
      setSearchResults(filtered);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFriend = async (username: string) => {
    try {
      await offlineStorage.addFriend(userCode, username);
      setMyFriendNames((prev) => [...prev, username]);
      await loadFriends();
      toast.success(t.friendAdded);
    } catch {
      // ignore
    }
  };

  const handleRemoveFriend = async (username: string) => {
    try {
      await offlineStorage.removeFriend(userCode, username);
      setMyFriendNames((prev) => prev.filter((f) => f !== username));
      await loadFriends();
      toast.info(t.friendRemoved);
    } catch {
      // ignore
    }
  };

  const getTitleColor = (title: string) => {
    const colors: Record<string, string> = {
      Başlangıç: "border-gray-500/50 bg-gray-500/10",
      Amatör: "border-green-500/50 bg-green-500/10",
      Orta: "border-blue-500/50 bg-blue-500/10",
      İleri: "border-purple-500/50 bg-purple-500/10",
      Uzman: "border-orange-500/50 bg-orange-500/10",
      Usta: "border-red-500/50 bg-red-500/10",
      Büyükusta: "border-amber-500/50 bg-amber-500/10",
    };
    return colors[title] || "border-gray-500/50 bg-gray-500/10";
  };

  const renderUserCard = (user: UserType, index: number) => {
    const isFollowing = myFriendNames.includes(user.username);
    return (
      <div
        key={user.code}
        data-ocid={`friends.item.${index + 1}`}
        className="flex items-center gap-3 p-3 rounded-lg border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5 hover:border-primary/40 transition-all duration-200"
      >
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg flex-shrink-0">
          <User className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground text-sm truncate">
            {user.username}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-purple-400 font-semibold">
              <Zap className="w-3 h-3" />
              {user.weeklyXP ?? user.xp} XP
            </span>
            <Badge
              variant="outline"
              className={`text-xs border font-bold ${getTitleColor(user.title)}`}
            >
              {user.title}
            </Badge>
          </div>
        </div>
        {isFollowing ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRemoveFriend(user.username)}
            data-ocid={`friends.delete_button.${index + 1}`}
            className="border-2 border-red-500/50 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-xs font-bold gap-1 flex-shrink-0"
          >
            <UserMinus className="w-3 h-3" />
            {t.removeFriend}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAddFriend(user.username)}
            data-ocid={`friends.add_button.${index + 1}`}
            className="border-2 border-green-500/50 hover:bg-green-500/20 text-green-400 hover:text-green-300 text-xs font-bold gap-1 flex-shrink-0"
          >
            <UserPlus className="w-3 h-3" />
            {t.addFriend}
          </Button>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        data-ocid="friends.dialog"
        className="border-4 border-primary/40 solid-overlay w-full max-w-md mx-auto"
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold gradient-text-primary flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-400" />
            {t.friends}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="search" className="w-full">
          <TabsList className="w-full border-2 border-primary/30 mb-4">
            <TabsTrigger
              value="search"
              data-ocid="friends.tab"
              className="flex-1 font-bold"
            >
              {t.searchPlayers}
            </TabsTrigger>
            <TabsTrigger
              value="friends"
              data-ocid="friends.tab"
              className="flex-1 font-bold"
            >
              {t.myFriends} {friends.length > 0 && `(${friends.length})`}
            </TabsTrigger>
          </TabsList>

          {/* Search Tab */}
          <TabsContent value="search" className="space-y-4">
            <div className="flex gap-2">
              <Input
                data-ocid="friends.search_input"
                placeholder={t.searchPlayersPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="border-2 border-primary/30 bg-background font-semibold"
              />
              <Button
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
                data-ocid="friends.primary_button"
                className="btn-gradient-primary text-white font-bold gap-1 flex-shrink-0"
              >
                <Search className="w-4 h-4" />
              </Button>
            </div>

            <ScrollArea className="h-64">
              {searchResults.length === 0 ? (
                <div
                  data-ocid="friends.empty_state"
                  className="text-center py-12 text-muted-foreground"
                >
                  <Crown className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-semibold text-sm">
                    {searchQuery && !isSearching
                      ? t.noResults
                      : t.searchPlayersPlaceholder}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 pr-2">
                  {searchResults.map((user, i) => renderUserCard(user, i))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Friends Tab */}
          <TabsContent value="friends">
            <ScrollArea className="h-72">
              {friends.length === 0 ? (
                <div
                  data-ocid="friends.empty_state"
                  className="text-center py-12 text-muted-foreground"
                >
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-semibold text-sm">{t.noFriendsYet}</p>
                </div>
              ) : (
                <div className="space-y-2 pr-2">
                  {friends.map((user, i) => renderUserCard(user, i))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
