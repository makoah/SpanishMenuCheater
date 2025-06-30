# PWA Installation Testing Guide - iOS Safari

## Testing Steps for iOS Safari

### 1. Open in Safari
- Navigate to: `http://localhost:3000` or your deployed URL
- **Important**: Must use Safari (not Chrome/Firefox) on iOS for PWA installation

### 2. Verify PWA Readiness
Look for these indicators:
- ✅ Address bar shows the app is loading properly
- ✅ App works in portrait orientation
- ✅ Touch interactions work smoothly
- ✅ Search functionality operates correctly

### 3. Install PWA
- Tap the **Share button** (square with arrow pointing up) in Safari
- Scroll down and tap **"Add to Home Screen"**
- Confirm the app name: "Spanish Menu Cheater"
- Tap **"Add"** in the top right

### 4. Verify Installation
- Check home screen for the app icon
- Tap the icon to launch the app
- Verify it opens in fullscreen mode (no Safari UI)
- Test offline functionality by turning off WiFi/cellular

### 5. Test App Features
- ✅ Search works (try "paella", "jamon", "tortilla")
- ✅ Language toggle switches between EN/NL
- ✅ Dietary filters function properly
- ✅ App maintains state when backgrounded
- ✅ Offline indicator appears when disconnected

## Expected Behavior

### Installation Success Indicators:
- App icon appears on home screen
- App launches in standalone mode (no browser UI)
- App maintains functionality offline
- Fast loading due to service worker caching

### Troubleshooting:
- **"Add to Home Screen" not visible**: Ensure using Safari, not another browser
- **App not loading**: Check network connection for initial load
- **Icons missing**: Icons will be placeholder until custom icons are added

## Next Steps After Testing:
1. Report any installation issues
2. Test on different iOS versions if available
3. Verify app performance and user experience
4. Ready for production deployment once confirmed working

---
*Test on iOS 14+ for best PWA support*