import { AccessDeniedState } from "@/components/feedback/access-denied-state";

/** Rendered when a Server Component/Action calls forbidden() (Next.js 16 file convention). */
export default function Forbidden() {
  return <AccessDeniedState title="Access forbidden" description="You don't have permission to perform this action." />;
}
