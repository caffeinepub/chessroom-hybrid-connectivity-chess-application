import { useCallback, useEffect, useState } from "react";

interface UseInterstitialAdReturn {
  loadAd: () => void;
  showAd: () => void;
  isAdLoaded: boolean;
  isAdShowing: boolean;
}

/**
 * Hook for managing interstitial ads
 * Handles loading and showing full-screen ads at appropriate times
 */
export function useInterstitialAd(adUnitId: string): UseInterstitialAdReturn {
  const [isAdLoaded, setIsAdLoaded] = useState(false);
  const [isAdShowing, setIsAdShowing] = useState(false);

  const loadAd = useCallback(() => {
    if (window.AdMobBridge) {
      try {
        window.AdMobBridge.loadInterstitialAd(
          adUnitId,
          (success: boolean, error?: string) => {
            if (success) {
              setIsAdLoaded(true);
              console.log("[Interstitial] Ad loaded successfully");
            } else {
              setIsAdLoaded(false);
              console.error("[Interstitial] Failed to load ad:", error);
            }
          },
        );
      } catch (error) {
        console.error("[Interstitial] Bridge error:", error);
        setIsAdLoaded(false);
      }
    } else {
      // Development mode - simulate ad loading
      console.log(
        "[Interstitial] AdMob bridge not available - simulating ad load",
      );
      setTimeout(() => setIsAdLoaded(true), 1000);
    }
  }, [adUnitId]);

  const showAd = useCallback(() => {
    if (!isAdLoaded) {
      console.warn("[Interstitial] Ad not loaded yet");
      return;
    }

    if (window.AdMobBridge) {
      try {
        setIsAdShowing(true);
        window.AdMobBridge.showInterstitialAd((shown: boolean) => {
          setIsAdShowing(false);
          if (shown) {
            console.log("[Interstitial] Ad shown successfully");
            setIsAdLoaded(false); // Need to load a new ad
          } else {
            console.warn("[Interstitial] Ad failed to show");
          }
        });
      } catch (error) {
        console.error("[Interstitial] Bridge error:", error);
        setIsAdShowing(false);
      }
    } else {
      // Development mode - simulate ad showing
      console.log(
        "[Interstitial] AdMob bridge not available - simulating ad show",
      );
      setIsAdShowing(true);
      setTimeout(() => {
        setIsAdShowing(false);
        setIsAdLoaded(false);
      }, 2000);
    }
  }, [isAdLoaded]);

  // Auto-load ad on mount
  useEffect(() => {
    loadAd();
  }, [loadAd]);

  return {
    loadAd,
    showAd,
    isAdLoaded,
    isAdShowing,
  };
}
