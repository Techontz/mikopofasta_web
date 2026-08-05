import type { Gender } from "@/types/enums";

/**
 * Where a customer's identity comes from.
 *
 * The registration wizard does not know, and must not know, whether the person
 * in front of the officer was looked up in a national registry or typed in by
 * hand. It asks a provider for an identity and renders whatever contract the
 * provider declares. Swapping providers is then a one-line change in
 * `active-provider.ts`, not a rewrite of the registration module.
 *
 * WHY THIS EXISTS NOW. Until today the wizard was wired directly to a NIDA
 * lookup and an OTP step, both served by `NidaRegistry` on the API — a class
 * that generated a name, a date of birth and a gender from a hash of whatever
 * number was typed. The flow looked like verification and was not: every
 * customer registered through it carried an invented identity and three
 * timestamps vouching for checks that never ran.
 *
 * There is no registry to call yet, so the supported flow is manual entry. But
 * the shape of "get me an identity" is worth keeping, because the day NIDA
 * credentials arrive the only thing that should change is which implementation
 * is active.
 */

/** The identity fields a provider is responsible for. */
export interface CustomerIdentity {
  firstName: string;
  middleName: string | null;
  lastName: string;
  dob: string;
  gender: Gender;
  /** The National ID, when the provider deals in one. */
  nationalId: string | null;
}

/**
 * What a provider guarantees about an identity it produced.
 *
 * `null` throughout means "nothing was checked", which is the truthful answer
 * for a manual entry and the one the API now stores. A provider must never
 * report a timestamp for a check it did not perform — that is precisely the
 * failure this abstraction replaced.
 */
export interface IdentityAssurance {
  nidaVerifiedAt: string | null;
  otpVerifiedAt: string | null;
}

export interface CustomerIdentityProvider {
  /** Stable key, for logging and for telling implementations apart in tests. */
  readonly id: string;

  /** Shown to the officer so the screen can say how identity is being captured. */
  readonly label: string;

  /**
   * Whether the officer types the identity fields.
   *
   * True for manual entry. False for a registry-backed provider, where the
   * fields are filled from the lookup and must not be editable — §9's rule
   * that identity is never hand-typed, which becomes enforceable again the
   * moment a real registry exists.
   */
  readonly identityIsUserEntered: boolean;

  /** Whether the wizard should render a lookup control and an OTP step. */
  readonly supportsLookup: boolean;

  /** Whether a National ID must be present before registration is allowed. */
  readonly requiresNationalId: boolean;

  /** What this provider can honestly assert about an identity it produced. */
  assuranceFor(identity: CustomerIdentity): IdentityAssurance;
}

/**
 * The officer enters the identity from the customer's documents.
 *
 * No lookup, no OTP, no assurance claimed. The National ID is optional: many
 * customers of a Tanzanian microfinance institution do not carry one, and the
 * API accepts the record without it and rates its KYC `incomplete` — which is
 * the accurate description of a record nothing has verified.
 */
export const ManualIdentityProvider: CustomerIdentityProvider = {
  id: "manual",
  label: "Manual entry",
  identityIsUserEntered: true,
  supportsLookup: false,
  requiresNationalId: false,
  assuranceFor: () => ({ nidaVerifiedAt: null, otpVerifiedAt: null }),
};

/*
 * The NIDA provider goes here when the integration lands. Sketching the shape
 * rather than the implementation, so the contract above is demonstrably
 * sufficient for it:
 *
 *   export const NidaIdentityProvider: CustomerIdentityProvider = {
 *     id: "nida",
 *     label: "NIDA registry",
 *     identityIsUserEntered: false,   // filled by the lookup, read-only
 *     supportsLookup: true,           // wizard renders lookup + OTP again
 *     requiresNationalId: true,
 *     assuranceFor: (identity) => ({ ... real timestamps ... }),
 *   };
 *
 * Note what is NOT in this interface: the lookup call itself, the OTP
 * exchange, and the simulator's fixed code. Those belong to the provider that
 * has them, reached through `supportsLookup`, so a provider without them
 * carries no dead surface.
 */
