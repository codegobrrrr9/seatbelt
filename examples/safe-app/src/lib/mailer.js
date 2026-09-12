import nodemailer from 'nodemailer';

export const transport = nodemailer.createTransport({
  host: 'smtp.example-mail.net',
  port: 587,
  auth: { user: 'hello@notesapp.io', password: process.env.SMTP_PASSWORD },
});
