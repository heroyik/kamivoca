"use client";

import { useEffect } from "react";
import { useGamification } from "@/hooks/useGamification";
import { useGlobalTop20 } from "@/hooks/useGlobalTop20";
import vocabData from "@/data/vocab.json";
import { normalizeDisplayFurigana, VocabEntry } from "@/utils/vocab";
import { Trash2, Brain, Frown } from "lucide-react";
import Link from "next/link";

export default function ReviewTab() {
  const { stats, removeMistake, clearAllMistakes } = useGamification();
  const { top20, loading: top20Loading, error: top20Error, refresh: refreshTop20 } = useGlobalTop20();

  const mistakes = stats.mistakes || {};
  const mistakesKey = JSON.stringify(stats.mistakes || {});
  
  // Grouping logic to handle data inconsistency (duplicates in vocab and variant keys in mistakes)
  const groupedMistakesMap = new Map<string, { entry: VocabEntry; totalCount: number }>();
  
  (vocabData.data as VocabEntry[]).forEach((v) => {
    const word = v.word;
    const normalized = word.trim();
    
    // Sum counts for all keys that match this word (trimmed)
    let totalCount = 0;
    Object.entries(mistakes).forEach(([mKey, mCount]) => {
      if (mKey.trim() === normalized) {
        totalCount += mCount;
      }
    });

    if (totalCount > 0) {
      if (!groupedMistakesMap.has(normalized)) {
        groupedMistakesMap.set(normalized, { entry: v, totalCount });
      }
    }
  });

  const reviewEntries = Array.from(groupedMistakesMap.values());

  // Pull latest global fail totals whenever this tab is active and local mistakes changed.
  useEffect(() => {
    refreshTop20();
  }, [refreshTop20, mistakesKey]);

  return (
    <div className="review-content">

      {/* ── Personal Tricky Words ──────────────────────────────────────────── */}
      {reviewEntries.length === 0 ? (
        <div className="flex-center min-h-60 flex-col gap-16">
          <div className="font-64">✨</div>
          <h2 className="text-title">All Clear!</h2>
          <p className="text-subtitle text-center px-20">
            You have no words pending for review. Keep it up!
          </p>
        </div>
      ) : (
        <div className="review-card-modern">
          <div className="review-header">
            <div className="review-header-icon">
              <Brain size={28} />
            </div>
            <h2 className="text-title m-0">Tricky Words</h2>
          </div>

          <div className="stat-container">
            <span className="stat-value">{reviewEntries.length}</span>
            <span className="stat-label">
              {reviewEntries.length === 1 ? "word" : "words"} need more practice
            </span>
          </div>

          <div className="review-actions">
            <Link
              href="/quiz/review"
              className="flex-1 no-underline duo-button duo-button-primary button-standard w-full button-review-pulse flex-center"
            >
              START REVIEW
            </Link>
            <button
              onClick={() => clearAllMistakes()}
              className="icon-button-round"
              aria-label="Clear entire review list"
              title="Clear list"
              style={{ width: "48px", height: "48px" }}
            >
              <Trash2 size={24} />
            </button>
          </div>

          <div className="mistake-list">
            {reviewEntries.map(({ entry, totalCount }) => {
              const displayFurigana = normalizeDisplayFurigana(entry.word, entry.furigana);

              return (
                <div key={entry.word} className="mistake-item flex-between">
                  <div className="flex-1 pr-12">
                    <div className="text-subtitle text-kv-kurenai mb-4">{entry.word}</div>
                    {!stats.settings?.hideFurigana && displayFurigana && entry.word !== displayFurigana && (
                      <div className="text-small text-secondary mb-4">{displayFurigana}</div>
                    )}
                    <div className="text-small">{entry.meaning}</div>
                  </div>
                  <div className="flex-center gap-12">
                    <div
                      className="mistake-count"
                      style={{ display: "flex", alignItems: "center", gap: "3px" }}
                    >
                      <Frown size={12} />
                      {totalCount}
                    </div>
                    <button
                      onClick={() => removeMistake(entry.word)}
                      className="trash-button"
                      aria-label={`Remove ${entry.word} from review list`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Wall of Pain ──────────────────────────────────────────────────── */}
      <div className="review-card-modern" style={{ marginTop: "24px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          <h2 className="text-title m-0" style={{ letterSpacing: "-0.5px" }}>
            Wall of Pain
          </h2>
          <span style={{ fontSize: "22px", lineHeight: 1 }}>😤</span>
        </div>
        <p className="text-small" style={{ margin: "0 0 16px", color: "#9ca3af" }}>
          words everyone&#39;s fumbling rn
        </p>

        {top20Loading && (
          <div className="flex-center py-24" style={{ color: "#9ca3af" }}>
            <span className="text-small">Loading…</span>
          </div>
        )}

        {top20Error && (
          <div className="text-small text-center py-16" style={{ color: "#ef4444" }}>
            {top20Error}
          </div>
        )}

        {!top20Loading && !top20Error && top20.length === 0 && (
          <div className="text-small text-center py-16" style={{ color: "#9ca3af" }}>
            No global data yet.
          </div>
        )}

        {!top20Loading && top20.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {top20.map((entry, idx) => {
              const rank = idx + 1;
              const displayFurigana = normalizeDisplayFurigana(entry.word, entry.furigana);
              return (
                <div
                  key={entry.word}
                  style={{
                    background: "#fafafa",
                    border: "1px solid #f0f0f0",
                    borderRadius: "12px",
                    padding: "9px 12px",
                  }}
                >
                    {/* ── Row 1: rank · word · fail count ── */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {/* Rank circle */}
                      <div
                        style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          background: rank <= 3 ? "#fef3c7" : "#f3f4f6",
                          color: rank <= 3 ? "#92400e" : "#6b7280",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                          fontSize: "11px",
                          flexShrink: 0,
                        }}
                      >
                        {rank}
                      </div>

                      {/* Japanese word — full, no ellipsis */}
                      <div
                        style={{
                          flex: 1,
                          fontWeight: 700,
                          fontSize: "15px",
                          color: "var(--kv-kurenai)",
                          wordBreak: "break-word",
                          overflowWrap: "break-word",
                          minWidth: 0,
                        }}
                      >
                        <div style={{ marginBottom: "2px" }}>{entry.word}</div>
                        {!stats.settings?.hideFurigana && displayFurigana && entry.word !== displayFurigana && (
                          <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px", fontWeight: 400 }}>{displayFurigana}</div>
                        )}
                      </div>

                      {/* Fail count badge */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "3px",
                          flexShrink: 0,
                          background: "var(--kv-kurenai-light, #fee2e2)",
                          color: "var(--kv-kurenai)",
                          borderRadius: "8px",
                          padding: "3px 8px",
                          fontSize: "13px",
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                        }}
                      >
                        <Frown size={11} />
                        {entry.totalCount}
                      </div>
                    </div>

                    {/* ── Row 2: meaning · [Unit badge] ── */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginTop: "5px",
                        paddingLeft: "32px",
                      }}
                    >
                      {/* Korean meaning */}
                      <span style={{ fontSize: "12px", color: "#6b7280", flex: 1 }}>
                        {entry.meaning}
                      </span>

                      {/* JLPT Level Badge */}
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          color: "#B8D200",
                          background: "#f0fdf4",
                          borderRadius: "6px",
                          padding: "2px 6px",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                          lineHeight: "16px",
                          border: "1px solid #dcfce7"
                        }}
                      >
                        {entry.book}
                      </span>

                      {/* Unit badge */}
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 600,
                          color: "#7c3aed",
                          background: "#ede9fe",
                          borderRadius: "6px",
                          padding: "2px 6px",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                          lineHeight: "16px",
                        }}
                      >
                        Step {entry.unitNum}
                      </span>
                    </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
