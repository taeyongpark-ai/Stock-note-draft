export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3 text-center px-8">
      <div className="text-4xl">🔒</div>
      <h1 className="text-lg font-bold">접근 권한이 없습니다</h1>
      <p className="text-sm text-[color:var(--text-muted)]">
        이 서비스는 개인 전용입니다.
      </p>
    </div>
  );
}
