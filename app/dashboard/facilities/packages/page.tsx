import { redirect } from "next/navigation";

export default function FacilitiesPackagesRoutePage() {
  redirect("/dashboard/facilities?form=packages");
}
