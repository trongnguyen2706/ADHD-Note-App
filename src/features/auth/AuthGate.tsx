import { LogIn } from "lucide-react";
import { hasFirebaseConfig } from "../../lib/firebase/client";

type AuthGateProps = {
  children: React.ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
  return (
    <>
      {!hasFirebaseConfig && (
        <aside className="setup-banner" aria-label="Firebase setup status">
          <LogIn size={18} aria-hidden="true" />
          <span>Firebase env is empty. The app is running with demo data.</span>
        </aside>
      )}
      {children}
    </>
  );
}
