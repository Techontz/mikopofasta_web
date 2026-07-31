/**
 * Every lookup list in the ERP, in one place.
 *
 * The rule this file exists to enforce: no dropdown in the system is ever
 * empty. A select with nothing in it makes the form it sits on unusable, and
 * during a design phase it also makes the control impossible to judge — you
 * cannot tell whether a picker is well-proportioned until it is holding its
 * real number of options.
 *
 * Provenance, since it varies:
 *
 *   - Branches, loan types, customer types, banks, meeting days/times,
 *     education levels, marital statuses, house ownership and collateral types
 *     are the owner's specified lists, reproduced exactly and in order.
 *   - NEW KALENGE, Missenyi and Kakonko additionally appear in the legacy
 *     screenshots (see lib/legacy/source.ts), which is where their casing
 *     comes from.
 *   - Regions and districts are real Tanzanian administrative geography.
 *   - Wards and streets are generated per district — the legacy system takes
 *     these as free text, so there is no list to copy.
 */

/** The twelve branches. Legacy casing preserved for the three that appear in captures. */
export const BRANCHES = [
  "Head Office",
  "NEW KALENGE",
  "Missenyi",
  "Kakonko",
  "Bukoba",
  "Ngara",
  "Muleba",
  "Karagwe",
  "Kyerwa",
  "Biharamulo",
  "Geita",
  "Mwanza",
] as const;

export const GENDERS = ["Male", "Female"] as const;

export const LOAN_TYPES = [
  "Business Loan",
  "Agriculture Loan",
  "Group Loan",
  "Salary Advance",
  "Emergency Loan",
  "Education Loan",
  "Livestock Loan",
  "Women Loan",
  "Youth Loan",
  "Personal Loan",
] as const;

/**
 * Loan types offered on a new application.
 *
 * Group Loan and Personal Loan are absent by design — the owner's application
 * spec lists eight, not the ten a customer may be registered against. A group
 * loan is originated from the Group module rather than here.
 */
export const APPLICATION_LOAN_TYPES = [
  "Business Loan",
  "Agriculture Loan",
  "Salary Advance",
  "Emergency Loan",
  "Education Loan",
  "Women Loan",
  "Youth Loan",
  "Livestock Loan",
] as const;

export const CUSTOMER_TYPES = ["Individual", "Group", "Business", "Farmer", "Employee", "VIP"] as const;

export const CUSTOMER_STATUSES = ["Active", "Pending", "Suspended", "Closed"] as const;

export const MARITAL_STATUSES = ["Single", "Married", "Divorced", "Widowed"] as const;

export const EDUCATION_LEVELS = [
  "Primary",
  "Secondary",
  "Certificate",
  "Diploma",
  "Bachelor",
  "Masters",
  "PhD",
] as const;

export const HOUSE_OWNERSHIP = ["Owned", "Rented", "Employer House", "Family House"] as const;

export const BANKS = [
  "CRDB",
  "NMB",
  "NBC",
  "Absa",
  "Stanbic",
  "Equity",
  "Exim",
  "Access Bank",
  "Azania",
  "BOA",
  "KCB",
  "DTB",
] as const;

export const KIN_RELATIONSHIPS = [
  "Spouse",
  "Parent",
  "Child",
  "Sibling",
  "Uncle",
  "Aunt",
  "Cousin",
  "Friend",
  "Business Partner",
] as const;

/** Sixty occupations, weighted toward how Tanzanian microfinance customers actually earn. */
export const OCCUPATIONS = [
  "Farmer", "Livestock Keeper", "Fisherman", "Poultry Farmer", "Dairy Farmer",
  "Shopkeeper", "Kiosk Owner", "Market Vendor", "Grocer", "Butcher",
  "Tailor", "Dressmaker", "Cobbler", "Carpenter", "Mason",
  "Welder", "Mechanic", "Motorcycle Mechanic", "Electrician", "Plumber",
  "Boda Boda Rider", "Bajaj Driver", "Taxi Driver", "Truck Driver", "Bus Conductor",
  "Teacher", "Head Teacher", "Lecturer", "Nurse", "Clinical Officer",
  "Pharmacist", "Laboratory Technician", "Doctor", "Veterinary Officer", "Agricultural Officer",
  "Police Officer", "Soldier", "Civil Servant", "Ward Executive Officer", "Village Chairperson",
  "Accountant", "Bank Teller", "Insurance Agent", "Auditor", "Bookkeeper",
  "Hairdresser", "Barber", "Beautician", "Photographer", "Videographer",
  "Restaurant Owner", "Cook", "Waiter", "Bar Owner", "Hotel Manager",
  "Miner", "Quarry Worker", "Charcoal Seller", "Timber Trader", "Second-hand Clothes Dealer",
] as const;

