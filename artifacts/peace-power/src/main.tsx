import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker } from "@/hooks/use-offline";
import { initOfflineDB } from "@/lib/offline-db";
import { setupAutoSync } from "@/lib/offline-sync";

// Initialize offline support
(async () => {
  try {
    await initOfflineDB();
    console.log("Offline database initialized");
  } catch (err) {
    console.warn("Offline DB not available:", err);
  }

  registerServiceWorker();
  setupAutoSync();
})();

createRoot(document.getElementById("root")!).render(<App />);
