import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Owns Spotlight + Cathedral overlay state for the v3 shell.
 * Wires global keyboard shortcuts (⌘K, ⌘1/2/3, Esc) and toggles a
 * `body.cathedral-open` class so v3 styles can fade out the sphere
 * + wordmark when the cathedral is shown.
 */
export function useNavOverlay() {
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [cathedralOpen, setCathedralOpen] = useState(false);
  const navigate = useNavigate();

  const openSpotlight = useCallback(() => setSpotlightOpen(true), []);
  const closeSpotlight = useCallback(() => setSpotlightOpen(false), []);
  const openCathedral = useCallback(() => setCathedralOpen(true), []);
  const closeCathedral = useCallback(() => setCathedralOpen(false), []);

  // Global keyboard shortcuts
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;

      if (isMod && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setSpotlightOpen((o) => !o);
        return;
      }
      if (isMod && e.key === "1") {
        e.preventDefault();
        navigate("/dashboard");
        return;
      }
      if (isMod && e.key === "2") {
        e.preventDefault();
        navigate("/inbox");
        return;
      }
      if (isMod && e.key === "3") {
        e.preventDefault();
        navigate("/customers"); // "Clients" section → /customers (per Phase 2A approval)
        return;
      }
      if (e.key === "Escape") {
        setSpotlightOpen(false);
        setCathedralOpen(false);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  // Body class — drives the CSS fade-out of `.stage-canvas` and `.v3-wordmark`
  // while the cathedral is open. Cleanup on unmount and on close.
  useEffect(() => {
    if (cathedralOpen) {
      document.body.classList.add("cathedral-open");
    } else {
      document.body.classList.remove("cathedral-open");
    }
    return () => {
      document.body.classList.remove("cathedral-open");
    };
  }, [cathedralOpen]);

  return {
    spotlightOpen,
    cathedralOpen,
    openSpotlight,
    closeSpotlight,
    openCathedral,
    closeCathedral,
  };
}
