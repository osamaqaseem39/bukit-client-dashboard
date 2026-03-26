import { redirect } from "next/navigation";

export default function FacilitiesGamesRoutePage() {
  redirect("/dashboard/facilities?form=games");
}
