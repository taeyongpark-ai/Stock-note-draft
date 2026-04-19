import { Card } from "@/components/ui/Card";
import TopTabs from "@/components/shell/TopTabs";
import { BarChart3 } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="space-y-4 pt-2">
      <TopTabs />
      <Card className="px-5 py-12 text-center space-y-3">
        <div className="w-14 h-14 rounded-full bg-[color:var(--card-muted)] grid place-items-center mx-auto">
          <BarChart3 size={26} className="text-[color:var(--text-muted)]" />
        </div>
        <div className="text-[15px] font-bold">분석 준비 중</div>
        <div className="text-sm text-[color:var(--text-muted)] leading-relaxed max-w-xs mx-auto">
          매매 이력이 쌓이면 확신도별 승률, 태그별 성과, 복기 완료율 등을 보여드릴게요.
        </div>
      </Card>
    </div>
  );
}
