/**
 * AdMob Configuration
 *
 * App ID: ca-app-pub-7936595519986908~1621961948
 * Content Language: Turkish (tr)
 *
 * Test Ad Configuration:
 * To enable instant visible test ads in Android native code:
 *
 * 1. Add test device configuration in MainActivity.kt:
 * ```kotlin
 * val testDeviceIds = listOf("TEST_DEVICE_ID")
 * val configuration = RequestConfiguration.Builder()
 *     .setTestDeviceIds(testDeviceIds)
 *     .build()
 * MobileAds.setRequestConfiguration(configuration)
 * ```
 *
 * 2. Use AdRequest.Builder().build() without additional conditions:
 * ```kotlin
 * val adRequest = AdRequest.Builder().build()
 * ```
 *
 * 3. Test ads will display visually identical to real ads
 * 4. Test ads load instantly even in debug mode
 */

export const ADMOB_CONFIG = {
  appId: "ca-app-pub-7936595519986908~1621961948",
  contentLanguage: "tr",

  adUnits: {
    appOpen: "ca-app-pub-7936595519986908/7893487132",
    banner: "ca-app-pub-7936595519986908/1925322078",
    interstitial: "ca-app-pub-7936595519986908/4971972028",
    native: "ca-app-pub-7936595519986908/9612240400",
  },

  testMode: {
    enabled: true, // Set to false for production
    deviceIds: ["TEST_DEVICE_ID"], // Replace with actual test device IDs
  },
} as const;

export type AdUnitType = keyof typeof ADMOB_CONFIG.adUnits;

export function getAdUnitId(type: AdUnitType): string {
  return ADMOB_CONFIG.adUnits[type];
}