/** Twenty-five loan purposes. */
export const LOAN_PURPOSES = [
  "Stock purchase for retail shop",
  "Expand grocery business",
  "Buy seeds and fertiliser",
  "Purchase farm machinery",
  "Irrigation equipment",
  "Buy dairy cattle",
  "Poultry house construction",
  "Fishing boat repair",
  "Purchase motorcycle for boda boda",
  "Bajaj purchase",
  "Vehicle repair and servicing",
  "Open a tailoring workshop",
  "Buy sewing machines",
  "Carpentry tools and timber",
  "Welding equipment",
  "School fees for children",
  "University tuition",
  "Medical treatment",
  "Emergency family expenses",
  "Home renovation",
  "Build rental rooms",
  "Land purchase",
  "Restaurant equipment",
  "Salon equipment and supplies",
  "Wholesale trading capital",
] as const;

export const COLLATERAL_TYPES = [
  "Vehicle",
  "Motorcycle",
  "House",
  "Land",
  "Business",
  "Salary",
  "Group Guarantee",
  "None",
] as const;

export const LOAN_DURATIONS = [
  "1 Month", "2 Months", "3 Months", "4 Months", "5 Months",
  "6 Months", "9 Months", "12 Months",
] as const;

export const INTEREST_RATES = [5, 10, 15, 20, 25, 30] as const;

export const REPAYMENT_FREQUENCIES = ["Daily", "Weekly", "Biweekly", "Monthly"] as const;

export const PENDING_LOAN_STATUSES = ["Pending", "Under Review", "Waiting Documents"] as const;

export const PENDING_CUSTOMER_STATUSES = ["New", "Returning", "VIP"] as const;

export const DISBURSED_STATUSES = ["Running", "Completed", "Overdue"] as const;

export const REJECTION_REASONS = [
  "Poor Credit History",
  "Low Income",
  "Incomplete Documents",
  "Exceeded Loan Limit",
  "Duplicate Loan",
  "Fake Information",
  "Risk Assessment Failed",
] as const;

export const GROUP_STATUSES = ["Active", "Pending", "Inactive"] as const;

export const MEETING_DAYS = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
] as const;

export const MEETING_TIMES = [
  "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "02:00 PM", "03:00 PM", "04:00 PM",
] as const;

/**
 * All thirty-one Tanzanian regions, each with its real districts.
 *
 * This is genuine administrative geography rather than invented names — a
 * Tanzanian user reading the dropdown would otherwise spot the difference
 * immediately, and district lists are the sort of thing that gets checked.
 */
