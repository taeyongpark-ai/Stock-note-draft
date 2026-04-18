import Link from "next/link";
import { Search, Bell, User } from "lucide-react";

export default function TopHeader() {
  return (
    <header className="px-4 pt-4 pb-2 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-[color:var(--accent)] text-white grid place-items-center font-black text-lg">
          N
        </div>
        <span className="sr-only">매매노트</span>
      </Link>
      <div className="flex items-center gap-4 text-[color:var(--text-muted)]">
        <button aria-label="검색"><Search size={22} /></button>
        <button aria-label="알림"><Bell size={22} /></button>
        <button aria-label="프로필"><User size={22} /></button>
      </div>
    </header>
  );
}
