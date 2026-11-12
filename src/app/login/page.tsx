import { redirect } from "next/navigation";

/** There is no sign-in. Old links land on the home page. */
export default function LoginPage() {
  redirect("/");
}
