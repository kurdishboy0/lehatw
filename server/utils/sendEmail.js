const nodemailer = require('nodemailer');

const sendEmail = async (to, subject, text) => {
  try {
    // 1. Create the transporter (the mailman)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 2. Define the email options
    const mailOptions = {
      from: process.env.EMAIL_USER, // Sender address
      to: to,                       // Receiver address
      subject: subject,             // Subject line
      text: text,                   // Plain text body
    };

    // 3. Send the email
    await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${to}`);
    
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Email could not be sent");
  }
};

module.exports = sendEmail;