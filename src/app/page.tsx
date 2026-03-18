"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { APP_VERSION, APP_NAME, BASE_PATH } from '@/lib/constants';
import { isKamiAdminEmail } from '@/lib/admin';
import { getUnits, getTotalWordCount } from '@/utils/vocab';
import { filterEasyCognates } from '@/utils/cognates';
import { useGamification } from '@/hooks/useGamification';
import { useRank } from '@/hooks/useRank';
import Leaderboard from '@/components/Leaderboard';
import UserProfile from '@/components/UserProfile';
import ReviewTab from '@/components/ReviewTab';
import CogniteTab from '@/components/CogniteTab';
import AdminEditTab from '@/components/AdminEditTab';
import RankToast from '@/components/RankToast';
import Image from 'next/image';
import { Github } from 'lucide-react';

const WeatherBackground = dynamic(
  () => import('@/components/WeatherBackground').then((mod) => mod.WeatherBackground),
  { ssr: false }
);

// Gamification Helpers
const getLevelTier = (idx: number) => {
  if (idx < 5) return "beginner";
  if (idx < 10) return "intermediate";
  return "advanced";
};

const getLevelTitle = (idx: number) => {
  return getLevelTier(idx).toUpperCase();
};

const getLevelColor = (idx: number, isLocked: boolean) => {
  if (isLocked) return '#afafaf';
  if (idx < 5) return 'var(--kv-kurenai)';
  if (idx < 10) return 'var(--kv-ai-iro)';
  return 'var(--kv-kintsugi-gold)';
};

