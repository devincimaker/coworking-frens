"use client";

import { useActionState } from "react";
import { TermsCheckbox } from "@/components/terms-checkbox";
import { acceptTerms } from "@/lib/actions";

const initialState = {
  status: "idle" as const,
  message: "",
};

export function AcceptTermsForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, formAction, pending] = useActionState(acceptTerms, initialState);
  const statusClass = state.status === "error" ? "text-clay" : "text-olive";

  return (
    <form action={formAction} className="card p-5">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      <TermsCheckbox disabled={pending} />

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className={`min-h-5 text-sm font-bold ${statusClass}`}>
          {state.message}
        </p>
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Guardando..." : "Aceptar y seguir"}
        </button>
      </div>
    </form>
  );
}
