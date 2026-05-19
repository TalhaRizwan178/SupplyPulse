const axios = require('axios');

// Uses Green API — connect your own WhatsApp number via QR.
// To authorize: go to your Green API dashboard → click "QR code" → scan with WhatsApp.
// Add to .env once authorized:
//   WHATSAPP_API_URL=https://7107.api.greenapi.com
//   WHATSAPP_INSTANCE_ID=7107623281
//   WHATSAPP_INSTANCE_TOKEN=49e5d7f31ce047c08e22fafd6e7b41f6266ce318bceb44efa1
//   WHATSAPP_PHONE=923325544708   (recipient, country code, no + or spaces)

async function sendWhatsApp({ phone, message }) {
  const apiUrl        = process.env.WHATSAPP_API_URL;
  const instanceId    = process.env.WHATSAPP_INSTANCE_ID;
  const instanceToken = process.env.WHATSAPP_INSTANCE_TOKEN;
  const recipient     = phone || process.env.WHATSAPP_PHONE;

  if (!apiUrl || !instanceId || !instanceToken) {
    console.log(`[WhatsApp Mock] TO: ${recipient || 'unset'}`);
    console.log(`[WhatsApp Mock] MSG: ${message}`);
    return { mocked: true };
  }

  try {
    const url = `${apiUrl}/waInstance${instanceId}/sendMessage/${instanceToken}`;
    const res = await axios.post(url, {
      chatId: `${recipient}@c.us`,
      message,
    }, { timeout: 15000 });

    console.log(`[WhatsApp Sent] → ${recipient} | idMessage: ${res.data?.idMessage}`);
    return { sent: true, idMessage: res.data?.idMessage };
  } catch (err) {
    console.error(`[WhatsApp Error] ${err.message}`);
    return { error: err.message };
  }
}

module.exports = { sendWhatsApp };
