"use client";
import { useState } from "react";
import { ArrowRight, LogOut, ShieldCheck } from "lucide-react";
import { AuthProvider, useTeam } from "./auth";
import Link from "next/link";
import {
  ClientDirectory,
  ClientDetail,
  NewClient,
  CalendarView,
  BookingsPage,
} from "./client-desk/desk";
import JournalLink from "./premier-blog/JournalLink";
import Image from "next/image";

function Brand() {
  return (
    <div className="flex h-[60px] w-[180px] flex-none items-center">
      <a
        href="#top"
        aria-label="Premier International Transportation — back to top"
        className="relative block h-[60px] w-[180px] flex-none"
      >
        <Image
          src="/logo.png"
          alt="Premier International Transportation"
          width={180}
          height={60}
          priority
          className="block h-full w-full object-contain object-left"
        />
      </a>
    </div>
  );
}

function Login() {
  const { login, loading, error } = useTeam();
  const [busy, setBusy] = useState(false);
  return (
    <div className="login-page">
      <div className="login-story">
        <Brand />
        <div>
          <p className="eyebrow">THE PREMIER STANDARD</p>
          <h1>
            See people.
            <br />
            Know people.
            <br />
            <em>Serve people.</em>
          </h1>
          <p>Your workspace for journeys that feel personal.</p>
        </div>
        <span className="login-foot">PREMIER INTERNATIONAL TRANSPORTATION</span>
      </div>
      <main className="login-main">
        <div className="login-card">
          <span className="security-icon">
            <ShieldCheck size={25} />
          </span>
          <p className="eyebrow">FOR OUR TEAM</p>
          <h2>Welcome back.</h2>
          <p>Sign in to arrange your next journey.</p>
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          <button
            className="button google full"
            disabled={loading || busy}
            onClick={async () => {
              setBusy(true);
              try {
                await login();
              } finally {
                setBusy(false);
              }
            }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.23c1.89-1.74 2.99-4.31 2.99-7.36Z"
              />
              <path
                fill="#34A853"
                d="M12 22c2.7 0 4.96-.9 6.61-2.41l-3.23-2.51c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.12H3.05v2.59A10 10 0 0 0 12 22Z"
              />
              <path
                fill="#FBBC05"
                d="M6.39 13.92A6 6 0 0 1 6.07 12c0-.67.12-1.32.32-1.92V7.49H3.05A10 10 0 0 0 2 12c0 1.61.39 3.14 1.05 4.51l3.34-2.59Z"
              />
              <path
                fill="#EA4335"
                d="M12 5.96c1.47 0 2.79.51 3.83 1.51l2.88-2.88A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.95 5.49l3.34 2.59C7.18 7.72 9.39 5.96 12 5.96Z"
              />
            </svg>
            {loading || busy ? "Signing in…" : "Continue with Google"}
            <ArrowRight size={16} />
          </button>
          <p className="login-restriction">
            Use your <strong>@pitdrives.com</strong> Google account.
            <br />
            This workspace is for Premier staff only.
          </p>
        </div>
      </main>
    </div>
  );
}

type WorkspaceProps = {
  view?: "clients" | "new" | "detail" | "calendar" | "bookings";
  clientId?: string;
};
function DeskPage({ view = "clients", clientId }: WorkspaceProps) {
  const { user, logout } = useTeam();
  const [error, setError] = useState("");
  return (
    <div className="simple-workspace">
      <header className="desk-header">
        <Brand />
        <nav aria-label="Workspace navigation">
          <Link
            href="/"
            aria-current={
              ["clients", "new", "detail"].includes(view) ? "page" : undefined
            }
          >
            Clients
          </Link>
          <Link
            href="/calendar"
            aria-current={view === "calendar" ? "page" : undefined}
          >
            Calendar
          </Link>
          <Link
            href="/bookings"
            aria-current={view === "bookings" ? "page" : undefined}
          >
            Bookings
          </Link>
          <JournalLink />
        </nav>
        <div className="desk-account">
          <span>{user?.name}</span>
          <button
            className="icon-button"
            aria-label="Sign out"
            onClick={async () => {
              try {
                await logout();
              } catch {
                setError("Could not sign out. Please try again.");
              }
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <main>
        {view === "new" ? (
          <NewClient />
        ) : view === "detail" && clientId ? (
          <ClientDetail id={clientId} />
        ) : view === "bookings" ? (
          <BookingsPage />
        ) : view === "calendar" ? (
          <CalendarView />
        ) : (
          <ClientDirectory />
        )}
      </main>
    </div>
  );
}
function Gate(props: WorkspaceProps) {
  const { user, loading } = useTeam();
  if (loading)
    return (
      <div className="desk-auth-loading" role="status">
        Opening your workspace…
      </div>
    );
  return user ? <DeskPage {...props} /> : <Login />;
}
export default function Workspace(props: WorkspaceProps) {
  return (
    <AuthProvider>
      <Gate {...props} />
    </AuthProvider>
  );
}
