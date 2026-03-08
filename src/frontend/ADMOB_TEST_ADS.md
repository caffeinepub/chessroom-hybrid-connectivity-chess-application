# AdMob Test Ads Configuration

This document explains how to enable instant visible test ads in the Android native code.

## Overview

The ChessRoom application uses Google Mobile Ads SDK (AdMob) with four ad types:
- **App Open Ad**: Displays when app launches from cold start
- **Banner Ad**: Fixed at bottom of MainScreen
- **Interstitial Ad**: Shows at game completion and transitions
- **Native Advanced Ad**: Integrated in profile section and leaderboard

## Enabling Test Ads

### 1. Configure Test Devices in MainActivity.kt

Add the following code in `MainActivity.kt` before loading any ads:

