const ADMIN_KEY = (process.env.NEXT_PUBLIC_KAMI_ADMIN_KEY || "").trim().toLowerCase();

export function isKamiAdminEmail(email?: string | null) {
  if (!ADMIN_KEY) return false;
  return (email || "").trim().toLowerCase() === ADMIN_KEY;
}
