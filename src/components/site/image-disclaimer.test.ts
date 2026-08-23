import { describe, expect, it } from "vitest";
import {
  IMAGE_DISCLAIMER_CLASSES,
  IMAGE_DISCLAIMER_ICON_CLASS,
} from "./image-disclaimer";

/**
 * Size/padding guard: the disclaimer must stay tiny and non-disruptive.
 * If these snapshots change, confirm the new sizing is intentional.
 */
describe("ImageDisclaimer styling", () => {
  it("keeps responsive class snapshots", () => {
    expect(IMAGE_DISCLAIMER_CLASSES).toMatchInlineSnapshot(`
      {
        "inline": "inline-flex items-center gap-1 text-[8px] sm:text-[9px] font-normal italic leading-none text-ash/50",
        "overlay": "inline-flex items-center gap-1 rounded bg-background/50 px-1 py-0.5 sm:px-1.5 sm:py-1 text-[8px] sm:text-[9px] font-normal italic leading-none text-ash/50",
      }
    `);
    expect(IMAGE_DISCLAIMER_ICON_CLASS).toMatchInlineSnapshot(
      `"h-2 w-2 sm:h-2.5 sm:w-2.5 shrink-0"`,
    );
  });

  it("stays at mobile-first 8px with a 9px desktop step", () => {
    for (const cls of Object.values(IMAGE_DISCLAIMER_CLASSES)) {
      expect(cls).toContain("text-[8px]");
      expect(cls).toContain("sm:text-[9px]");
      expect(cls).toContain("italic");
    }
  });
});
