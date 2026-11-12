import { redirect } from "next/navigation";

/** Orders are no longer stored on a server. Receipts saved on this device replace this view. */
export default function Page(): never {
  redirect("/dashboard/receipts");
}
