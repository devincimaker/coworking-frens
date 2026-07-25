/**
 * Terms & Conditions versioning.
 *
 * Bumping TERMS_VERSION re-gates every signed-in user: they land on
 * /aceptar-terminos and cannot use the app until they accept the new version.
 * Keep TERMS_VERSION and TERMS_UPDATED_AT in sync with the copy in
 * src/app/(public)/terminos/page.tsx — that page reads both from here.
 */
export const TERMS_VERSION = "1.0";
export const TERMS_UPDATED_AT = "25 de julio de 2026";
export const TERMS_CONTACT_EMAIL = "devinci.maker@gmail.com";

export const TERMS_PATH = "/terminos";
export const TERMS_ACCEPT_PATH = "/aceptar-terminos";

export type TermsFields = {
  termsAcceptedAt?: Date | null;
  termsVersion?: string | null;
};

export function hasAcceptedCurrentTerms(user: TermsFields) {
  return Boolean(user.termsAcceptedAt) && user.termsVersion === TERMS_VERSION;
}

/** Reads the acceptance checkbox from a submitted form (unchecked boxes are absent). */
export function isTermsCheckboxChecked(formData: FormData) {
  return formData.get("acceptTerms") === "on";
}

export const TERMS_REQUIRED_MESSAGE =
  "Tenés que aceptar los Términos y Condiciones para usar Frens.";
