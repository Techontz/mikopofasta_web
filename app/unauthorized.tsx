import { AccessDeniedState } from "@/components/feedback/access-denied-state";

/** Rendered when a Server Component/Action calls unauthorized() (Next.js 16 file convention). */
export default function Unauthorized() {
  return <AccessDeniedState title="Sign-in required" description="Please log in to continue." />;
}
