require('dotenv').config();
const { sendEmail } = require('./services/emailService');

async function test() {
  console.log('Testing emailService.js directly...');
  console.log('FROM:', process.env.SMTP_FROM || 'Skillspherefyp@gmail.com');
  console.log('TO:', process.env.SUPPLIER_A_EMAIL);

  const result = await sendEmail({
    to: process.env.SUPPLIER_A_EMAIL,
    subject: 'SupplyPulse Verified Sender SMTP Test',
    body: 'This email was sent via emailService.js using a verified sender.\nTime: ' + new Date().toLocaleTimeString(),
  });

  console.log('Result:', JSON.stringify(result, null, 2));
}

test();
