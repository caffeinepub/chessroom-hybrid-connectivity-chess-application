/**
 * App Open Ad Component
 * Displays a full-screen ad when the application launches from a cold start
 *
 * Test Ad Configuration (Android Native):
 * - Enable test ads in MainActivity.kt with RequestConfiguration.Builder().setTestDeviceIds(listOf("TEST_DEVICE_ID"))
 * - Use AdRequest.Builder().build() without additional conditions
 * - Test ads should load instantly when app starts, even in debug mode
 *
 * Implementation Notes:
 * - App Open Ad is handled entirely in native Android code (MainActivity.kt)
 * - Ad displays once per app launch session before WebView content loads
 * - This component serves as documentation for the native implementation
 * - No frontend code needed as ad shows before WebView initializes
 *
 * Native Implementation (MainActivity.kt):
 * ```kotlin
 * // Configure test ads
 * val testDeviceIds = listOf("TEST_DEVICE_ID")
 * val configuration = RequestConfiguration.Builder()
 *     .setTestDeviceIds(testDeviceIds)
 *     .build()
 * MobileAds.setRequestConfiguration(configuration)
 *
 * // Load App Open Ad
 * val adRequest = AdRequest.Builder().build()
 * AppOpenAd.load(
 *     this,
 *     "ca-app-pub-7936595519986908/7893487132",
 *     adRequest,
 *     object : AppOpenAdLoadCallback() {
 *         override fun onAdLoaded(ad: AppOpenAd) {
 *             // Show ad immediately
 *             ad.show(this@MainActivity)
 *         }
 *     }
 * )
 * ```
 */

export const APP_OPEN_AD_UNIT_ID = "ca-app-pub-7936595519986908/7893487132";

// This component is for documentation purposes only
// App Open Ads are handled in native Android code before WebView loads
export default function AdAppOpen() {
  return null;
}
