import {
  ManualIdentityProvider,
  type CustomerIdentityProvider,
} from "@/features/customers/identity/identity-provider";

/**
 * The provider the registration wizard uses.
 *
 * ONE LINE. When NIDA credentials arrive, import `NidaIdentityProvider` and
 * assign it here — the wizard reads `supportsLookup`, `identityIsUserEntered`
 * and `requiresNationalId` off whatever this returns, so the lookup control,
 * the OTP step and the read-only identity fields all come back on their own.
 */
export const activeIdentityProvider: CustomerIdentityProvider = ManualIdentityProvider;
