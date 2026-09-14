import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../middleware/error.js";
import { signToken } from "../../middleware/auth.js";
import { sendVerificationEmail } from "../../services/email.service.js";
import { ivyLogin } from "../../services/ivy-api.service.js";
import { env } from "../../config/env.js";
import type { Request, Response } from "express";
import type { Role } from "@prisma/client";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
  role: z.enum(["CUSTOMER", "SELLER"]).default("CUSTOMER"),
  companyName: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function cookieOpts() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: env.nodeEnv === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  };
}

function otp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function issueVerification(userId: string, email: string) {
  const code = otp();
  const otpHash = await bcrypt.hash(code, 10);
  await prisma.emailVerification.create({
    data: {
      userId,
      otpHash,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });
  const mail = await sendVerificationEmail(email, code);
  return { code, mail };
}

export async function register(req: Request, res: Response) {
  const body = registerSchema.parse(req.body);
  const existing = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
  if (existing) throw new HttpError(409, "Email already registered");
  const passwordHash = await bcrypt.hash(body.password, 12);
  const role: Role = body.role;
  const user = await prisma.user.create({
    data: {
      email: body.email.toLowerCase(),
      passwordHash,
      name: body.name,
      phone: body.phone,
      role,
      sellerProfile:
        role === "SELLER"
          ? { create: { companyName: body.companyName, status: "PENDING_VERIFICATION" } }
          : undefined,
    },
  });
  const { mail } = await issueVerification(user.id, user.email);
  res.status(201).json({
    message: "Registered. Verify email with the OTP sent.",
    email: user.email,
    role: user.role,
    devOtpHint: env.nodeEnv !== "production" && mail.otpLogged,
  });
}

export async function verifyEmail(req: Request, res: Response) {
  const { email, otp } = z.object({ email: z.string().email(), otp: z.string().min(4) }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() }, include: { sellerProfile: true } });
  if (!user) throw new HttpError(404, "User not found");
  const rec = await prisma.emailVerification.findFirst({
    where: { userId: user.id, usedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!rec) throw new HttpError(400, "No verification pending");
  if (rec.attempts >= 5) throw new HttpError(429, "Too many attempts. Request a new OTP.");
  if (rec.expiresAt < new Date()) throw new HttpError(400, "OTP expired");
  const ok = await bcrypt.compare(otp, rec.otpHash);
  await prisma.emailVerification.update({
    where: { id: rec.id },
    data: { attempts: { increment: 1 }, usedAt: ok ? new Date() : null },
  });
  if (!ok) throw new HttpError(400, "Invalid OTP");
  await prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
  if (user.role === "SELLER" && user.sellerProfile) {
    await prisma.sellerProfile.update({
      where: { userId: user.id },
      data: { status: "PENDING_APPROVAL" },
    });
  }
  res.json({ message: "Email verified", sellerPending: user.role === "SELLER" });
}

export async function resendOtp(req: Request, res: Response) {
  const { email } = z.object({ email: z.string().email() }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) throw new HttpError(404, "User not found");
  if (user.emailVerifiedAt) throw new HttpError(400, "Already verified");
  const recent = await prisma.emailVerification.findFirst({
    where: { userId: user.id, createdAt: { gt: new Date(Date.now() - 60_000) } },
  });
  if (recent) throw new HttpError(429, "Wait a minute before requesting another OTP");
  await issueVerification(user.id, user.email);
  res.json({ message: "OTP sent" });
}

export async function login(req: Request, res: Response) {
  const body = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({
    where: { email: body.email.toLowerCase() },
    include: { sellerProfile: true },
  });
  if (!user) throw new HttpError(401, "Invalid credentials");
  const ok = await bcrypt.compare(body.password, user.passwordHash);
  if (!ok) throw new HttpError(401, "Invalid credentials");
  if (!user.emailVerifiedAt && user.role !== "SUPERADMIN") {
    throw new HttpError(403, "Email not verified");
  }
  if (user.role === "SELLER") {
    const st = user.sellerProfile?.status;
    if (st === "PENDING_APPROVAL" || st === "PENDING_VERIFICATION") {
      throw new HttpError(403, "Seller account awaiting superadmin approval");
    }
    if (st === "REJECTED") throw new HttpError(403, "Seller application was rejected");
    if (st === "SUSPENDED") throw new HttpError(403, "Seller account is suspended");
  }
  const token = signToken({ id: user.id, email: user.email, role: user.role, name: user.name });
  res.cookie("token", token, cookieOpts());
  res.json({
    token,
    user: publicUser(user),
  });
}

export async function ivyDemoLogin(req: Request, res: Response) {
  const body = loginSchema.parse(req.body);
  const ivy = await ivyLogin(body.email, body.password);
  const ivyToken = String((ivy as { token?: string }).token ?? (ivy as { access_token?: string }).access_token ?? "");
  const ivyUser = (ivy as { user?: { email?: string; name?: string } }).user;
  const email = (ivyUser?.email ?? body.email).toLowerCase();
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name: ivyUser?.name ?? email,
        passwordHash: await bcrypt.hash(body.password, 12),
        role: "CUSTOMER",
        emailVerifiedAt: new Date(),
        ivyAccessToken: ivyToken,
      },
    });
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { ivyAccessToken: ivyToken },
    });
  }
  const token = signToken({ id: user.id, email: user.email, role: user.role, name: user.name });
  res.cookie("token", token, cookieOpts());
  res.cookie("ivy_token", ivyToken, cookieOpts());
  res.json({ token, ivy, user: publicUser(user) });
}

export async function me(req: Request, res: Response) {
  if (!req.user) throw new HttpError(401, "Authentication required");
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { sellerProfile: true },
  });
  if (!user) throw new HttpError(404, "Not found");
  res.json({ user: publicUser(user) });
}

export async function logout(req: Request, res: Response) {
  res.clearCookie("token", { path: "/" });
  res.clearCookie("ivy_token", { path: "/" });
  res.json({ ok: true });
}

export async function updateProfile(req: Request, res: Response) {
  if (!req.user) throw new HttpError(401, "Authentication required");
  const body = z.object({ name: z.string().min(2).optional(), phone: z.string().optional() }).parse(req.body);
  const user = await prisma.user.update({ where: { id: req.user.id }, data: body, include: { sellerProfile: true } });
  res.json({ user: publicUser(user) });
}

function publicUser(user: {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: Role;
  emailVerifiedAt: Date | null;
  sellerProfile?: { status: string; companyName: string | null } | null;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: user.role,
    emailVerifiedAt: user.emailVerifiedAt,
    sellerStatus: user.sellerProfile?.status ?? null,
    companyName: user.sellerProfile?.companyName ?? null,
  };
}