export const REGION_DISTRICTS: Record<string, readonly string[]> = {
  Arusha: ["Arusha City", "Arusha Rural", "Karatu", "Longido", "Meru", "Monduli", "Ngorongoro"],
  "Dar es Salaam": ["Ilala", "Kinondoni", "Temeke", "Ubungo", "Kigamboni"],
  Dodoma: ["Dodoma City", "Bahi", "Chamwino", "Chemba", "Kondoa", "Kongwa", "Mpwapwa"],
  Geita: ["Geita Town", "Bukombe", "Chato", "Mbogwe", "Nyang'hwale"],
  Iringa: ["Iringa Municipal", "Iringa Rural", "Kilolo", "Mufindi", "Mafinga"],
  Kagera: ["Bukoba Municipal", "Bukoba Rural", "Biharamulo", "Karagwe", "Kyerwa", "Missenyi", "Muleba", "Ngara"],
  Katavi: ["Mpanda Town", "Mlele", "Tanganyika", "Nsimbo"],
  Kigoma: ["Kigoma Municipal", "Kigoma Rural", "Kasulu", "Kakonko", "Kibondo", "Buhigwe", "Uvinza"],
  Kilimanjaro: ["Moshi Municipal", "Moshi Rural", "Hai", "Rombo", "Same", "Mwanga", "Siha"],
  Lindi: ["Lindi Municipal", "Lindi Rural", "Kilwa", "Liwale", "Nachingwea", "Ruangwa"],
  Manyara: ["Babati Town", "Babati Rural", "Hanang", "Kiteto", "Mbulu", "Simanjiro"],
  Mara: ["Musoma Municipal", "Musoma Rural", "Bunda", "Butiama", "Rorya", "Serengeti", "Tarime"],
  Mbeya: ["Mbeya City", "Mbeya Rural", "Chunya", "Kyela", "Mbarali", "Rungwe"],
  Morogoro: ["Morogoro Municipal", "Morogoro Rural", "Kilombero", "Kilosa", "Mvomero", "Ulanga", "Gairo"],
  Mtwara: ["Mtwara Municipal", "Mtwara Rural", "Masasi", "Nanyumbu", "Newala", "Tandahimba"],
  Mwanza: ["Nyamagana", "Ilemela", "Kwimba", "Magu", "Misungwi", "Sengerema", "Ukerewe"],
  Njombe: ["Njombe Town", "Njombe Rural", "Ludewa", "Makete", "Wanging'ombe", "Makambako"],
  "Pemba North": ["Wete", "Micheweni"],
  "Pemba South": ["Chake Chake", "Mkoani"],
  Pwani: ["Kibaha Town", "Kibaha Rural", "Bagamoyo", "Kisarawe", "Mafia", "Mkuranga", "Rufiji"],
  Rukwa: ["Sumbawanga Municipal", "Sumbawanga Rural", "Kalambo", "Nkasi"],
  Ruvuma: ["Songea Municipal", "Songea Rural", "Mbinga", "Namtumbo", "Tunduru", "Nyasa"],
  Shinyanga: ["Shinyanga Municipal", "Shinyanga Rural", "Kahama Town", "Msalala", "Ushetu", "Kishapu"],
  Simiyu: ["Bariadi", "Busega", "Itilima", "Maswa", "Meatu"],
  Singida: ["Singida Municipal", "Singida Rural", "Iramba", "Manyoni", "Mkalama", "Ikungi"],
  Songwe: ["Vwawa", "Ileje", "Mbozi", "Momba", "Songwe"],
  Tabora: ["Tabora Municipal", "Igunga", "Kaliua", "Nzega", "Sikonge", "Urambo", "Uyui"],
  Tanga: ["Tanga City", "Handeni", "Kilindi", "Korogwe", "Lushoto", "Muheza", "Pangani", "Mkinga"],
  "Zanzibar North": ["Kaskazini A", "Kaskazini B"],
  "Zanzibar South": ["Kati", "Kusini"],
  "Zanzibar West": ["Magharibi A", "Magharibi B", "Mjini"],
};

export const REGIONS = Object.keys(REGION_DISTRICTS).sort();

/** Ward name stems, combined with a district to make a plausible ward. */
const WARD_STEMS = [
  "Mjini", "Kati", "Kaskazini", "Kusini", "Mashariki", "Magharibi",
  "Mpya", "Soko", "Stesheni", "Mission",
] as const;

/** Street name stems. */
const STREET_STEMS = [
  "Uhuru", "Nyerere", "Kenyatta", "Sokoine", "Lumumba", "Azimio",
  "Mwenge", "Umoja", "Amani", "Maendeleo", "Bagamoyo", "Shule",
] as const;

/**
 * Wards for a district, derived from its name.
 *
 * Derived rather than stored: thirty-one regions' worth of real ward lists is
 * many thousands of rows, and the legacy system takes ward as free text anyway,
 * so there is no authoritative list to reproduce. Deriving keeps the cascade
 * populated at every level without pretending to an accuracy we do not have.
 */
export function wardsFor(district: string): string[] {
  const count = 4 + (district.length % 3);
  return WARD_STEMS.slice(0, count).map((stem) => `${district} ${stem}`);
}

/** Streets for a ward, on the same principle. */
export function streetsFor(ward: string): string[] {
  const count = 3 + (ward.length % 3);
  return STREET_STEMS.slice(0, count).map((stem) => `${stem} Street`);
}

/** Districts for a region, or an empty list for an unknown one. */
export function districtsFor(region: string): readonly string[] {
  return REGION_DISTRICTS[region] ?? [];
}
