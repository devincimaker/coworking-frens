import { Resend } from "resend";

type EmailAttachment = {
  filename: string;
  /** File contents. An .ics is text, so a plain string is what goes over the wire. */
  content: string;
};

type SendEmailOptions = {
  throwOnError?: boolean;
  attachments?: EmailAttachment[];
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
  const attachments = options.attachments?.length ? options.attachments : undefined;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    const note = attachments ? ` [+${attachments.map((a) => a.filename).join(", ")}]` : "";
    console.log(`[email → ${recipients.join(", ")}]${note} ${subject}\n${text}`);
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
    // Resend's batch endpoint drops attachments — its own type says as much,
    // `Omit<CreateEmailOptions, "attachments" | "scheduledAt">` — so anything
    // carrying a file goes one send at a time instead.
    if (attachments) {
      const results = await Promise.all(
        recipients.map((r) => resend.emails.send({ from, to: r, subject, text, attachments }))
      );
      const failure = results.find((result) => result.error)?.error;
      if (failure) throw new Error(`${failure.name}: ${failure.message}`);
    } else {
      const { error } = await resend.batch.send(
        recipients.map((r) => ({
          from,
          to: r,
          subject,
          text,
        }))
      );
      if (error) throw new Error(`${error.name}: ${error.message}`);
    }
  } catch (err) {
    const normalized = err instanceof Error ? err : new Error(String(err));
    console.error("email send failed", normalized.message);
    if (options.throwOnError) throw normalized;
  }
}
