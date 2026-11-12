import { describe, expect, it } from "vitest";
import { validPack } from "@/components/boost/packSelection";
import { BOOST_PACKS } from "@/lib/ads/catalog";

describe("pack preselect", () => {
  it("accepts only packs that are on sale", () => {
    const id = BOOST_PACKS[0]!.id;
    expect(validPack(id, BOOST_PACKS)).toBe(id);
    expect(validPack("nope", BOOST_PACKS)).toBeNull();
    expect(validPack("", BOOST_PACKS)).toBeNull();
    expect(validPack(undefined, BOOST_PACKS)).toBeNull();
  });
});
