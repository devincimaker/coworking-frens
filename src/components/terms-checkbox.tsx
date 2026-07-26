import Link from "next/link";
import { TERMS_PATH } from "@/lib/terms";

/**
 * The consent control. Rendered in onboarding and on the standalone acceptance gate,
 * so the wording people agree to is identical in both places. `required` blocks the
 * submit in the browser; the server actions re-check it (see isTermsCheckboxChecked).
 */
export function TermsCheckbox({
  id = "accept-terms",
  disabled = false,
  className = "mt-5",
}: {
  id?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label
      htmlFor={id}
      className={[
        "flex cursor-pointer items-center gap-2.5 text-[13px] font-medium text-faded",
        className,
      ].join(" ")}
    >
      <input
        id={id}
        name="acceptTerms"
        type="checkbox"
        required
        disabled={disabled}
        className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--color-clay)]"
      />
      <span>
        Leí y acepto los{" "}
        <Link
          href={TERMS_PATH}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-clay underline"
        >
          Términos y Condiciones
        </Link>
      </span>
    </label>
  );
}
