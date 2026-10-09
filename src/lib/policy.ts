export const TEAM_DOMAIN = "pitdrives.com";
export function isTeamEmail(email: unknown): email is string {
  return typeof email === "string" && /^[^\s@]+@pitdrives\.com$/i.test(email);
}
export function isTeamIdentity(claims: {
  email?: unknown;
  email_verified?: boolean;
  firebase?: { sign_in_provider?: string };
}) {
  return (
    claims.email_verified === true &&
    isTeamEmail(claims.email) &&
    claims.firebase?.sign_in_provider === "google.com"
  );
}
