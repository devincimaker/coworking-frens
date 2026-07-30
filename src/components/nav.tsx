"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { ThemeToggle } from "@/components/theme-toggle";

type NavItem = {
  href: string;
  label: string;
  short: string;
  icon: (props: { className?: string }) => React.ReactElement;
};

const HomeIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 11l8-6 8 6" />
    <path d="M6 10v9h12v-9" />
  </svg>
);
const HostIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="5" width="16" height="15" rx="2.5" />
    <path d="M4 9.5h16" />
    <path d="M8.5 3v4M15.5 3v4" />
  </svg>
);
const SearchIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10.5" cy="10.5" r="5.7" />
    <path d="m15 15 4.5 4.5" />
  </svg>
);
const FriendsIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="9" r="3.2" />
    <circle cx="16.5" cy="10.5" r="2.4" />
    <path d="M3.5 19c0-3 2.6-4.6 5.5-4.6s5.5 1.6 5.5 4.6" />
    <path d="M16 14.6c2.2.1 4 1.5 4 4" />
  </svg>
);
const FeedbackIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
    <path d="M8 9h8" />
    <path d="M8 13h5" />
  </svg>
);

const ITEMS: NavItem[] = [
  { href: "/juntadas", label: "Juntadas", short: "Juntadas", icon: HomeIcon },
  { href: "/gente", label: "Gente", short: "Gente", icon: SearchIcon },
  { href: "/host", label: "Ser anfitrión", short: "Anfitrión", icon: HostIcon },
  { href: "/friends", label: "Amigos", short: "Amigos", icon: FriendsIcon },
];
const FEEDBACK_ITEM: NavItem = {
  href: "/admin/feedback",
  label: "Feedback",
  short: "Feedback",
  icon: FeedbackIcon,
};

function navItems(showFeedbackAdmin?: boolean) {
  return showFeedbackAdmin ? [...ITEMS, FEEDBACK_ITEM] : ITEMS;
}

function useActive() {
  const pathname = usePathname();
  return (href: string) => {
    if (href === "/juntadas") return pathname === "/juntadas" || pathname.startsWith("/day");
    return pathname.startsWith(href);
  };
}

export function Sidebar({
  user,
  signOutAction,
  showFeedbackAdmin = false,
  unseenFriendRequestCount = 0,
}: {
  user: { name?: string | null; username?: string | null; image?: string | null };
  signOutAction: () => Promise<void>;
  showFeedbackAdmin?: boolean;
  unseenFriendRequestCount?: number;
}) {
  const isActive = useActive();
  const hideFriendRequestBadge = isActive("/friends");
  return (
    <aside className="sticky top-0 hidden h-dvh w-[250px] shrink-0 flex-col gap-1 border-r border-line px-4 py-8 md:flex">
      <Link href="/juntadas" className="mb-6 flex items-center gap-2.5 px-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-clay font-display text-base font-bold text-on-action">
          F
        </span>
        <span className="font-display text-xl font-bold text-ink">Frens</span>
      </Link>

      {navItems(showFeedbackAdmin).map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-[13px] px-3.5 py-3 text-[15px] font-semibold transition-colors ${
              active
                ? "bg-clay-tint text-nav-active-ink"
                : "text-faded hover:bg-amenity hover:text-ink"
            }`}
          >
            <item.icon />
            <span>{item.label}</span>
            {item.href === "/friends" &&
              !hideFriendRequestBadge &&
              unseenFriendRequestCount > 0 && (
                <span
                  aria-label={`${unseenFriendRequestCount} pedidos de amistad nuevos`}
                  className="ml-auto min-w-6 rounded-full bg-clay px-1.5 py-0.5 text-center font-mono text-[11px] font-semibold leading-5 text-on-action"
                >
                  {unseenFriendRequestCount > 99 ? "99+" : unseenFriendRequestCount}
                </span>
              )}
          </Link>
        );
      })}

      <div className="flex-1" />

      <div className="flex items-center gap-2.5 border-t border-line pt-4">
        <Link href="/profile" className="profile-link flex min-w-0 flex-1 items-center gap-2.5">
          <Avatar name={user.name ?? null} image={user.image ?? null} size={34} />
          <div className="min-w-0 leading-tight">
            <div data-profile-label className="truncate text-sm font-semibold text-ink">{user.name ?? "Vos"}</div>
            <div data-profile-label className="truncate font-mono text-[11px] text-faded">
              @{user.username ?? "perfil"}
            </div>
          </div>
        </Link>
        <ThemeToggle />
        <form action={signOutAction}>
          <button
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-faded transition-colors hover:bg-amenity hover:text-ink"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17l5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
          </button>
        </form>
      </div>
    </aside>
  );
}

export function BottomNav({
  showFeedbackAdmin = false,
  unseenFriendRequestCount = 0,
}: {
  showFeedbackAdmin?: boolean;
  unseenFriendRequestCount?: number;
}) {
  const isActive = useActive();
  const hideFriendRequestBadge = isActive("/friends");
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex h-[var(--bottom-nav-h)] border-t border-line bg-paper/90 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md md:hidden">
      {navItems(showFeedbackAdmin).map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex flex-1 flex-col items-center gap-1 ${active ? "text-clay" : "text-faded"}`}
          >
            <span className="relative">
              <item.icon />
              {item.href === "/friends" &&
                !hideFriendRequestBadge &&
                unseenFriendRequestCount > 0 && (
                  <span
                    aria-label={`${unseenFriendRequestCount} pedidos de amistad nuevos`}
                    className="absolute -top-2 -right-3 min-w-4 rounded-full bg-clay px-1 text-center font-mono text-[9px] font-semibold leading-4 text-on-action ring-2 ring-paper"
                  >
                    {unseenFriendRequestCount > 9 ? "9+" : unseenFriendRequestCount}
                  </span>
                )}
            </span>
            <span className="text-[10px] font-semibold">{item.short}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileTopBar({
  user,
}: {
  user: { name?: string | null; image?: string | null };
}) {
  return (
    <div className="flex items-center justify-between px-5 pt-6 pb-1 md:hidden">
      <Link href="/juntadas" className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-clay font-display text-sm font-bold text-on-action">
          F
        </span>
        <span className="font-display text-xl font-bold text-ink">Frens</span>
      </Link>
      {/* Up here rather than in the tab bar: that bar is already four or five
          items wide on a phone, and the theme is not a destination. */}
      <div className="flex items-center gap-1.5">
        <ThemeToggle />
        <Link href="/profile" aria-label="Perfil">
          <Avatar name={user.name ?? null} image={user.image ?? null} size={36} />
        </Link>
      </div>
    </div>
  );
}
