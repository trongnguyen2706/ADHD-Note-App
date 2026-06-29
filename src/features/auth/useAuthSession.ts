import { startTransition, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithRedirect,
  signOut,
  type User
} from "firebase/auth";
import { auth, googleProvider, hasFirebaseConfig } from "../../lib/firebase/client";

export type AppViewer = {
  uid: string;
  displayName: string | null;
  email: string | null;
  isDemo: boolean;
};

export type AuthSession = {
  viewer: AppViewer | null;
  isBusy: boolean;
  isDemo: boolean;
  isLoading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const demoViewer: AppViewer = {
  uid: "demo-user",
  displayName: "Demo workspace",
  email: null,
  isDemo: true
};

function mapUser(user: User): AppViewer {
  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    isDemo: false
  };
}

export function useAuthSession(): AuthSession {
  const [viewer, setViewer] = useState<AppViewer | null>(
    hasFirebaseConfig ? null : demoViewer
  );
  const [isLoading, setIsLoading] = useState(hasFirebaseConfig);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasFirebaseConfig || !auth) {
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      startTransition(() => {
        setViewer(nextUser ? mapUser(nextUser) : null);
        setIsLoading(false);
        setIsBusy(false);
      });
    });

    return unsubscribe;
  }, []);

  async function handleSignIn() {
    if (!auth) {
      return;
    }

    setError(null);
    setIsBusy(true);

    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (nextError) {
      const message =
        nextError instanceof Error ? nextError.message : "Unable to sign in right now.";
      setError(message);
      setIsBusy(false);
    }
  }

  async function handleSignOut() {
    if (!auth) {
      return;
    }

    setError(null);
    setIsBusy(true);

    try {
      await signOut(auth);
    } catch (nextError) {
      const message =
        nextError instanceof Error ? nextError.message : "Unable to sign out right now.";
      setError(message);
      setIsBusy(false);
    }
  }

  return {
    viewer,
    isBusy,
    isDemo: !hasFirebaseConfig,
    isLoading,
    error,
    signIn: handleSignIn,
    signOut: handleSignOut
  };
}
