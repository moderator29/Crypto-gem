import type { Metadata } from "next";
import { Wizard } from "@/components/add-coin/Wizard";

export const metadata: Metadata = { title: "Add Coin" };

export default function AddCoinPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header>
        <h1 className="font-display text-3xl font-bold md:text-4xl">Add your coin</h1>
        <p className="mt-1 text-soft">List your project on Crypto Gems. Express detects most details from your contract.</p>
      </header>
      <Wizard />
    </div>
  );
}
