import { redirect } from "next/navigation";

/** Boost no longer needs a stored submission: any token is picked on /boost, so old links land there. */
export default function BoostProjectPage(): never {
  redirect("/boost");
}
