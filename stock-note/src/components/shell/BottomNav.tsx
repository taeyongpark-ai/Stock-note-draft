"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Wallet, Plus, List, LineChart } from "lucide-react";

const tabs = [
  { href: "/", label: "홈", icon: Home },
  { href: "/portfolio", label: "내 투자", icon: Wallet },
  { href: "/trades/new", label: "매매등록", icon: Plus, fab: true },
  { href: "/trades", label: "거래내역", icon: List },
  { href: "/trend", label: "동향", icon: LineChart },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40">
      <div className="mx-auto w-full max-w-[480px] px-3 safe-bottom">
        <div className="bg-white/90 backdrop-blur border border-[color:var(--border)] rounded-3xl shadow-[0_8px_30px_rgba(13,21,18,0.08)] flex items-end justify-between px-2 py-2">
          {tabs.map((t) => {
            const active =
              t.href === "/"
                ? pathname === "/"
                : pathname.startsWith(t.href);
            const Icon = t.icon;
            if (t.fab) {
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className="-mt-8 flex flex-col items-center"
                  aria-label={t.label}
                >
                  <span className="w-14 h-14 rounded-full bg-[color:var(--accent)] text-white grid place-items-center shadow-lg">
                    <Icon size={26} />
                  </span>
                  <span className="text-[11px] mt-1 text-[color:var(--text-muted)]">
                    {t.label}
                  </span>
                </Link>
              );
            }
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`flex-1 flex flex-col items-center py-1.5 ${
                  active
                    ? "text-[color:var(--text)]"
                    : "text-[color:var(--text-subtle)]"
                }`}
              >
                <Icon size={22} />
                <span className="text-[11px] mt-0.5">{t.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
