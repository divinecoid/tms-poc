import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  emailAndPassword: { enabled: true, disableSignUp: true },
  user: {
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "admin", input: false },
      phone: { type: "string", required: false },
    },
  },
  advanced: {
    database: { generateId: "uuid" },
    useSecureCookies: process.env.NODE_ENV === "production",
  },
  // Batasi percobaan login (penyimpanan memori cukup untuk satu instance).
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: { "/sign-in/email": { window: 60, max: 5 } },
  },
  plugins: [nextCookies()],
});
