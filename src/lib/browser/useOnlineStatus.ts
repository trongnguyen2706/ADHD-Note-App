import { startTransition, useEffect, useState } from "react";

function getInitialOnlineState() {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(getInitialOnlineState);

  useEffect(() => {
    function handleOnline() {
      startTransition(() => {
        setIsOnline(true);
      });
    }

    function handleOffline() {
      startTransition(() => {
        setIsOnline(false);
      });
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
