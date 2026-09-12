"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditableSection } from "@/features/customers/profile/editable-section";
import {
  buildProfileSections,
  sectionHasAnswers,
  type Lookups,
} from "@/features/customers/profile/profile-section-specs";
import type { Customer, CustomerCategory } from "@/types/customer";

/**
 * The editable blocks of the customer profile.
 *
 * One section per group the registration wizard captures, in the same order,
 * so an officer correcting a record finds the field where they entered it.
 * Every list is the same admin-managed master data the wizard reads — nothing
 * here knows a dropdown value in advance. Which blocks exist and which
 * questions each one asks is `buildProfileSections`; this file puts them on
 * the screen.
 *
 * ## What a profile shows
 *
 * This screen used to render every column the customer resource carries,
 * printing an em dash wherever one was null. A customer registered with a
 * name, a phone and an address scrolled through seven cards and about sixty
 * dashes to reach them — the record read as a database table rather than as a
 * person, and the handful of real answers were the hardest part to find.
 *
 * Two questions decide what exists now:
 *
 *   1. IS THERE AN ANSWER? `isPresent` — not falsiness, because `0` dependants
 *      and a `0` take-home are answers. A field with no answer is not rendered
 *      when its section is closed, and a section where nothing is answered
 *      does not render at all: no card, no heading, no Edit button.
 *
 *   2. IS IT WORTH ASKING? The customer's TYPE. This only decides what an OPEN
 *      section offers and which empty blocks the officer is invited to add —
 *      it can never hide an answer, because rule one has already put every
 *      answered field on screen.
 *
 * Sections with nothing in them stay reachable: `Add information` at the foot
 * of the tab opens one, empty, ready to fill in. Hiding a card must not mean
 * losing the only way to record what belongs in it.
 */
export function ProfileSections({
  customer,
  category,
  lookups,
  branches,
  employees,
  canEdit,
}: {
  customer: Customer;
  /** The customer's TYPE — see `buildProfileSections`, which reads it. */
  category: CustomerCategory | undefined;
  lookups: Lookups;
  branches: { id: string; name: string }[];
  employees: { id: string; name: string }[];
  canEdit: boolean;
}) {
  /* Read once into a plain bag — every section reads its own keys out of it. */
  const v = customer as unknown as Record<string, string | number | null>;

  const sections = React.useMemo(
    () => buildProfileSections({ values: v, category, lookups, branches, employees }),
    [v, category, lookups, branches, employees]
  );

  /*
   * A section that holds nothing is off the screen, which would make it
   * unrecordable — so the ones this customer's type asks for are offered at
   * the foot of the tab instead, and open empty when chosen. Removed again if
   * the officer cancels without entering anything (`onDismiss`), so a declined
   * invitation does not leave an empty card behind.
   */
  const [revealed, setRevealed] = React.useState<string[]>([]);

  const missing = sections.filter(
    (s) => s.relevant && !sectionHasAnswers(s, v) && !revealed.includes(s.key)
  );

  return (
    <div className="space-y-4">
      {sections.map((section) => {
        const answered = sectionHasAnswers(section, v);
        /* Nothing recorded and nobody asked for it: not mounted at all. */
        if (!answered && !revealed.includes(section.key)) return null;

        return (
          <EditableSection
            key={section.key}
            title={section.title}
            customerId={customer.id}
            canEdit={canEdit}
            values={v}
            fields={section.fields}
            autoEdit={!answered}
            onDismiss={() => setRevealed((r) => r.filter((k) => k !== section.key))}
          />
        );
      })}

      {canEdit && missing.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Add information</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-xs text-muted-foreground">
              Nothing is recorded for these yet. Open one to fill it in.
            </p>
            <div className="flex flex-wrap gap-2">
              {missing.map((section) => (
                <Button
                  key={section.key}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setRevealed((r) => [...r, section.key])}
                >
                  <Plus className="size-3.5" />
                  {section.title}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
