const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const LOGO_PATH = path.join(__dirname, '../assets/logo.png');
function getLogoBase64() {
  try {
    return 'data:image/png;base64,' + fs.readFileSync(LOGO_PATH).toString('base64');
  } catch { return null; }
}

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
  const logoSrc = getLogoBase64();
  const logoTag = logoSrc ? `<img src="${logoSrc}" alt="SupplyPulse" width="56" height="56" style="display:block;margin:0 auto 14px auto;border-radius:12px;border:1px solid ${T.line};">` : '';
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
            ${logoTag}
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

function buildRawEmail({ from, to, subject, html }) {
  const boundary = 'boundary_supplypulse';
  const mime = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    Buffer.from(html).toString('base64'),
    `--${boundary}--`,
  ].join('\r\n');

  return Buffer.from(mime).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sendEmail({ to, subject, body, badge, footerNote, htmlOverride }) {
  const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_USER } = process.env;

  if (!GMAIL_CLIENT_ID || !GMAIL_REFRESH_TOKEN) {
    console.log(`[Email Mock] TO: ${to} | SUBJECT: ${subject}`);
    return { mocked: true };
  }

  try {
    const oauth2Client = new google.auth.OAuth2(GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET);
    oauth2Client.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const from = `SupplyPulse <${GMAIL_USER}>`;
    const html = htmlOverride || buildHtml({ title: subject, badge, body, footerNote });
    const raw = buildRawEmail({ from, to, subject, html });

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    });

    console.log(`[Email Sent] ${subject} → ${to} | ID: ${res.data.id}`);
    return res.data;
  } catch (err) {
    console.error(`[Email Error] ${err.message}`);
    return { error: err.message };
  }
}

module.exports = { sendEmail };