const getMotivationalSticker = (idx: number) => {
  const stickers = [
    "🌱 First Steps", "🔍 Word Hunter", "🎯 Target Hit", "🚀 Blasting Off", "💎 Shiny Start",
    "🌉 Bridge Builder", "🔥 Getting Hotter", "🎭 Story Teller", "🧩 Mastermind", "⛰️ Leveling Up",
    "👑 Word Royalty", "🎓 Wise Scholar", "⚡ Power Flow", "🌌 Zen Master", "🏆 Legend!"
  ];
  return stickers[idx] || "🔥 Keep Going!";
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<'learn' | 'review' | 'leader' | 'profile' | 'cognite' | 'edit'>('learn');
  const [adminToolsUnlocked, setAdminToolsUnlocked] = useState(false);
  const [isOfflineReady, setIsOfflineReady] = useState(false);
  const { stats, user, manualCogniteIds, globalDeletedWordKeys, vocabEntries, isOfflineMode } = useGamification();
  const router = useRouter();
  const { rank, total, rankDelta, clearDelta } = useRank(user?.uid ?? null, stats.xp);
  const isAdminUser = isKamiAdminEmail(user?.email);
  const showAdminTabs = isAdminUser && adminToolsUnlocked;

  useEffect(() => {
    if (!isAdminUser) {
      const timer = window.setTimeout(() => setAdminToolsUnlocked(false), 0);
      return () => window.clearTimeout(timer);
    }
  }, [isAdminUser]);

  useEffect(() => {
    if (!showAdminTabs && (activeTab === 'cognite' || activeTab === 'edit')) {
      const timer = window.setTimeout(() => setActiveTab('profile'), 0);
      return () => window.clearTimeout(timer);
    }
  }, [activeTab, showAdminTabs]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const syncOfflineReady = () => {
      setIsOfflineReady(document.documentElement.dataset.offlineReady === 'true');
    };

    syncOfflineReady();
    const timer = window.setInterval(syncOfflineReady, 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Updated units calculation
  const hideEasyCognates = stats.settings?.hideEasyCognates ?? false;
  const units = getUnits(globalDeletedWordKeys, vocabEntries).map((unit) => ({
    ...unit,
    words: filterEasyCognates(unit.words, hideEasyCognates, manualCogniteIds),
  }));
  const totalWords = getTotalWordCount(globalDeletedWordKeys, vocabEntries);

  const navigateTo = (path: string) => {
    if (isOfflineMode && typeof window !== 'undefined') {
      window.location.assign(`${BASE_PATH}${path}`);
      return;
    }
    router.push(path);
  };

  const handleReviewMistakes = (e: React.MouseEvent, unitId: string) => {
    e.preventDefault();
    e.stopPropagation();
    navigateTo(`/quiz/${unitId}?mode=review`);
  };

  const handleUnitSelect = (unitId: string, isLocked: boolean) => {
    if (isLocked) return;
    navigateTo(`/quiz/${unitId}`);
  };

  const handleDownload = async () => {
    const date = new Date().toISOString().split('T')[0];
    const fileName = `${date}-voca.json`;
    const jsonString = JSON.stringify({ data: vocabEntries }, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });

    // Chrome 86+: use File System Access API for reliable filename support
    if ('showSaveFilePicker' in window) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: fileName,
          types: [{ description: 'JSON file', accept: { 'application/json': ['.json'] } }],
        });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch {
        // User cancelled the dialog — do nothing
        return;
      }
    }

    // Fallback for Safari, Firefox, mobile
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <main className="container min-h-screen pb-140 pt-68" style={{ position: 'relative', zIndex: 10 }}>
      <header className="sticky-header japanese-header">
        <div className="header-left flex items-baseline gap-4">
          <h1 className="font-22 font-900 m-0 text-kv-kurenai leading-1-1 tracking-tight" style={{ letterSpacing: '-0.5px' }}>{APP_NAME}</h1>
          <span className="version-badge">{APP_VERSION.replace('v', '')}</span>
        </div>

        <div className="header-right flex items-center gap-12">
          {isOfflineMode && (
            <div className="offline-header-chip" title="Admin offline mode is active">
              OFFLINE
            </div>
          )}
          {!isOfflineMode && isOfflineReady && (
            <div className="offline-ready-chip" title="Offline cache is ready">
              OFFLINE ready!
            </div>
          )}
          <div
            onClick={handleDownload}
            className="vocab-stash-pill mt-0 flex items-center gap-2 py-4 px-10 h-32 hover-scale"
            title="Download JSON"
          >
            <strong className="text-kv-kurenai font-12">{totalWords.toLocaleString()}</strong>⛩️
          </div>
        </div>
      </header>

      <div className="p-8" />

      {activeTab === 'learn' && (
        <div className="learn-container">
          {/* Weather effect — only visible on the home/learn screen */}
          <WeatherBackground />
          {/* Live rank badge relocated from header to avoid overlap on small screens */}
          {user && rank !== null && (
            <div
              className="mt-8 mb-16"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                background: rank === 1 ? "linear-gradient(135deg,#fbbf24,#f59e0b)" : "#f3f4f6",
                color: rank === 1 ? "#fff" : "#374151",
                borderRadius: "12px",
                padding: "6px 14px",
                fontSize: "13px",
                fontWeight: 900,
                boxShadow: rank === 1 ? "0 4px 12px rgba(251,191,36,0.3)" : "none",
                zIndex: 10,
              }}
            >
              {rank === 1 ? "👑" : "🏅"} RANK #{rank}
              {total > 0 && <span style={{ opacity: 0.6, fontSize: "11px", fontWeight: 700 }}>&nbsp;of {total} globally</span>}
            </div>
          )}
          {/* Connector SVG Background */}
          <svg className="connector-svg">
            <path
              d={units.slice(0, 15).map((_, i) => {
                const x = (120 + (Math.sin(i * 1.2) * 60)).toFixed(2);
                const y = (i * 200).toFixed(2);
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
              }).join(' ')}
              fill="none"
              stroke="#e5e5e5"
              strokeWidth="16"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          {units.slice(0, 15).map((unit, index) => {
            const offset = (Math.sin(index * 1.2) * 60).toFixed(2);
            const isCompleted = !!stats.completedUnits?.includes(unit.id);
            const isMastered = !!(stats.masteredUnits?.includes(unit.id) || stats.unitStats?.[unit.id]?.isMastered);

            // Bypass logic if unlockAllLevels is enabled
            const unlockAll = stats.settings?.unlockAllLevels ?? false;

            // isLocked: strictly sequential unless unlockAll is true
            // Unit 1 (index 0) is always unlocked. Others depend on previous unit completion.
            const isLocked = !unlockAll && index > 0 && !stats.completedUnits?.includes(units[index - 1].id);

            // isCurrent: the "actual" next level to tackle, persistent even if we explore others
            const isCurrent = index === (stats.completedUnits?.length ?? 0);

            const tier = getLevelTier(index);
            const unitStatusClass = isLocked ? 'locked' : (isMastered ? 'mastered' : (isCurrent ? 'current' : (isCompleted ? 'completed' : 'available')));
            const combinedClass = `${unitStatusClass} ${isLocked ? '' : tier}`;

            const failCount = stats.mistakes
              ? unit.words.reduce((sum, w) => {
                  const rawKey = w.word.trim();
                  const lowerKey = rawKey.toLowerCase();
                  return sum + (stats.mistakes[rawKey] ?? stats.mistakes[lowerKey] ?? 0);
                }, 0)
              : 0;
            const showFailBadge = !isLocked && failCount > 0;

            const getUnitIcon = (index: number, locked: boolean, completed: boolean, mastered: boolean) => {
              if (locked) return <span style={{ fontSize: '36px', opacity: 0.6 }}>🔒</span>;
              if (mastered) {
                return (
                  <Image
                    src={`${BASE_PATH}/images/sakura.png`}
                    alt="Mastered"
                    width={44}
                    height={44}
                    className="object-contain"
                  />
                );
              }
              if (completed) return <span style={{ fontSize: '40px' }}>👍</span>;

              // Current node or available node
              return (
                <Image
                  src={`${BASE_PATH}/images/torii.png`}
                  alt="Available"
                  width={40}
                  height={40}
                  className="object-contain"
                />
              );
            };

            return (
              <div key={unit.id}
                className="unit-node-container"
                style={{ transform: `translateX(${offset}px)` }}
              >
                <div
                  className={`no-underline unit-button ${combinedClass}`}
                  aria-disabled={isLocked}
                  role={isLocked ? undefined : 'link'}
                  tabIndex={isLocked ? -1 : 0}
                  onClick={() => handleUnitSelect(unit.id, isLocked)}
                  onKeyDown={(e) => {
                    if (isLocked) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleUnitSelect(unit.id, isLocked);
                    }
                  }}
                >
                  {getUnitIcon(index, isLocked, isCompleted, isMastered)}

                  {showFailBadge && (
                    <div
                      className="fail-badge-dual"
                      onClick={e => handleReviewMistakes(e, unit.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="fail-badge-circle" />
                      <span className="fail-badge-count">{failCount}</span>
                    </div>
                  )}

                  {isCurrent && (
                    <div className="start-indicator">
                      START!
                    </div>
                  )}
                </div>

                <div className={`unit-label-card tier-${tier}`} style={{
                  boxShadow: `0 4px 0 ${isLocked ? '#e5e5e5' : 'rgba(0,0,0,0.1)'}`,
                }}>
                  <p className="font-11 font-900 letter-spacing-0-5 mb-1" style={{ color: getLevelColor(index, isLocked) }}>
                    {getLevelTitle(index)} {index + 1}
                  </p>
                  <p className={`font-14 font-800 ${isLocked ? 'text-disabled' : 'text-main'} mt-4`}>
                    {getMotivationalSticker(index)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'review' && <ReviewTab />}
      {activeTab === 'cognite' && showAdminTabs && <CogniteTab />}
      {activeTab === 'edit' && showAdminTabs && <AdminEditTab />}
      {activeTab === 'leader' && <Leaderboard />}
      {activeTab === 'profile' && (
        <UserProfile
          user={user}
          stats={stats}
          adminToolsUnlocked={adminToolsUnlocked}
          onAdminToolsUnlock={() => setAdminToolsUnlocked(true)}
        />
      )}

      {/* Rank toast — shown after rank improvement */}
      <RankToast rank={rank} rankDelta={rankDelta} onDismiss={clearDelta} />

      <style jsx global>{`
        @keyframes pulse-node {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
      `}</style>

      {/* Footer Nav */}
      <nav className="footer-nav">
        <div
          onClick={() => setActiveTab('learn')}
          className={`nav-item ${activeTab === 'learn' ? 'active' : ''}`}
        >
          <span className="font-24">🏠</span>
          <span className="font-10 font-800">LEARN</span>
        </div>
        <div
          onClick={() => setActiveTab('leader')}
          className={`nav-item ${activeTab === 'leader' ? 'active' : ''}`}
        >
          <span className="font-24">🏆</span>
          <span className="font-10 font-800">LEADER</span>
        </div>
        <div
          onClick={() => setActiveTab('review')}
          className={`nav-item ${activeTab === 'review' ? 'active' : ''}`}
        >
          <span className="font-24">📚</span>
          <span className="font-10 font-800">REVIEW</span>
        </div>
        {showAdminTabs && (
          <div
            onClick={() => setActiveTab('cognite')}
            className={`nav-item ${activeTab === 'cognite' ? 'active' : ''}`}
          >
            <span className="font-24">🧠</span>
            <span className="font-10 font-800">COGNITE</span>
          </div>
        )}
        {showAdminTabs && (
          <div
            onClick={() => setActiveTab('edit')}
            className={`nav-item ${activeTab === 'edit' ? 'active' : ''}`}
          >
            <span className="font-24">✏️</span>
            <span className="font-10 font-800">EDIT</span>
          </div>
        )}
        <div
          onClick={() => setActiveTab('profile')}
          className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
        >
          <span className="font-24">👤</span>
          <span className="font-10 font-800">PROFILE</span>
        </div>

        <div className="aura-bar">
          <div className="flex items-center gap-3 mr-4">
            <span className="text-duo-orange font-14 font-700">🔥 {stats.streak}</span>
            <span className="text-duo-blue font-14 font-700">💎 {stats.gems}</span>
          </div>
          <div className="separator-v"></div>
          <div>My Learning Aura: <strong className="text-kv-kurenai font-15">{stats.xp.toLocaleString()} ✨</strong></div>
          <div className="separator-v"></div>
          <a
            href="https://github.com/heroyik/kamivoca"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub Repository"
            title="GitHub Repository"
            className="aura-link"
          >
            <Github size={16} />
          </a>
        </div>
      </nav>
    </main>
  );
}
