/**
 * emailService.js
 * Transport: Brevo SMTP via Nodemailer — 300 free emails/day.
 * All env vars read at call-time (never at module load).
 */
const nodemailer = require("nodemailer");

function getTransport() {
  return nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.BREVO_USER,
      pass: process.env.BREVO_PASS,
    },
  });
}

function getFrom() {
  return process.env.EMAIL_FROM || "Campus Event Finder <noreply@campuseventfinder.com>";
}

function formatDate(d) {
  if (!d) return "TBD";
  return new Date(d).toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

// ─── core send (never throws — logs and returns false on failure) ─────────────

async function sendEmail({ to, subject, html }) {
  // ── diagnostic logs (safe to keep in production) ──
  console.log("📧 Sending email to:", to);
  console.log("BREVO_USER:", process.env.BREVO_USER);
  console.log("BREVO_PASS:", process.env.BREVO_PASS ? process.env.BREVO_PASS.slice(0, 10) + "..." : "NOT SET");

  try {
    const user = process.env.BREVO_USER;
    const pass = process.env.BREVO_PASS;
    if (!user || !pass) {
      console.error(`[Email] SKIP — BREVO_USER or BREVO_PASS not set (to="${to}")`);
      return false;
    }
    const from = getFrom();
    console.log(`[Email] from="${from}" subject="${subject}"`);
    const info = await getTransport().sendMail({ from, to, subject, html });
    console.log(`✅ [Email] Delivered → to="${to}" messageId="${info.messageId}"`);
    return true;
  } catch (err) {
    console.error(`❌ [Email] Failed → to="${to}" | ${err.message}`);
    return false;
  }
}

// ─── named helpers used by controllers and scheduler ─────────────────────────

async function sendConfirmationEmail(to, event, registration) {
  await sendEmail({
    to,
    subject: `✅ Registration Confirmed: ${event.title}`,
    html: `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
  <div style="background:#4f46e5;padding:24px;color:#fff;"><h2 style="margin:0;">Registration Confirmed!</h2></div>
  <div style="padding:24px;">
    <p>Hi <strong>${registration.name || "there"}</strong>,</p>
    <p>You have successfully registered for the following event:</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:8px;font-weight:bold;width:140px;">Event</td><td style="padding:8px;">${event.title}</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding:8px;font-weight:bold;">Date</td><td style="padding:8px;">${formatDate(event.date)}</td></tr>
      <tr><td style="padding:8px;font-weight:bold;">Time</td><td style="padding:8px;">${event.time || "TBD"}</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding:8px;font-weight:bold;">Venue</td><td style="padding:8px;">${event.location || "TBD"}</td></tr>
      ${event.description ? `<tr><td style="padding:8px;font-weight:bold;">Description</td><td style="padding:8px;">${event.description}</td></tr>` : ""}
    </table>
    <p>You will receive a reminder email before the event starts.</p>
    <p style="color:#888;font-size:12px;margin-top:32px;">Campus Event Finder</p>
  </div>
</div>`,
  });
}

async function sendReminderEmail(to, event, registration) {
  await sendEmail({
    to,
    subject: `⏰ Reminder: "${event.title}" is tomorrow!`,
    html: `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
  <div style="background:#f59e0b;padding:24px;color:#fff;"><h2 style="margin:0;">Event Reminder — 24 Hours to go!</h2></div>
  <div style="padding:24px;">
    <p>Hi <strong>${registration.name || "there"}</strong>,</p>
    <p>Your event starts in approximately <strong>24 hours</strong>.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:8px;font-weight:bold;width:140px;">Event</td><td style="padding:8px;">${event.title}</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding:8px;font-weight:bold;">Date</td><td style="padding:8px;">${formatDate(event.date)}</td></tr>
      <tr><td style="padding:8px;font-weight:bold;">Time</td><td style="padding:8px;">${event.time || "TBD"}</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding:8px;font-weight:bold;">Venue</td><td style="padding:8px;">${event.location || "TBD"}</td></tr>
    </table>
    <p>See you there!</p>
    <p style="color:#888;font-size:12px;margin-top:32px;">Campus Event Finder</p>
  </div>
</div>`,
  });
}

async function sendNewEventAnnouncement(emails, event, appUrl) {
  if (!emails || emails.length === 0) {
    console.log("[Email] Announcement: no recipients.");
    return;
  }
  const eventLink = appUrl ? `${appUrl}/events/${event._id}` : null;
  const subject   = `🎉 New Event: ${event.title}`;
  const html = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
  <div style="background:#10b981;padding:24px;color:#fff;"><h2 style="margin:0;">New Event Posted!</h2></div>
  <div style="padding:24px;">
    <p>A new event has been posted on <strong>Campus Event Finder</strong>:</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:8px;font-weight:bold;width:140px;">Event</td><td style="padding:8px;">${event.title}</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding:8px;font-weight:bold;">Date</td><td style="padding:8px;">${formatDate(event.date)}</td></tr>
      <tr><td style="padding:8px;font-weight:bold;">Time</td><td style="padding:8px;">${event.time || "TBD"}</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding:8px;font-weight:bold;">Venue</td><td style="padding:8px;">${event.location || "TBD"}</td></tr>
      ${event.description ? `<tr><td style="padding:8px;font-weight:bold;">Description</td><td style="padding:8px;">${event.description}</td></tr>` : ""}
    </table>
    ${eventLink ? `<p><a href="${eventLink}" style="background:#4f46e5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">View Event &amp; Register</a></p>` : ""}
    <p style="color:#888;font-size:12px;margin-top:32px;">Campus Event Finder</p>
  </div>
</div>`;

  console.log(`[Email] Announcement: ${emails.length} recipient(s): ${emails.join(", ")}`);
  for (const email of emails) {
    await sendEmail({ to: email, subject, html });
  }
}

module.exports = { sendEmail, sendConfirmationEmail, sendReminderEmail, sendNewEventAnnouncement };
