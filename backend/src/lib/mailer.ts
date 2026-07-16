import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env';

/**
 * Central mail transport. When SMTP is configured (SMTP_HOST + credentials)
 * mail is sent for real; otherwise in development we log to the console so the
 * app is fully usable without secrets. This keeps the bulk-mail feature and
 * any transactional mail behind a single, swappable interface.
 */
let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;
  if (!env.smtp.host || !env.smtp.user || !env.smtp.pass) return null;
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure, // true for 465, false for 587 (STARTTLS)
    auth: { user: env.smtp.user, pass: env.smtp.pass },
  });
  return transporter;
}

export const isMailConfigured = () => !!getTransporter();

export interface MailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendMail(msg: MailMessage): Promise<{ sent: boolean }> {
  const tx = getTransporter();
  if (!tx) {
    // eslint-disable-next-line no-console
    console.log('\n[mailer:dev] SMTP not configured — would send:\n', {
      to: msg.to,
      subject: msg.subject,
    });
    return { sent: false };
  }
  await tx.sendMail({
    from: env.smtp.from,
    to: Array.isArray(msg.to) ? msg.to.join(',') : msg.to,
    subject: msg.subject,
    text: msg.text,
    html: msg.html,
  });
  return { sent: true };
}

/**
 * Bulk send with light throttling so we stay within Gmail's per-connection
 * limits. Recipients are BCC'd in batches to protect their privacy.
 */
export async function sendBulk(
  recipients: string[],
  subject: string,
  html: string,
  batchSize = 40,
): Promise<{ sent: number; batches: number }> {
  const tx = getTransporter();
  if (!tx) {
    // eslint-disable-next-line no-console
    console.log(`[mailer:dev] would bulk-send "${subject}" to ${recipients.length} recipients`);
    return { sent: 0, batches: 0 };
  }
  let sent = 0;
  let batches = 0;
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    await tx.sendMail({ from: env.smtp.from, bcc: batch, subject, html });
    sent += batch.length;
    batches += 1;
  }
  return { sent, batches };
}
