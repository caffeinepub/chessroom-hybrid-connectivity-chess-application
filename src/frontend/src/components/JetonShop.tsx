import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { offlineStorage } from "@/lib/offlineStorage";
import {
  CheckCircle2,
  Coins,
  Palette,
  Shield,
  ShoppingBag,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface JetonShopProps {
  isOpen: boolean;
  onClose: () => void;
  userCode: string;
  currentJetons: number;
  onPurchase: () => void;
}

const BOARD_THEMES = [
  {
    id: "theme_classic",
    name: "Klasik",
    price: 50,
    emoji: "♟️",
    desc: "Klasik ah\u015fap tahta",
  },
  {
    id: "theme_wood",
    name: "Ah\u015fap",
    price: 80,
    emoji: "🪵",
    desc: "Do\u011fal ah\u015fap doku",
  },
  {
    id: "theme_ocean",
    name: "Okyanus",
    price: 100,
    emoji: "🌊",
    desc: "Mavi okyanus temas\u0131",
  },
  {
    id: "theme_night",
    name: "Gece",
    price: 120,
    emoji: "🌙",
    desc: "Koyu gece temas\u0131",
  },
  {
    id: "theme_gold",
    name: "Alt\u0131n",
    price: 150,
    emoji: "\u2728",
    desc: "Alt\u0131n parlak tema",
  },
  {
    id: "theme_marble",
    name: "Mermer",
    price: 200,
    emoji: "🏛\ufe0f",
    desc: "L\u00fcks mermer doku",
  },
];

const BADGES = [
  {
    id: "badge_star",
    name: "Y\u0131ld\u0131z",
    price: 60,
    emoji: "\u2b50",
    desc: "Parlayan y\u0131ld\u0131z rozeti",
  },
  {
    id: "badge_fire",
    name: "Ate\u015f",
    price: 90,
    emoji: "🔥",
    desc: "Ate\u015fli oyuncu rozeti",
  },
  {
    id: "badge_ice",
    name: "Buz",
    price: 110,
    emoji: "\u2744\ufe0f",
    desc: "So\u011fuk kanl\u0131 strateji",
  },
  {
    id: "badge_royal",
    name: "Kraliyet",
    price: 130,
    emoji: "👑",
    desc: "Kraliyet s\u0131n\u0131f\u0131 rozet",
  },
  {
    id: "badge_dragon",
    name: "Ejder",
    price: 180,
    emoji: "🐉",
    desc: "Efsanevi ejder g\u00fcc\u00fc",
  },
  {
    id: "badge_legend",
    name: "Efsane",
    price: 250,
    emoji: "🌟",
    desc: "Efsanevi usta rozeti",
  },
];

export default function JetonShop({
  isOpen,
  onClose,
  userCode,
  currentJetons,
  onPurchase,
}: JetonShopProps) {
  const [inventory, setInventory] = useState<string[]>(() =>
    offlineStorage.getInventory(userCode),
  );
  const [jetons, setJetons] = useState(currentJetons);
  const [buying, setBuying] = useState<string | null>(null);

  const handleBuy = async (itemId: string, price: number, name: string) => {
    if (inventory.includes(itemId)) return;
    setBuying(itemId);
    const success = offlineStorage.purchaseItem(userCode, itemId, price);
    if (success) {
      setInventory(offlineStorage.getInventory(userCode));
      setJetons((prev) => prev - price);
      toast.success(`${name} sat\u0131n al\u0131nd\u0131! \ud83c\udf89`);
      onPurchase();
    } else {
      toast.error("Yetersiz jeton bakiyesi");
    }
    setBuying(null);
  };

  const getItemIndex = (
    item: (typeof BOARD_THEMES)[0] | (typeof BADGES)[0],
  ): number => {
    const ti = BOARD_THEMES.findIndex((t) => t.id === item.id);
    if (ti >= 0) return ti + 1;
    return BADGES.findIndex((b) => b.id === item.id) + 1;
  };

  const renderItem = (item: (typeof BOARD_THEMES)[0] | (typeof BADGES)[0]) => {
    const owned = inventory.includes(item.id);
    const canAfford = jetons >= item.price;
    const idx = getItemIndex(item);
    return (
      <div
        key={item.id}
        data-ocid={`shop.item.${idx}`}
        className={`rounded-2xl border-2 p-4 flex flex-col gap-3 transition-all ${
          owned
            ? "border-green-500/50 bg-green-500/10"
            : canAfford
              ? "border-amber-500/30 bg-card hover:border-amber-400/60 hover:bg-amber-500/5"
              : "border-border/50 bg-card opacity-60"
        }`}
      >
        <div className="flex items-start gap-3">
          <span className="text-3xl leading-none">{item.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-foreground text-sm">{item.name}</h4>
              {owned && (
                <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/40 rounded-full px-2 py-0.5 font-bold">
                  Sahipsin
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-amber-400 font-bold">
            <Coins className="w-4 h-4" />
            <span className="text-sm">{item.price}</span>
          </div>
          {owned ? (
            <div className="flex items-center gap-1 text-green-400 text-sm font-bold">
              <CheckCircle2 className="w-4 h-4" />
              Sahipsin
            </div>
          ) : (
            <Button
              data-ocid="shop.buy_button"
              size="sm"
              disabled={!canAfford || buying === item.id}
              onClick={() => handleBuy(item.id, item.price, item.name)}
              className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs px-3"
            >
              <ShoppingBag className="w-3 h-3 mr-1" />
              Sat\u0131n Al
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-ocid="shop.dialog"
        className="max-w-md w-full border-2 border-amber-500/40 bg-card p-0 overflow-hidden"
      >
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-400" />
              Jeton Ma\u011fazas\u0131
            </DialogTitle>
            <div className="flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/40 rounded-full px-3 py-1.5">
              <Coins className="w-4 h-4 text-amber-400" />
              <span
                data-ocid="shop.balance"
                className="text-sm font-bold text-amber-400"
              >
                {jetons}
              </span>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="themes" className="w-full">
          <TabsList className="w-full rounded-none border-b border-border bg-transparent px-6 pt-4">
            <TabsTrigger
              data-ocid="shop.themes.tab"
              value="themes"
              className="flex-1 flex items-center gap-1.5"
            >
              <Palette className="w-4 h-4" />
              Tahta Temalar\u0131
            </TabsTrigger>
            <TabsTrigger
              data-ocid="shop.badges.tab"
              value="badges"
              className="flex-1 flex items-center gap-1.5"
            >
              <Shield className="w-4 h-4" />
              Rozetler
            </TabsTrigger>
          </TabsList>

          <TabsContent value="themes" className="m-0">
            <ScrollArea className="h-[380px]">
              <div className="grid grid-cols-1 gap-3 p-6">
                {BOARD_THEMES.map(renderItem)}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="badges" className="m-0">
            <ScrollArea className="h-[380px]">
              <div className="grid grid-cols-1 gap-3 p-6">
                {BADGES.map(renderItem)}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export { BADGES };
