import { redirect } from "next/navigation";

/** Phone Bond is now eSIMU: its devices live under eSIMU → Devices. */
export default function PhoneBondPage() {
  redirect("/esimu/devices");
}
