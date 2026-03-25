import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Force service worker update on every page load
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      registration.update();
    });
  });

  // Reload when a new service worker takes control
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

createRoot(document.getElementById("root")!).render(<App />);
