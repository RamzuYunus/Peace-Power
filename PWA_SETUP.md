# Peace Power PWA (Progressive Web App) Setup

## What is a PWA?

A Progressive Web App is a web application that works like a native app on mobile and desktop:
- Installs from home screen (iOS/Android) without app stores
- Works offline with service worker caching
- Full-screen experience like a native app
- Access to device camera for PPG scanning

## Files Added for PWA Support

1. **`public/manifest.json`** - PWA metadata and installation config
2. **`public/service-worker.js`** - Offline caching and background sync
3. **`index.html`** - Updated meta tags for PWA

## How Users Install on Mobile

### Android (Chrome, Edge, Firefox)
1. Open `https://peacepower.yourdomain.com` in browser
2. Menu → "Install app" or prompt appears automatically
3. App installs to home screen

### iOS (Safari)
1. Open `https://peacepower.yourdomain.com` in Safari
2. Tap Share button → "Add to Home Screen"
3. App installs to home screen with standalone mode

### Desktop (Chrome, Edge, Opera)
1. Visit the app in browser
2. Click install icon in address bar (looks like "⬇️")
3. App installs as desktop application

## Service Worker Features

The service worker provides:

**Static Assets** - Cached for offline access:
- HTML, CSS, JavaScript bundles
- Images and icons
- Manifest and favicon

**API Requests** - Network-first with cache fallback:
- Fresh data when connected
- Last-known state when offline
- Automatic re-sync when connection returns

**Cache Strategy**:
- Service Worker cache v1 (auto-updates)
- Stale-while-revalidate for better UX
- Graceful fallback for failed requests

## Testing PWA Locally

1. Build the app:
   ```bash
   pnpm --filter @workspace/peace-power run build
   ```

2. Serve production build:
   ```bash
   pnpm --filter @workspace/peace-power run serve
   ```

3. In Chrome DevTools:
   - Application tab → Manifest (should show green checkmark)
   - Service Workers tab (should show registered)
   - Storage tab (view cached files)

4. Test offline:
   - DevTools → Network → Offline checkbox
   - App should continue working with cached data

## Manifest Configuration

The `manifest.json` includes:

- **App Identity**: Name, icons, colors
- **Display**: `standalone` (full screen, no browser chrome)
- **Start URL**: `/` (home page when launched)
- **Orientation**: `portrait-primary` (portrait mode on mobile)
- **Categories**: `health, wellness`
- **Shortcuts**: Quick access to Scan and History pages
- **Screenshots**: For app store-like displays

## iOS Specific Notes

iOS PWA support (as of iOS 16.4):
- ✅ Home screen installation
- ✅ Standalone display mode
- ✅ Service workers for offline
- ✅ Camera access
- ⚠️ Limited background sync (iOS limits)

For full native features, a native iOS app would be needed (SwiftUI).

## Android Specific Notes

Android PWA support (Chrome):
- ✅ Full native-like experience
- ✅ Background sync
- ✅ Push notifications (with backend)
- ✅ Camera access
- ✅ All modern web APIs

## Future Enhancements

1. **Push Notifications** - Notify users of global coherence events
2. **Background Sync** - Sync scan data when connection returns
3. **Periodic Background Sync** - Remind users to scan
4. **Share API** - Share results via native share sheet
5. **Camera API** - Better camera control (already using camera for PPG)

## Deployment Checklist

- [x] Manifest.json created
- [x] Service worker created
- [x] HTML meta tags updated
- [x] HTTPS enforced (required for PWA)
- [x] Icons in public folder
- [x] Start URL configured
- [ ] Test on real mobile device
- [ ] Verify offline functionality
- [ ] Test camera access
- [ ] Verify data caching

## Security Considerations

PWA security features implemented:
- HTTPS required for installation
- CSP headers for XSS prevention
- Service worker scope isolation
- Cache versioning (auto-invalidates old versions)
- No sensitive data cached without encryption

## Troubleshooting

**App won't install?**
- Must be served over HTTPS
- Check manifest.json is accessible
- Check service-worker.js path

**Offline doesn't work?**
- Verify service worker is registered (DevTools → Application)
- Check cache names in service-worker.js
- Ensure assets are in URLS_TO_CACHE

**Camera not working?**
- Must be HTTPS with camera permissions granted
- Check browser camera permissions
- Verify getUserMedia API is available

**Data not syncing?**
- Check network requests in DevTools
- Verify API endpoint is correct
- Check localStorage for stored scan data
