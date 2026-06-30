import type { ReactNode } from "react";
import { LoaderCircle, LogIn } from "lucide-react";
import type { AuthSession } from "./useAuthSession";

type AuthGateProps = {
  session: AuthSession;
  children: (viewer: NonNullable<AuthSession["viewer"]>) => ReactNode;
};

export function AuthGate({ session, children }: AuthGateProps) {
  if (session.isLoading) {
    return (
      <main className="auth-shell">
        <section className="auth-panel">
          <LoaderCircle className="spin" size={24} aria-hidden="true" />
          <h1>Loading your timeline</h1>
          <p>We are checking your session and preparing Note Time.</p>
        </section>
      </main>
    );
  }

  if (!session.viewer) {
    return (
      <main className="auth-shell">
        <section className="auth-panel">
          <p className="eyebrow">Cloud sync</p>
          <h1>Sign in to keep your notes across devices</h1>
          <p>
            Google sign-in unlocks the shared timeline between your PC and phone.
          </p>
          {session.error && (
            <p className="inline-error" role="alert">
              {session.error}
            </p>
          )}
          <button
            className="primary-button"
            type="button"
            onClick={session.signIn}
            disabled={session.isBusy}
          >
            <LogIn size={18} aria-hidden="true" />
            <span>{session.isBusy ? "Signing in..." : "Continue with Google"}</span>
          </button>
        </section>
      </main>
    );
  }

  return (
    <>
      {session.viewer.isDemo && (
        <aside className="setup-banner" aria-label="Firebase setup status">
          <LogIn size={18} aria-hidden="true" />
          <span>
            Firebase env is empty. The app is running in local demo mode until you
            add `.env.local`.
          </span>
        </aside>
      )}
      {children(session.viewer)}
    </>
  );
}
