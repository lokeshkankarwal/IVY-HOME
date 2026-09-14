import { Router } from "express";
import * as c from "./auth.controller.js";
import { requireAuth } from "../../middleware/auth.js";

export const authRouter = Router();

authRouter.post("/register", c.register);
authRouter.post("/verify-email", c.verifyEmail);
authRouter.post("/verify", c.verifyEmail);       // alias: frontend calls /auth/verify
authRouter.post("/resend-otp", c.resendOtp);
authRouter.post("/login", c.login);
authRouter.post("/ivy-login", c.ivyDemoLogin);
authRouter.post("/logout", c.logout);
authRouter.get("/me", requireAuth, c.me);
authRouter.patch("/me", requireAuth, c.updateProfile);
authRouter.patch("/profile", requireAuth, c.updateProfile); // alias: frontend calls /auth/profile
