import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";

interface AdNativeProps {
  adUnitId: string;
  className?: string;
  style?: "compact" | "medium" | "large";
}

/**
 * Native Advanced Ad Component
 * Displays a native ad that blends with the app's UI
 *
 * Test Ad Configuration (Android Native):
 * - Enable test ads in MainActivity.kt with RequestConfiguration.Builder().setTestDeviceIds(listOf("TEST_DEVICE_ID"))
 * - Use AdRequest.Builder().build() without additional conditions
 * - Test ads should display visually identical to real ads with custom styling
 *
 * In production, this communicates with native Android AdMob SDK via WebView bridge
 */
export default function AdNative({
  adUnitId,
  className = "",
  style = "medium",
}: AdNativeProps) {
  const [isAdLoaded, setIsAdLoaded] = useState(false);
  const [adError, setAdError] = useState<string | null>(null);
  const containerId = `admob-native-${adUnitId.replace(/[^a-zA-Z0-9]/g, "")}`;

  useEffect(() => {
    // Check if running in WebView with AdMob bridge
    if (window.AdMobBridge) {
      try {
        // Request native ad from native Android code
        // Native code should use AdRequest.Builder().build() for test ads
        window.AdMobBridge.loadNativeAd(
          adUnitId,
          containerId,
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
      console.log("[AdNative] AdMob bridge not available - development mode");
      setIsAdLoaded(true);
    }
  }, [adUnitId, containerId]);

  if (adError) {
    // Silently fail - don't show error to users
    console.error("[AdNative] Error:", adError);
    return null;
  }

  if (!isAdLoaded) {
    return null;
  }

  const heightClass =
    style === "compact" ? "h-20" : style === "medium" ? "h-32" : "h-48";

  return (
    <Card className={`border-2 border-primary/20 overflow-hidden ${className}`}>
      <CardContent className="p-0">
        {/* Native ad container - will be populated by Android WebView */}
        <div
          id={containerId}
          className={`w-full ${heightClass} bg-gradient-to-r from-primary/5 to-secondary/5 flex items-center justify-center`}
        >
          {/* Container for native ad rendering - no placeholder text when bridge is available */}
          {!window.AdMobBridge && (
            <div className="text-center p-4">
              <div className="text-xs text-muted-foreground font-semibold mb-1">
                Native Ad ({style})
              </div>
              <div className="text-[10px] text-muted-foreground/60">
                Test ads enabled in native code
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
