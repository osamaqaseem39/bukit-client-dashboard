import { redirect } from "next/navigation";

export default function FacilitiesPricesRoutePage() {
  redirect("/dashboard/facilities?form=prices");
}
