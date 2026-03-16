"use client";

import vocabData from "@/data/vocab.json";
import { useGamification } from "@/hooks/useGamification";
import { normalizeDisplayFurigana, VocabEntry } from "@/utils/vocab";
import { BrainCircuit, Trash2 } from "lucide-react";

export default function CogniteTab() {
  const { manualCogniteIds, removeManualCognite, clearAllManualCognites, stats } = useGamification();

  const cogniteEntries = (vocabData.data as VocabEntry[])
    .filter((entry) => manualCogniteIds.includes(entry.id))
    .sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      return a.word.localeCompare(b.word, "ja");
    });

  return (
    <div className="review-content">
      {cogniteEntries.length === 0 ? (
        <div className="flex-center min-h-60 flex-col gap-16">
          <div className="font-64">🧠</div>
          <h2 className="text-title">No Cognite Words</h2>
          <p className="text-subtitle text-center px-20">
            Mark words with the COGNITE button to build your personal admin list.
          </p>
        </div>
      ) : (
        <div className="review-card-modern">
          <div className="review-header">
            <div className="review-header-icon">
              <BrainCircuit size={28} />
            </div>
            <h2 className="text-title m-0">Cognite List</h2>
          </div>

          <div className="stat-container">
            <span className="stat-value">{cogniteEntries.length}</span>
            <span className="stat-label">
              {cogniteEntries.length === 1 ? "word" : "words"} manually marked
            </span>
          </div>

          <div className="review-actions">
            <button
              type="button"
              onClick={() => void clearAllManualCognites()}
              className="flex-1 duo-button duo-button-secondary button-standard w-full"
            >
              CLEAR ALL
            </button>
            <button
              type="button"
              onClick={() => void clearAllManualCognites()}
              className="icon-button-round"
              aria-label="Clear entire cognite list"
              title="Clear list"
              style={{ width: "48px", height: "48px" }}
            >
              <Trash2 size={24} />
            </button>
          </div>

          <div className="mistake-list">
            {cogniteEntries.map((entry) => {
              const displayFurigana = normalizeDisplayFurigana(entry.word, entry.furigana);

              return (
                <div key={entry.id} className="mistake-item flex-between">
                  <div className="flex-1 pr-12">
                    <div className="text-subtitle text-kv-kurenai mb-4">{entry.word}</div>
                    {!stats.settings?.hideFurigana && displayFurigana && entry.word !== displayFurigana && (
                      <div className="text-small text-secondary mb-4">{displayFurigana}</div>
                    )}
                    <div className="text-small mb-4">{entry.meaning}</div>
                    <div className="flex items-center gap-8 text-small text-secondary">
                      <span>{entry.jlpt}</span>
                      <span>Step {entry.level}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void removeManualCognite(entry.id)}
                    className="trash-button"
                    aria-label={`Remove ${entry.word} from cognite list`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
