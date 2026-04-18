"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 상단 네비 탭 (모든 메인 페이지 공통). 탭 추가/숨김은 이 배열만 손대면 됨.
// "/analytics"는 의도적으로 제외 (숨김 처리). 페이지 파일은 살아 있어서 URL 직접 접근 가능.
const TABS = [
  { href: "/", label: "홈" },
  { href: "/portfolio", label: "내 투자" },
  { href: "/trades", label: "매매일지" },
  { href: "/trend", label: "동향" },
];

export default function TopTabs() {
  const pathname = usePathname();
  return (
    <div className="flex gap-5 px-1 text-lg font-bold">
      {TABS.map((t) => {
        const active =
          t.href === "/"
            ? pathname === "/"
            : pathname === t.href || pathname.startsWith(t.href + "/");
        return active ? (
          <span key={t.href} className="text-[color:var(--text)]">
            {t.label}
          </span>
        ) : (
          <Link
            key={t.href}
            href={t.href}
            className="text-[color:var(--text-subtle)]"
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
