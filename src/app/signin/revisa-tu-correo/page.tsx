import Link from "next/link";

export default function VerifyRequestPage() {
  return (
    <div className="mt-16 text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-clay/12 text-clay">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5" width="18" height="14" rx="2.5" />
          <path d="M3 7l9 6 9-6" />
        </svg>
      </div>
      <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Revisá tu correo</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm text-faded">
        Te mandamos un link para entrar. Tocalo desde este dispositivo y listo — no hace falta
        contraseña. Podés cerrar esta pestaña.
      </p>
      <Link href="/signin" className="btn-ghost mt-6">
        Volver
      </Link>
    </div>
  );
}
