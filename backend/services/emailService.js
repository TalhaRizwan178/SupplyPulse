const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const LOGO_PATH = path.join(__dirname, '../assets/logo.png');

const T = {
  bg:      '#272320',
  bg2:     '#1E1B18',
  line:    '#4D4740',
  text:    '#F4EFE8',
  text2:   '#B7AFA7',
  text3:   '#867E76',
  pulse:   '#6ADE95',
  pulseDim:'#1C3E2C',
};

function buildHtml({ title, badge, body, footerNote }) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;padding:0;background-color:#1A1714;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#1A1714;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:${T.bg};border-radius:16px;overflow:hidden;border:1px solid ${T.line};">
        <tr>
          <td style="background:${T.bg2};padding:28px 32px 24px;text-align:center;border-bottom:1px solid ${T.line};">
            <div style="width:48px;height:3px;background:${T.pulse};border-radius:2px;margin:0 auto 20px auto;"></div>
            <div style="font-size:22px;font-weight:800;color:${T.text};">Supply<span style="color:${T.pulse};">Pulse</span></div>
            <div style="font-size:11px;color:${T.text3};margin-top:4px;letter-spacing:1.5px;text-transform:uppercase;">Autonomous Supply Chain Agent</div>
            ${badge ? `<div style="display:inline-block;margin-top:16px;background:${T.pulseDim};border:1px solid ${T.pulse}33;color:${T.pulse};font-size:11px;font-weight:700;padding:4px 14px;border-radius:20px;letter-spacing:0.8px;text-transform:uppercase;">${badge}</div>` : ''}
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px 0 32px;">
            <h1 style="margin:0;font-size:18px;font-weight:700;color:${T.text};">${title}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 28px 32px;color:${T.text2};font-size:14px;line-height:1.8;">
            <pre style="margin:0;font-family:inherit;white-space:pre-wrap;word-break:break-word;color:#F4EFE8;">${body}</pre>
          </td>
        </tr>
        <tr><td style="padding:0 32px;"><div style="height:1px;background:${T.line};"></div></td></tr>
        <tr>
          <td style="padding:20px 32px;text-align:center;">
            <div style="font-size:13px;font-weight:700;color:${T.text2};">Supply<span style="color:${T.pulse};">Pulse</span></div>
            <div style="font-size:11px;color:${T.text3};margin-top:6px;">${footerNote || 'This message was sent automatically by the SupplyPulse autonomous agent.'}</div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function getTransporter() {
  if (!process.env.SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    family: 4,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendEmail({ to, subject, body, badge, footerNote, htmlOverride }) {
  const t = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  if (!t) {
    console.log(`[Email Mock] TO: ${to} | SUBJECT: ${subject}`);
    return { mocked: true };
  }

  const hasLogo = fs.existsSync(LOGO_PATH);

  try {
    const info = await t.sendMail({
      from: `"SupplyPulse" <${from}>`,
      to,
      subject,
      text: body,
      html: htmlOverride || buildHtml({ title: subject, badge, body, footerNote }),
      attachments: hasLogo ? [
        { filename: 'logo.png', path: LOGO_PATH, cid: 'supplypulse-logo', contentDisposition: 'inline' },
      ] : [],
    });
    console.log(`[Email Sent] ${subject} → ${to} | ID: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`[Email Error] ${err.message}`);
    return { error: err.message };
  }
}

module.exports = { sendEmail };
