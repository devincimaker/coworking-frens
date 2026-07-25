import { describe, expect, it } from "vitest";
import {
  hasAcceptedCurrentTerms,
  isTermsCheckboxChecked,
  TERMS_VERSION,
} from "./terms";

describe("hasAcceptedCurrentTerms", () => {
  it("accepts a user who signed the current version", () => {
    expect(
      hasAcceptedCurrentTerms({ termsAcceptedAt: new Date(), termsVersion: TERMS_VERSION })
    ).toBe(true);
  });

  it("re-gates a user who only signed an older version", () => {
    expect(
      hasAcceptedCurrentTerms({ termsAcceptedAt: new Date(), termsVersion: "0.9" })
    ).toBe(false);
  });

  it("re-gates a user who never accepted", () => {
    expect(hasAcceptedCurrentTerms({ termsAcceptedAt: null, termsVersion: null })).toBe(false);
  });

  it("ignores a version stamped without a timestamp", () => {
    expect(hasAcceptedCurrentTerms({ termsAcceptedAt: null, termsVersion: TERMS_VERSION })).toBe(
      false
    );
  });
});

describe("isTermsCheckboxChecked", () => {
  it("is true only when the checkbox was submitted", () => {
    const checked = new FormData();
    checked.set("acceptTerms", "on");
    expect(isTermsCheckboxChecked(checked)).toBe(true);
  });

  it("is false when the box is left unchecked (browsers omit the field)", () => {
    expect(isTermsCheckboxChecked(new FormData())).toBe(false);
  });

  it("is false for a forged value", () => {
    const forged = new FormData();
    forged.set("acceptTerms", "true");
    expect(isTermsCheckboxChecked(forged)).toBe(false);
  });
});
