// SMS delivery via Twilio. Only active once TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
// and TWILIO_PHONE_NUMBER are set in the environment; otherwise callers get a clear
// "not configured" error instead of a silent failure.
const sendSms = async (to, body) => {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = process.env;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    throw new Error('SMS_NOT_CONFIGURED');
  }

  const twilio = require('twilio');
  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

  await client.messages.create({
    body,
    from: TWILIO_PHONE_NUMBER,
    to
  });
};

module.exports = sendSms;
