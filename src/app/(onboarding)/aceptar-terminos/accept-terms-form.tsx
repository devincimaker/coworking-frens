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
    <form action={formAction} className="card p-6">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      <TermsCheckbox
        disabled={pending}
        className="justify-center text-center text-sm sm:text-[15px]"
      />

      <div className="mt-5 flex flex-col items-stretch gap-3 sm:items-center">
        {state.message ? (
          <p aria-live="polite" className={`text-center text-sm font-bold ${statusClass}`}>
            {state.message}
          </p>
        ) : null}
        <button
          type="submit"
          className="btn-primary w-full py-3 sm:w-auto sm:px-6"
          disabled={pending}
        >
          {pending ? "Guardando..." : "Aceptar y seguir"}
        </button>
      </div>
    </form>
  );
}
