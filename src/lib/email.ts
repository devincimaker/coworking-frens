import { Resend } from "resend";

type SendEmailOptions = {
  throwOnError?: boolean;
};

// With no RESEND_API_KEY set, emails are logged to the server console instead.
export async function sendEmail(
  to: string[],
  subject: string,
  text: string,
  options: SendEmailOptions = {}
) {
  const recipients = to.filter(Boolean);
  if (recipients.length === 0) return;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[email → ${recipients.join(", ")}] ${subject}\n${text}`);
    return;
  }
  const from = process.env.EMAIL_FROM;
  if (!from) {
    const err = new Error("EMAIL_FROM is required when RESEND_API_KEY is set");
    console.error("email send failed", err.message);
    if (options.throwOnError) throw err;
    return;
  }
  try {
    const resend = new Resend(key);
    const { error } = await resend.batch.send(
      recipients.map((r) => ({
        from,
        to: r,
        subject,
        text,
      }))
    );
    if (error) throw new Error(`${error.name}: ${error.message}`);
  } catch (err) {
    const normalized = err instanceof Error ? err : new Error(String(err));
    console.error("email send failed", normalized.message);
    if (options.throwOnError) throw normalized;
  }
}
