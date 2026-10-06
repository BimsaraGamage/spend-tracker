import { describe, expect, test } from "@jest/globals";

import { cn } from "./cn";

describe("cn", () => {
  test("joins class names and drops the ones that are switched off", () => {
    expect(cn("p-4", false, undefined, "text-sm")).toBe("p-4 text-sm");
  });

  test("lets a later class override an earlier one for the same property", () => {
    expect(cn("px-2 text-foreground", "px-4")).toBe("text-foreground px-4");
  });
});
