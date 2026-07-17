import { Resend } from "resend";

// With no RESEND_API_KEY set, emails are logged to the server console instead.
export async function sendEmail(to: string[], subject: string, text: string) {
  const recipients = to.filter(Boolean);
  if (recipients.length === 0) return;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[email → ${recipients.join(", ")}] ${subject}\n${text}`);
    return;
  }
  try {
    const resend = new Resend(key);
    await resend.batch.send(
      recipients.map((r) => ({
        from: process.env.EMAIL_FROM ?? "Coworking Frens <onboarding@resend.dev>",
        to: r,
        subject,
        text,
      }))
    );
  } catch (err) {
    console.error("email send failed", err);
  }
}
