"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { findUserByPhone } from "@/lib/mock-data/users";

const loginSchema = z.object({
  phone: z.string().min(9, "Enter a valid phone number"),
  password: z.string().min(1, "Password is required"),
});

export interface LoginState {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

/**
 * Mock stand-in for `POST /api/v1/auth/login` (backend spec §15) — validates
 * against seeded users instead of Sanctum. Per
 * docs/frontend-technical-specification.md §2, this Server Action is the
 * only place the session cookie is written; the token/permissions never
 * reach the browser directly.
 */
export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    phone: formData.get("phone"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, message: "Please check the form.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const credential = findUserByPhone(parsed.data.phone);
  if (!credential || credential.password !== parsed.data.password) {
    return { ok: false, message: "Invalid phone number or password." };
  }

  const { password, ...user } = credential;
  void password; // never persisted into the session — see AuthenticatedUser
  const session = await getSession();
  session.user = user;
  await session.save();

  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}
