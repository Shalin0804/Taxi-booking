import nodemailer from 'nodemailer'

// SMTP_URL, e.g. smtps://user:pass@smtp.example.com:465 . MAIL_FROM sets the sender.
// Without SMTP_URL (local development) the message is printed to the server log instead.
const transport = process.env.SMTP_URL ? nodemailer.createTransport(process.env.SMTP_URL) : null

export async function sendMail({ to, subject, text }) {
  if (!transport) {
    console.log(`[mail:dev] To: ${to}\nSubject: ${subject}\n\n${text}\n`)
    return
  }
  await transport.sendMail({ from: process.env.MAIL_FROM || 'TTT Cabs <no-reply@tttcabs.com>', to, subject, text })
}
