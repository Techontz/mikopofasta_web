import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * The workspace root, stated rather than inferred.
   *
   * There is a stray package-lock.json in the developer's home directory, and
   * Turbopack's root detection picked *that* as the workspace root — every
   * build printed a warning saying so. It is not cosmetic: the root is what
   * module resolution and the production file trace are anchored to, so an
   * inferred root one level below `~` puts unrelated directories inside the
   * traced scope and leaves the true root ambiguous on any machine whose home
   * directory happens to contain a lockfile. Pinning it to this project makes
   * the build identical everywhere it runs.
   */
  turbopack: {
    root: path.resolve(import.meta.dirname),
  },
};

export default nextConfig;
