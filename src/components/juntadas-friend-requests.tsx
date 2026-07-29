"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import {
  acceptFriendRequest,
  markJuntadasFriendRequestBatchShown,
  postponeFriendRequestFromJuntadas,
} from "@/lib/actions";

export type JuntadasFriendRequest = {
  id: string;
  profileHref: string;
  requester: {
    name: string | null;
    image: string | null;
    fallbackName: string;
  };
  signal: string;
};

export function JuntadasFriendRequests({
  initialRequests,
}: {
  initialRequests: JuntadasFriendRequest[];
}) {
  // This state deliberately survives a Server Action refresh. The database marks the
  // whole batch as shown on mount, but people should still be able to answer every row
  // during this visit; each completed action removes only its own row.
  const [requests, setRequests] = useState(initialRequests);
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [focusTargetId, setFocusTargetId] = useState<string | null>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    if (initialRequests.length === 0) return;
    void markJuntadasFriendRequestBatchShown(initialRequests.map((request) => request.id));
  }, [initialRequests]);

  useEffect(() => {
    if (!focusTargetId) return;
    rowRefs.current.get(focusTargetId)?.focus();
  }, [focusTargetId, requests]);

  async function runRequestAction(
    formData: FormData,
    action: (formData: FormData) => Promise<void>,
    successMessage: string
  ) {
    const requestId = String(formData.get("requestId") ?? "");
    const requestIndex = requests.findIndex((request) => request.id === requestId);
    const focusAfterAction =
      requests[requestIndex + 1]?.id ?? requests[requestIndex - 1]?.id ?? null;
    setError(null);
    setPendingRequestId(requestId);
    try {
      await action(formData);
      setRequests((current) => current.filter((request) => request.id !== requestId));
      setAnnouncement(successMessage);
      setFocusTargetId(focusAfterAction);
    } catch {
      setError("No pudimos guardar eso. Probá de nuevo.");
      setAnnouncement("No se guardó el cambio.");
    } finally {
      setPendingRequestId(null);
    }
  }

  if (requests.length === 0) {
    return announcement ? (
      <p role="status" className="sr-only">
        {announcement}
      </p>
    ) : null;
  }

  const batchPending = pendingRequestId !== null;

  return (
    <section className="mb-7 overflow-hidden rounded-2xl bg-clay-tint shadow-[0_14px_34px_-28px_rgba(100,48,28,0.7)]">
      <div className="flex items-center justify-between gap-4 px-4 pt-4 pb-3 sm:px-5">
        <h2 className="flex min-w-0 items-center gap-2.5 font-display text-lg font-semibold text-ink">
          <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-clay" />
          <span>
            {requests.length === 1
              ? "1 persona te quiere sumar"
              : `${requests.length} personas te quieren sumar`}
          </span>
        </h2>
        <Link
          href="/friends"
          className="shrink-0 rounded-lg font-mono text-[11px] text-faded underline-offset-4 hover:text-clay hover:underline"
        >
          ver todos
        </Link>
      </div>

      <div className="bg-surface">
        <p aria-live="polite" className="sr-only">
          {announcement}
        </p>
        {error && (
          <p role="alert" className="border-b border-line px-4 py-2 text-sm text-clay-deep sm:px-5">
            {error}
          </p>
        )}
        {requests.map((request, index) => {
          const pending = pendingRequestId === request.id;
          return (
            <div
              key={request.id}
              ref={(node) => {
                if (node) rowRefs.current.set(request.id, node);
                else rowRefs.current.delete(request.id);
              }}
              tabIndex={-1}
              className={`flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-5 ${index > 0 ? "border-t border-line" : ""}`}
            >
              <Link
                href={request.profileHref}
                className="profile-link flex min-w-0 flex-1 items-center gap-3 rounded-xl outline-none hover:text-clay focus-visible:ring-2 focus-visible:ring-clay/60"
              >
                <Avatar
                  name={request.requester.name}
                  image={request.requester.image}
                  size={46}
                />
                <div className="min-w-0">
                  <p data-profile-label className="truncate font-display text-[17px] font-semibold text-ink">
                    {request.requester.name ?? request.requester.fallbackName}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-faded">
                    {request.signal}
                  </p>
                </div>
              </Link>

              <div className="ml-[58px] flex shrink-0 gap-2 sm:ml-0">
                <form
                  action={(formData) =>
                    runRequestAction(
                      formData,
                      acceptFriendRequest,
                      `Pedido de ${request.requester.name ?? request.requester.fallbackName} aceptado.`
                    )
                  }
                >
                  <input type="hidden" name="requestId" value={request.id} />
                  <button
                    disabled={batchPending}
                    className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-full bg-olive px-4 text-sm font-semibold text-white transition-[transform,background-color] active:scale-[0.98] disabled:cursor-default disabled:opacity-60 disabled:active:scale-100"
                  >
                    {pending ? "Guardando…" : "Aceptar"}
                  </button>
                </form>
                <form
                  action={(formData) =>
                    runRequestAction(
                      formData,
                      postponeFriendRequestFromJuntadas,
                      `Pedido de ${request.requester.name ?? request.requester.fallbackName} guardado para después.`
                    )
                  }
                >
                  <input type="hidden" name="requestId" value={request.id} />
                  <button
                    disabled={batchPending}
                    className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-full border border-line px-4 text-sm font-semibold text-faded transition-[transform,background-color,color] hover:bg-amenity hover:text-ink active:scale-[0.98] disabled:cursor-default disabled:opacity-60 disabled:active:scale-100"
                  >
                    Después
                  </button>
                </form>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
