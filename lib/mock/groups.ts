import { daysAgo, makeRandom } from "@/lib/mock/random";
import { CUSTOMERS, EMPLOYEES, type Customer } from "@/lib/mock/people";
import { BRANCHES, GROUP_STATUSES, MEETING_DAYS, MEETING_TIMES } from "@/lib/mock/reference";

/**
 * Forty village banking groups.
 *
 * Every officer of every group is a real customer FROM THAT GROUP'S BRANCH, and
 * no customer holds two offices. Both rules are enforced by construction rather
 * than by luck: a group whose treasurer is filed at another branch is the kind
 * of inconsistency that makes a reviewer stop trusting the rest of the data.
 *
 * WAZURI leads the list because it is the one group the legacy system actually
 * has — see lib/legacy/source.ts. The other thirty-nine are demo data built on
 * the names the owner supplied.
 */

export type Group = {
  id: string;
  row: number;
  name: string;
  chairperson: string;
  secretary: string;
  treasurer: string;
  members: number;
  branch: string;
  status: (typeof GROUP_STATUSES)[number];
  meetingDay: string;
  meetingTime: string;
  loanOfficer: string;
  description: string;
  formedOn: string;
};

/**
 * Group names. WAZURI is transcribed from the legacy Group List; the rest are
 * the owner's examples plus further Swahili names in the same register.
 */
const GROUP_NAMES = [
  "WAZURI",
  "Tumaini", "Umoja", "Vision", "Victory", "Twende Mbele", "Maendeleo",
  "Upendo", "Jitegemee", "Nguvu Kazi", "Mshikamano", "Faraja", "Baraka",
  "Amani", "Imani", "Neema", "Juhudi", "Bidii", "Chachu", "Mafanikio",
  "Ushirika", "Mwanzo Mpya", "Hekima", "Subira", "Uhuru", "Matumaini",
  "Kazi Bora", "Sauti Moja", "Mkombozi", "Nuru", "Pamoja", "Jasiri",
  "Mwangaza", "Tegemeo", "Ustawi", "Msingi", "Shime", "Kilimo Bora",
  "Wanawake Hodari", "Vijana Tayari",
] as const;

const DESCRIPTIONS = [
  "Weekly savings and group lending for market traders.",
  "Smallholder farmers pooling for seasonal input finance.",
  "Women's group running joint-liability business loans.",
  "Youth enterprise group focused on trade and services.",
  "Livestock keepers saving toward dairy stock.",
  "Mixed group of shopkeepers and artisans.",
  "Fishing cooperative with weekly collections.",
  "Boda boda riders saving toward motorcycle ownership.",
] as const;

export const GROUPS: Group[] = (() => {
  const rng = makeRandom(4_004);

  /*
   * Each branch's customers are handed out without replacement, so no customer
   * ends up chairing one group and keeping the register for another.
   */
  const availableByBranch = new Map<string, Customer[]>();
  for (const branch of BRANCHES) {
    availableByBranch.set(branch, CUSTOMERS.filter((c) => c.branch === branch));
  }

  return GROUP_NAMES.map((name, i) => {
    const branch = BRANCHES[1 + (i % (BRANCHES.length - 1))];
    const pool = availableByBranch.get(branch) ?? [];

    // Three distinct officers, removed from the pool so they cannot be reused.
    const officers = pool.splice(0, 3);
    const [chair, secretary, treasurer] = officers;

    const branchOfficers = EMPLOYEES.filter((e) => e.branch === branch);

    return {
      id: `grp-${i + 1}`,
      row: i + 1,
      name,
      chairperson: chair?.fullName ?? "—",
      secretary: secretary?.fullName ?? "—",
      treasurer: treasurer?.fullName ?? "—",
      members: rng.int(10, 28),
      branch,
      status: rng.chance(0.75) ? "Active" : rng.chance(0.6) ? "Pending" : "Inactive",
      meetingDay: rng.pick(MEETING_DAYS),
      meetingTime: rng.pick(MEETING_TIMES),
      loanOfficer: branchOfficers[i % Math.max(1, branchOfficers.length)]?.name ?? EMPLOYEES[0].name,
      description: rng.pick(DESCRIPTIONS),
      formedOn: daysAgo(rng.int(60, 1_200)),
    };
  });
})();

export const GROUP_NAMES_LIST = GROUPS.map((g) => g.name);
