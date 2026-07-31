/**
 * Tanzanian name pools for the demo data.
 *
 * Real Swahili and Tanzanian given names and surnames rather than transliterated
 * placeholders. It matters more than it sounds: a customer list is mostly names,
 * so the wrong ones make every screen read as fake at a glance, and column
 * widths tuned against "John Smith" break the moment a real book loads.
 *
 * Given names are split by gender because the demo derives gender from the name
 * — a list where half the Fatumas are male is the sort of detail a Tanzanian
 * reviewer spots immediately.
 */

export const MALE_FIRST_NAMES = [
  "Juma", "Hassan", "Mussa", "Salum", "Ally", "Rashid", "Omari", "Baraka",
  "Emmanuel", "Joseph", "Daniel", "Elias", "Frank", "Godfrey", "Innocent",
  "James", "Kelvin", "Lucas", "Method", "Nicolaus", "Peter", "Richard",
  "Samweli", "Thomas", "Wilfred", "Yusuph", "Zakaria", "Amani", "Deogratius",
  "Erasto", "Fadhili", "Gerald", "Hamisi", "Ibrahim", "Jackson", "Kondo",
  "Laurent", "Msafiri", "Nuru", "Onesmo", "Paulo", "Ramadhani", "Shabani",
  "Tumaini", "Upendo", "Venance", "Wilson", "Yohana", "Ezra", "Elisha",
] as const;

export const FEMALE_FIRST_NAMES = [
  "Fatuma", "Zainabu", "Halima", "Mariam", "Neema", "Rehema", "Salma", "Amina",
  "Asha", "Bahati", "Catherine", "Devota", "Esther", "Flora", "Grace",
  "Happiness", "Irene", "Joyce", "Khadija", "Lucy", "Magdalena", "Nasra",
  "Prisca", "Rukia", "Stella", "Tatu", "Upendo", "Veronica", "Witness",
  "Zuhura", "Anna", "Beatrice", "Christina", "Dorothy", "Elizabeth", "Frida",
  "Gladness", "Hawa", "Imelda", "Janeth", "Kulwa", "Loveness", "Mwajuma",
  "Nuru", "Pendo", "Regina", "Sikitu", "Theresia", "Zuena", "Rebecca",
] as const;

export const SURNAMES = [
  "Mwakalinga", "Kimaro", "Mushi", "Kessy", "Mollel", "Mbwana", "Komba", "Ngowi",
  "Massawe", "Shirima", "Urio", "Mrema", "Nyamburi", "Sanga", "Mwakasege",
  "Lyimo", "Materu", "Swai", "Temba", "Kileo", "Macha", "Minja", "Nnko",
  "Mchome", "Kivuyo", "Laizer", "Saitoti", "Ole Sanare", "Mbise", "Msuya",
  "Mtui", "Kaaya", "Nkya", "Chuwa", "Moshi", "Marealle", "Kirenga", "Mlay",
  "Mahenge", "Mwakyusa", "Mwaipopo", "Mwambene", "Kabendera", "Rutashobya",
  "Bitegeko", "Kalinga", "Rwehumbiza", "Katakuzi", "Ngalembula", "Ndilasela",
] as const;

/** A middle initial, as the legacy system records them. */
export const MIDDLE_INITIALS = "ABCDEFGHIJKLMNPRSTWYZ".split("");
