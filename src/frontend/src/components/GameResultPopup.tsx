import { Button } from "@/components/ui/button";
import { Home, Trophy, X } from "lucide-react";
import { useEffect, useState } from "react";

interface GameResultPopupProps {
  isOpen: boolean;
  result: "win" | "lose" | "draw";
  reason: string;
  xpGained: number;
  jetonsGained: number;
  onClose: () => void;
}

export default function GameResultPopup({
  isOpen,
  result,
  reason,
  xpGained,
  jetonsGained,
  onClose,
}: GameResultPopupProps) {
  const [visible, setVisible] = useState(false);
  const [animIn, setAnimIn] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimIn(true));
      });
    } else {
      setAnimIn(false);
      const t = setTimeout(() => setVisible(false), 350);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  if (!visible) return null;

  const config = {
    win: {
      emoji: "🏆",
      title: "Tebrikler!",
      subtitle: "Harika bir oyun!",
      bgGradient: "from-yellow-600/90 via-amber-700/90 to-orange-700/90",
      glow: "shadow-[0_0_60px_rgba(250,190,0,0.5)]",
      border: "border-yellow-400/60",
      badge: "bg-green-500/20 text-green-300 border-green-400/50",
      badgeText: "Kazand\u0131n!",
      iconBg: "bg-yellow-400/20",
      iconColor: "text-yellow-300",
    },
    lose: {
      emoji: "♟️",
      title: "Kaybettin",
      subtitle: "Bir dahaki sefere daha iyi olacaks\u0131n!",
      bgGradient: "from-red-900/90 via-rose-900/90 to-pink-900/90",
      glow: "shadow-[0_0_60px_rgba(220,50,50,0.4)]",
      border: "border-red-400/60",
      badge: "bg-red-500/20 text-red-300 border-red-400/50",
      badgeText: "Kaybettin",
      iconBg: "bg-red-400/20",
      iconColor: "text-red-300",
    },
    draw: {
      emoji: "🤝",
      title: "Beraberlik!",
      subtitle: "Dengeli bir m\u00fccadele!",
      bgGradient: "from-blue-900/90 via-indigo-900/90 to-purple-900/90",
      glow: "shadow-[0_0_60px_rgba(100,120,255,0.4)]",
      border: "border-blue-400/60",
      badge: "bg-blue-500/20 text-blue-300 border-blue-400/50",
      badgeText: "Berabere",
      iconBg: "bg-blue-400/20",
      iconColor: "text-blue-300",
    },
  };

  const c = config[result];

  return (
    <div
      data-ocid="game_result.modal"
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-350 ${
        animIn ? "opacity-100" : "opacity-0"
      }`}
      style={{
        backgroundColor: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        className={`relative w-full max-w-sm rounded-3xl border-2 ${c.border} bg-gradient-to-b ${c.bgGradient} ${c.glow} p-8 flex flex-col items-center gap-5 transition-all duration-350 ${
          animIn ? "scale-100 translate-y-0" : "scale-90 translate-y-8"
        }`}
      >
        {/* Close button */}
        <button
          type="button"
          data-ocid="game_result.close_button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4 text-white/70" />
        </button>

        {/* Trophy/Icon */}
        <div
          className={`w-24 h-24 rounded-full ${c.iconBg} flex items-center justify-center`}
        >
          {result === "win" ? (
            <Trophy className={`w-12 h-12 ${c.iconColor}`} />
          ) : (
            <span className="text-5xl leading-none">{c.emoji}</span>
          )}
        </div>

        {/* Result badge */}
        <span
          className={`px-4 py-1.5 rounded-full border text-sm font-bold tracking-wide ${c.badge}`}
        >
          {c.badgeText}
        </span>

        {/* Title & subtitle */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-1">{c.title}</h2>
          <p className="text-white/70 text-sm">{c.subtitle}</p>
          {reason && <p className="text-white/50 text-xs mt-1">{reason}</p>}
        </div>

        {/* Stats */}
        <div className="w-full grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/10 border border-white/20 p-3 text-center">
            <p className="text-white/60 text-xs font-medium mb-1">XP</p>
            <p
              data-ocid="game_result.xp_gained"
              className={`text-xl font-bold ${
                xpGained >= 0 ? "text-green-300" : "text-red-300"
              }`}
            >
              {xpGained >= 0 ? "+" : ""}
              {xpGained}
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 border border-white/20 p-3 text-center">
            <p className="text-white/60 text-xs font-medium mb-1">Jeton</p>
            <p
              data-ocid="game_result.jetons_gained"
              className={`text-xl font-bold ${
                jetonsGained >= 0 ? "text-amber-300" : "text-red-300"
              }`}
            >
              {jetonsGained >= 0 ? "+" : ""}
              {jetonsGained}
            </p>
          </div>
        </div>

        {/* Back to menu button */}
        <Button
          data-ocid="game_result.primary_button"
          onClick={onClose}
          className="w-full mt-1 bg-white/20 hover:bg-white/30 text-white border border-white/30 font-bold text-base py-5 rounded-2xl transition-all"
        >
          <Home className="w-5 h-5 mr-2" />
          Ana Men\u00fc
        </Button>
      </div>
    </div>
  );
}
