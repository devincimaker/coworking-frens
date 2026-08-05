import type { Ref } from "react";

// The optional "why" box both cancel-confirm panels share, so the copy and
// limit can't drift between them. Server-side cap: MAX_CANCELLATION_REASON_LENGTH.
export function CancelReasonField({
  id,
  name,
  ref,
}: {
  id: string;
  name?: string;
  ref?: Ref<HTMLTextAreaElement>;
}) {
  return (
    <>
      <label htmlFor={id} className="sr-only">
        Motivo de la cancelación (opcional)
      </label>
      <textarea
        id={id}
        name={name}
        ref={ref}
        rows={2}
        maxLength={280}
        placeholder="Me surgió algo, lo movemos pronto… (opcional)"
        className="input mt-3 min-h-20 resize-y leading-relaxed"
      />
    </>
  );
}
