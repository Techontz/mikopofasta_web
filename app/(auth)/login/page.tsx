import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm, LoginFormSkeleton } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "Log in | M-Kopa",
};

export default function LoginPage() {
  /*
   * The form reads `?expired=1` to explain an involuntary sign-out, and
   * `useSearchParams` opts a component out of prerendering. Suspense keeps that
   * boundary at the form rather than at the page, so the card's shell is still
   * static HTML and the login screen does not flash empty on a slow phone.
   */
  return (
    <Suspense fallback={<LoginFormSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}
