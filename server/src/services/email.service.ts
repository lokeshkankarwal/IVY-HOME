import nodemailer from "nodemailer";
import { env } from "../config/env.js";

function transport() {
  if (env.smtpHost) {
    return nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPass } : undefined,
    });
  }
  return nodemailer.createTransport({ jsonTransport: true });
}

export async function sendVerificationEmail(to: string, otp: string) {
  const t = transport();
  const info = await t.sendMail({
    from: env.smtpFrom,
    to,
    subject: "Verify your Ivy Homes account",
    text: `Your verification code is ${otp}. It expires in 15 minutes.`,
    html: `<p>Your verification code is <b>${otp}</b>.</p><p>It expires in 15 minutes.</p>`,
  });
  if (!env.smtpHost) {
    console.log(`[email] OTP for ${to}: ${otp}`);
    console.log("[email] json transport", (info as unknown as { message?: string }).message || info.messageId);
  }
  return { otpLogged: !env.smtpHost };
}
