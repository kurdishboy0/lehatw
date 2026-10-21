# Verification and password-reset email

The server supports Gmail's HTTPS API with `EMAIL_TRANSPORT=gmail_api`.
Local development can still use `EMAIL_USER` and `EMAIL_PASS` over SMTP.
On Render, SMTP fails promptly rather than leaving the verification page waiting.

Before enabling HTTPS delivery:

1. Enable the Gmail API in the sending mailbox's Google Cloud project.
2. Obtain the mailbox owner's explicit consent for the `https://www.googleapis.com/auth/gmail.send` permission and offline access. Google sign-in for Lehatw does not grant permission to send mail.
3. Generate a refresh token through a trusted OAuth flow for that mailbox. Keep it and the OAuth client secret private.
4. Configure the server environment using the names in `server/email.env.example`. `EMAIL_USER` must be that mailbox or one of its configured sending aliases.
5. Redeploy the backend. Test verification and password reset with a mailbox you control, including checking the spam folder. No test email is sent automatically by the automated tests.

Without these credentials, the UI reports delivery as unavailable and keeps verification required. Never put the sender credentials in frontend build variables or Git. Tokens issued while an external OAuth app is in testing can expire; use Google's supported production configuration before relying on this for ongoing delivery.

References: [sending mail](https://developers.google.com/workspace/gmail/api/guides/sending), [server-side authorization](https://developers.google.com/workspace/gmail/api/auth/web-server).
