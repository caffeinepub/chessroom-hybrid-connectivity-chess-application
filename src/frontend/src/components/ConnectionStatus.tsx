import { Badge } from "@/components/ui/badge";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { type Language, getTranslations } from "@/lib/translations";
import { Wifi, WifiOff } from "lucide-react";

interface ConnectionStatusProps {
  language: Language;
}

export default function ConnectionStatus({ language }: ConnectionStatusProps) {
  const { isOnline, isInitializing } = useNetworkStatus();
  const t = getTranslations(language);

  if (isInitializing) {
    return null;
  }

  return (
    <Badge
      variant={isOnline ? "default" : "secondary"}
      className={`flex items-center gap-1.5 px-3 py-1.5 border-2 transition-all duration-300 ${
        isOnline
          ? "bg-green-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30"
          : "bg-orange-500/20 border-orange-500/50 text-orange-400 hover:bg-orange-500/30"
      }`}
    >
      {isOnline ? (
        <Wifi className="w-3.5 h-3.5 animate-pulse" />
      ) : (
        <WifiOff className="w-3.5 h-3.5" />
      )}
      <span className="text-xs font-bold">
        {isOnline ? t.online : t.offline}
      </span>
    </Badge>
  );
}
