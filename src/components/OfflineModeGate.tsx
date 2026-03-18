"use client";

import { useGamification } from "@/hooks/useGamification";

export default function OfflineModeGate() {
  const { isInitialized, isAuthResolved, isOnline, isOfflineMode, isOfflineModeBlocked } = useGamification();

  if (isOnline || !isInitialized || !isAuthResolved) {
    return null;
  }

  if (isOfflineModeBlocked) {
    return (
      <div className="offline-blocker">
        <div className="offline-blocker-card">
          <div className="offline-pill offline-pill-danger">Offline Locked</div>
          <h2 className="offline-title">인터넷 연결이 필요합니다</h2>
          <p className="offline-copy">
            오프라인 모드는 관리자 Google 계정으로 이미 로그인된 경우에만 사용할 수 있습니다.
          </p>
          <p className="offline-copy offline-copy-muted">
            다시 온라인이 되면 일반 사용자도 바로 정상 사용으로 돌아옵니다.
          </p>
        </div>
      </div>
    );
  }

  if (!isOfflineMode) {
    return null;
  }

  return (
    <div className="offline-banner" role="status" aria-live="polite">
      <strong>Admin Offline Mode</strong>
      <span>현재 오프라인 상태입니다. 변경사항은 로컬에 유지되고, 온라인 복귀 시 자동으로 동기화됩니다.</span>
    </div>
  );
}
