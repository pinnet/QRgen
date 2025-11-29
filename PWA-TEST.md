# PWA Testing Guide

## Testing PWA Installation Locally

### Chrome/Edge Testing Steps:

1. **Open DevTools** (F12)
2. Go to **Application** tab
3. Check **Manifest** section:
   - ✅ Name: "QR Gen - Beautiful QR Code Generator"
   - ✅ Start URL: "/"
   - ✅ Icons: Should show 8 PNG icons (72px to 512px)
   
4. Check **Service Workers** section:
   - ✅ Status: Should be "activated and is running"
   - ✅ Version: qr-gen-v2
   - ✅ Scope: http://localhost:8080/
   
5. **Install PWA**:
   - Click the install icon in address bar (⊕)
   - OR: Click three dots menu → "Install QR Gen..."
   - App should install and open in standalone window

### Testing Offline Functionality:

1. Open the installed PWA app
2. In DevTools → Network tab, check "Offline" 
3. Refresh the page (F5)
4. ✅ App should still load from cache
5. Generate a QR code
6. ✅ QR generation should work offline

### Testing on Mobile:

#### Android (Chrome):
1. Visit https://jmplnk.uk on Chrome
2. Tap three dots → "Add to Home screen"
3. Confirm installation
4. Open from home screen → runs fullscreen

#### iOS (Safari):
1. Visit https://jmplnk.uk on Safari
2. Tap Share button → "Add to Home Screen"
3. Open from home screen → runs standalone

## Fixed Issues:

✅ **Service Worker caching** - Now uses `no-cache, no-store, must-revalidate`
✅ **Manifest caching** - Uses `no-cache, must-revalidate`
✅ **Real PNG icons** - Generated 8 sizes (72-512px)
✅ **Cache version** - Updated to v2
✅ **Icon paths** - Changed from data URIs to `/icons/*.png`
✅ **Service-Worker-Allowed header** - Set to `/`

## Debugging:

If PWA doesn't work:
1. Clear browser cache (Ctrl+Shift+Delete)
2. Unregister service worker: DevTools → Application → Service Workers → Unregister
3. Hard refresh (Ctrl+Shift+R)
4. Check Console for errors

## Production Deployment:

After deploying to https://jmplnk.uk:
1. Service Worker requires HTTPS (localhost is exception)
2. Icons directory must be included in deployment
3. Cache headers must be preserved
4. Test install prompt appears on second visit
