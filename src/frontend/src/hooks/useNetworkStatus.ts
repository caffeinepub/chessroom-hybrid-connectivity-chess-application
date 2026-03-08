import { type Language, getTranslations } from "@/lib/translations";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export interface NetworkStatus {
  isOnline: boolean;
  isInitializing: boolean;
}

let currentLanguage: Language = "tr";

export function setNetworkStatusLanguage(language: Language) {
  currentLanguage = language;
}

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    isInitializing: true,
  });

  useEffect(() => {
    // Initialize
    setStatus({
      isOnline: navigator.onLine,
      isInitializing: false,
    });

    const handleOnline = () => {
      setStatus({ isOnline: true, isInitializing: false });
      const t = getTranslations(currentLanguage);
      toast.success(t.connectionRestored, {
        description: t.connectionRestoredDesc,
        duration: 3000,
      });
    };

    const handleOffline = () => {
      setStatus({ isOnline: false, isInitializing: false });
      const t = getTranslations(currentLanguage);
      toast.warning(t.connectionLost, {
        description: t.connectionLostDesc,
        duration: 3000,
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Periodic connectivity check (every 30 seconds)
    const checkConnectivity = async () => {
      try {
        const response = await fetch("/ping", {
          method: "HEAD",
          cache: "no-cache",
        });
        const isOnline = response.ok;
        setStatus((prev) => {
          if (prev.isOnline !== isOnline && !prev.isInitializing) {
            if (isOnline) {
              const t = getTranslations(currentLanguage);
              toast.success(t.connectionRestored, {
                description: t.connectionRestoredDesc,
                duration: 3000,
              });
            } else {
              const t = getTranslations(currentLanguage);
              toast.warning(t.connectionLost, {
                description: t.connectionLostDesc,
                duration: 3000,
              });
            }
          }
          return { isOnline, isInitializing: false };
        });
      } catch (_error) {
        // Network error, assume offline
        setStatus((prev) => {
          if (prev.isOnline && !prev.isInitializing) {
            const t = getTranslations(currentLanguage);
            toast.warning(t.connectionLost, {
              description: t.connectionLostDesc,
              duration: 3000,
            });
          }
          return { isOnline: false, isInitializing: false };
        });
      }
    };

    const intervalId = setInterval(checkConnectivity, 30000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(intervalId);
    };
  }, []);

  return status;
}
