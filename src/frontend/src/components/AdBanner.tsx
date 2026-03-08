import { useEffect, useState } from "react";

interface AdBannerProps {
  adUnitId: string;
  className?: string;
}

/**
 * Banner Ad Component
 * Displays a fixed banner ad at the bottom of the screen
 *
 * Test Ad Configuration (Android Native):
 * - Enable test ads in MainActivity.kt with RequestConfiguration.Builder().setTestDeviceIds(listOf("TEST_DEVICE_ID"))
 * - Use AdRequest.Builder().build() without additional conditions
 * - Test ads should display visually identical to real ads
 *
 * In production, this communicates with native Android AdMob SDK via WebView bridge
 */
export default function AdBanner({ adUnitId, className = "" }: AdBannerProps) {
  const [isAdLoaded, setIsAdLoaded] = useState(false);
  const [adError, setAdError] = useState<string | null>(null);

  useEffect(() => {
    // Check if running in WebView with AdMob bridge
    if (window.AdMobBridge) {
      try {
        // Request banner ad from native Android code
        // Native code should use AdRequest.Builder().build() for test ads
        window.AdMobBridge.loadBannerAd(
          adUnitId,
          (success: boolean, error?: string) => {
            if (success) {
              setIsAdLoaded(true);
              setAdError(null);
            } else {
              setAdError(error || "Failed to load ad");
              setIsAdLoaded(false);
            }
          },
        );
      } catch (error) {
        console.error("AdMob bridge error:", error);
        setAdError("Bridge communication error");
      }
    } else {
      // Development mode - simulate loaded state for testing
      console.log("[AdBanner] AdMob bridge not available - development mode");
      setIsAdLoaded(true);
    }

    // Cleanup on unmount
    return () => {
      if (window.AdMobBridge) {
        window.AdMobBridge.hideBannerAd?.();
      }
    };
  }, [adUnitId]);

  if (adError) {
    // Silently fail - don't show error to users
    console.error("[AdBanner] Error:", adError);
    return null;
  }

  if (!isAdLoaded) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 ${className}`}
      style={{ height: "50px" }}
    >
      {/* Native ad container - will be populated by Android WebView */}
      <div
        id="admob-banner-container"
        className="w-full h-full bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center border-t-2 border-primary/20"
      >
        {/* Container for native ad rendering - no placeholder text when bridge is available */}
        {!window.AdMobBridge && (
          <div className="text-center">
            <div className="text-xs text-muted-foreground font-semibold">
              Banner Ad (320x50)
            </div>
            <div className="text-[10px] text-muted-foreground/60 mt-1">
              Test ads enabled in native code
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// TypeScript declarations for WebView bridge
declare global {
  interface Window {
    AdMobBridge?: {
      loadBannerAd: (
        adUnitId: string,
        callback: (success: boolean, error?: string) => void,
      ) => void;
      hideBannerAd?: () => void;
      loadInterstitialAd: (
        adUnitId: string,
        callback: (success: boolean, error?: string) => void,
      ) => void;
      showInterstitialAd: (callback: (shown: boolean) => void) => void;
      loadNativeAd: (
        adUnitId: string,
        containerId: string,
        callback: (success: boolean, error?: string) => void,
      ) => void;
      loadAppOpenAd?: (
        adUnitId: string,
        callback: (success: boolean, error?: string) => void,
      ) => void;
      showAppOpenAd?: (callback: (shown: boolean) => void) => void;
    };
  }
}
