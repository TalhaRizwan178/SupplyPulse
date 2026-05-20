require('dotenv').config();
const { sendEmail } = require('./services/emailService');

async function test() {
  const to = 'skillspherefyp@gmail.com';
  console.log('=== SupplyPulse Email Delivery Test ===');
  console.log('Provider: Gmail SMTP (IPv4 forced)');
  console.log('SMTP_PASS:', process.env.SMTP_PASS ? '✓ loaded' : '✗ MISSING');
  console.log('FROM:', process.env.SMTP_FROM || 'Skillspherefyp@gmail.com');
  console.log('TO:', to);
  console.log('Sending...');

  const result = await sendEmail({
    to,
    subject: 'SupplyPulse — Brevo Delivery Test',
    body: 'Email delivery is working via Brevo HTTP API.\nSent at: ' + new Date().toLocaleString(),
    badge: 'Delivery Test',
  });

  if (result?.error) {
    console.log('✗ FAILED:', JSON.stringify(result.error, null, 2));
  } else if (result?.mocked) {
    console.log('⚠ MOCKED — BREVO_API_KEY not set in .env');
  } else {
    console.log('✓ SUCCESS — Email sent!');
    console.log('MessageId:', result.messageId);
  }
}

test();
