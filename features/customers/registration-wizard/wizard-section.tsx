"use client";

import * as React from "react";

/**
 * A titled block inside a wizard step.
 *
 * Collapsing seven steps into three means each step now holds two or three
 * groups of fields, and without a heading between them the officer gets one
 * undifferentiated wall of inputs. These are the boundaries the old steps used
 * to be — the seam is kept, the click is not.
 */
export function WizardSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="border-b pb-2">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

/**
 * The captured face, shown on the Passport & Bank step.
 *
 * The legacy step is called "Passport size & Bank Detail", and the passport
 * photo in this system is the liveness capture — there is one endpoint for a
 * customer photo and it is `face-verify`. So rather than asking for a second
 * image that nothing would store, this shows the one already taken and sends
 * the officer back a step to retake it if it is wrong.
 */
export function PassportPreview({ capture }: { capture: File | null }) {
  const url = React.useMemo(() => (capture ? URL.createObjectURL(capture) : null), [capture]);
  React.useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  if (!capture || !url) {
    return (
      <p className="text-sm text-muted-foreground">
        No capture attached. Go back to Basic Information to take the customer&rsquo;s photo — it is
        required before registration.
      </p>
    );
  }

  return (
    <div className="flex items-center gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element -- a local object URL */}
      <img
        src={url}
        alt="Customer passport photo"
        className="size-28 rounded-md border object-cover"
      />
      <div className="space-y-1 text-sm">
        <p className="font-medium">Passport photo attached</p>
        <p className="text-xs text-muted-foreground">
          {capture.name} · {(capture.size / 1024).toFixed(0)} KB
        </p>
        <p className="text-xs text-muted-foreground">
          Stored as the customer&rsquo;s photo and checked by the API when registration is submitted.
        </p>
      </div>
    </div>
  );
}
