import React, { useEffect } from "react";

/**
 * AdInterstitial Component
 *
 * This component provides a React hook for triggering interstitial ads
 * through the Android WebView bridge. It should be used at natural
 * transition points in the app (game end, mode switches, etc.).
 *
 * The actual ad display is handled by native Android code in MainActivity.kt
 * with built-in cooldown logic (2-minute minimum between ads).
 */

interface AndroidAdsInterface {
  showInterstitial: () => void;
}

declare global {
  interface Window {
    AndroidAds?: AndroidAdsInterface;
  }
}

/**
 * Hook to trigger interstitial ads from React components
 *
 * Usage:
 * ```tsx
 * const showInterstitial = useInterstitialAd();
 *
 * // Call when appropriate (e.g., game end)
 * const handleGameEnd = () => {
 *   // ... game end logic
 *   showInterstitial();
 * };
 * ```
 */
export function useInterstitialAd() {
  const showInterstitial = React.useCallback(() => {
    try {
      if (
        window.AndroidAds &&
        typeof window.AndroidAds.showInterstitial === "function"
      ) {
        window.AndroidAds.showInterstitial();
        console.log("Interstitial ad requested");
      } else {
        console.log("Android ad bridge not available (running in browser)");
      }
    } catch (error) {
      console.error("Error triggering interstitial ad:", error);
    }
  }, []);

  return showInterstitial;
}

/**
 * Component that automatically triggers an interstitial ad on mount
 *
 * Usage:
 * ```tsx
 * <AdInterstitial trigger={shouldShowAd} />
 * ```
 */
interface AdInterstitialProps {
  trigger?: boolean;
  onAdRequested?: () => void;
}

export function AdInterstitial({
  trigger = true,
  onAdRequested,
}: AdInterstitialProps) {
  const showInterstitial = useInterstitialAd();

  useEffect(() => {
    if (trigger) {
      showInterstitial();
      onAdRequested?.();
    }
  }, [trigger, showInterstitial, onAdRequested]);

  return null; // This component doesn't render anything
}

/**
 * Documentation Component - Implementation Notes
 *
 * ANDROID NATIVE IMPLEMENTATION:
 *
 * The MainActivity.kt must include the following JavaScript interface:
 *
 * ```kotlin
 * webView.addJavascriptInterface(object {
 *     @JavascriptInterface
 *     fun showInterstitial() {
 *         runOnUiThread {
 *             showInterstitialAd()
 *         }
 *     }
 * }, "AndroidAds")
 * ```
 *
 * COOLDOWN LOGIC:
 *
 * The native Android code implements a 2-minute cooldown between ads:
 *
 * ```kotlin
 * private var lastInterstitialTime: Long = 0
 * private val interstitialCooldown: Long = 120000 // 2 minutes
 *
 * private fun showInterstitialAd() {
 *     val currentTime = System.currentTimeMillis()
 *     if (currentTime - lastInterstitialTime < interstitialCooldown) {
 *         return
 *     }
 *     // Show ad and update lastInterstitialTime
 * }
 * ```
 *
 * TRIGGER POINTS:
 *
 * Recommended places to trigger interstitial ads:
 * - End of AI games (after checkmate, stalemate, timeout, resignation)
 * - Switching between Random Room game sessions
 * - Leaving completed Friend Mode games
 * - Returning to main menu from completed games
 *
 * TEST AD CONFIGURATION:
 *
 * For testing, use AdMob test ad unit IDs in MainActivity.kt:
 * - Test Interstitial: "ca-app-pub-3940256099942544/1033173712"
 *
 * Configure test devices:
 * ```kotlin
 * val testDeviceIds = listOf("YOUR_TEST_DEVICE_ID")
 * val configuration = RequestConfiguration.Builder()
 *     .setTestDeviceIds(testDeviceIds)
 *     .build()
 * MobileAds.setRequestConfiguration(configuration)
 * ```
 *
 * PRODUCTION AD UNIT IDs:
 * - Interstitial: "ca-app-pub-7936595519986908/4971972028"
 */

export default AdInterstitial;
