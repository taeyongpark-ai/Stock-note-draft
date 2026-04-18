import { Card } from "@/components/ui/Card";
import { Star } from "lucide-react";

export default function WatchlistPage() {
  return (
    <div className="space-y-4 pt-2">
      <div className="flex gap-5 px-1 text-lg font-bold">
        <span className="text-[color:var(--text)]">관심종목</span>
      </div>
      <Card className="px-5 py-12 text-center">
        <div className="w-14 h-14 rounded-full bg-[color:var(--card-muted)] mx-auto grid place-items-center">
          <Star size={24} className="text-[color:var(--text-subtle)]" />
        </div>
        <div className="mt-4 font-bold text-[16px]">관심종목은 다음 단계에서</div>
        <p className="mt-1 text-sm text-[color:var(--text-muted)]">
          매매는 안 했지만 지켜보는 종목을 등록하면, 나중에 "그때 샀으면 어땠을까" 까지
          평가해드립니다.
        </p>
      </Card>
    </div>
  );
}
