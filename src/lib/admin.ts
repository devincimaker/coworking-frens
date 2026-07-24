import "server-only";

function emailList(raw: string | undefined) {
  return String(raw ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function feedbackAdminEmails() {
  const adminEmails = emailList(process.env.ADMIN_EMAILS);
  return adminEmails.length > 0 ? adminEmails : emailList(process.env.FEEDBACK_TO_EMAIL);
}

export function isFeedbackAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  return feedbackAdminEmails().includes(email.trim().toLowerCase());
}
