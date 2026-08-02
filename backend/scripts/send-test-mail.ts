/**
 * Standalone SMTP smoke test — verifies the SMTP_* credentials in .env can
 * actually send mail, without needing the database or the app running.
 *
 * Usage:
 *   npm run mail:test                 # sends to SUPPORT_EMAIL
 *   npm run mail:test -- you@iima.ac.in
 */
import { sendMail, isMailConfigured } from '../src/lib/mailer';
import { env } from '../src/config/env';

async function main() {
  const to = process.argv[2] || env.supportEmail;
  console.log('SMTP configured:', isMailConfigured());
  console.log('From           :', env.smtp.from);
  console.log('Sending test to:', to, '\n');

  const res = await sendMail({
    to,
    subject: 'IIMA Marketplace — SMTP test ✅',
    text: 'If you can read this, SMTP is working.',
    html: `
      <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #eadfce;border-radius:14px;background:#fff">
        <h2 style="margin:0 0 8px;color:#8a3b1e;font-family:Georgia,serif">IIMA Marketplace</h2>
        <p style="margin:0 0 12px;color:#333">This is a test email from the marketplace mailer.</p>
        <p style="margin:0;color:#777;font-size:13px">If you received this, your SMTP credentials are configured correctly.</p>
      </div>`,
  });

  if (res.sent) console.log(`✅ Sent to ${to} — check the inbox (and Spam).`);
  else console.log('⚠️  Not sent — SMTP is not configured (SMTP_HOST/USER/PASS missing in .env).');
  process.exit(res.sent ? 0 : 1);
}

main().catch((e) => {
  console.error('\n❌ SMTP test FAILED\n', e);
  process.exit(1);
});
