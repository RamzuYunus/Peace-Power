import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

export function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS - safe check without accessing undefined properties
    const ua = navigator.userAgent;
    const isApple = /iPad|iPhone|iPod/.test(ua) && !/(windows|win32)/i.test(ua);
    setIsIOS(isApple);

    // Listen for beforeinstallprompt (Android)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    try {
      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    } catch (err) {
      console.error("beforeinstallprompt listener error:", err);
      return () => {};
    }
  }, []);

  const handleInstallAndroid = async () => {
    if (!deferredPrompt) return;

    const prompt = deferredPrompt as any;
    prompt.prompt();
    const result = await prompt.userChoice;
    
    if (result.outcome === "accepted") {
      setDeferredPrompt(null);
      setIsInstalled(true);
    }
  };

  // Hide only if already installed
  if (isInstalled) {
    return null;
  }

  return (
    <>
      {isIOS || !deferredPrompt ? (
        // iOS: Show button that opens guide
        <button
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-2 bg-accent/20 text-accent-foreground px-6 py-3 rounded-lg font-semibold hover:bg-accent/30 transition-all border border-accent/30"
        >
          <Download className="w-4 h-4" />
          Add to Home Screen
        </button>
      ) : (
        // Android: Show install button
        <button
          onClick={handleInstallAndroid}
          className="inline-flex items-center gap-2 bg-accent/20 text-accent-foreground px-6 py-3 rounded-lg font-semibold hover:bg-accent/30 transition-all border border-accent/30"
        >
          <Download className="w-4 h-4" />
          Install App
        </button>
      )}

      {/* iOS Installation Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Add to Home Screen</h3>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Follow these steps:</p>
              
              <ol className="space-y-2 list-decimal list-inside">
                <li>Tap the Share button (box with arrow) at the bottom</li>
                <li>Scroll down and tap "Add to Home Screen"</li>
                <li>Choose a name (or keep "Peace Power")</li>
                <li>Tap "Add" in the top right</li>
              </ol>

              <div className="bg-muted p-3 rounded-lg mt-4">
                <p className="text-xs font-medium">The app will then appear on your home screen and work offline!</p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full bg-primary text-primary-foreground py-2 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
