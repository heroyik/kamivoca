"use client";

import vocabData from "@/data/vocab.json";
import { useGamification } from "@/hooks/useGamification";
import { filterDeletedWords, normalizeDisplayFurigana, VocabEntry } from "@/utils/vocab";
import { startTransition, useDeferredValue, useState } from "react";
import { Search, Trash2 } from "lucide-react";

function normalizeSearchValue(value: string) {
  return value.trim().toLowerCase();
}

export default function AdminDeleteTab() {
  const { deleteWordsGlobally, globalDeletedWordKeys, stats } = useGamification();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);
  const searchValue = normalizeSearchValue(deferredSearch);

  const allEntries = filterDeletedWords(vocabData.data as VocabEntry[], globalDeletedWordKeys).sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    return a.word.localeCompare(b.word, "ja");
  });

  const visibleEntries = allEntries.filter((entry) => {
    if (!searchValue) return true;
    return [
      entry.id,
      entry.word,
      entry.furigana,
      entry.meaning,
      entry.jlpt,
      `step ${entry.level}`,
    ].some((value) => value?.toLowerCase().includes(searchValue));
  });

  const selectedSet = new Set(selectedIds);
  const visibleSelectedCount = visibleEntries.filter((entry) => selectedSet.has(entry.id)).length;

  const toggleEntry = (entryId: string) => {
    setSelectedIds((prev) => (
      prev.includes(entryId)
        ? prev.filter((id) => id !== entryId)
        : [...prev, entryId]
    ));
  };

  const selectVisible = () => {
    setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleEntries.map((entry) => entry.id)])));
  };

  const clearVisible = () => {
    const visibleIdSet = new Set(visibleEntries.map((entry) => entry.id));
    setSelectedIds((prev) => prev.filter((entryId) => !visibleIdSet.has(entryId)));
  };

  const clearAllSelections = () => {
    setSelectedIds([]);
    setStatus(null);
  };

  const handleDelete = async () => {
    if (selectedIds.length === 0 || isDeleting) return;

    const confirmed = window.confirm(
      `${selectedIds.length}개 표현을 전체 시스템에서 삭제합니다.\n` +
      `이 작업은 adminDeletedWords, vocabEntries, fullVocaEntries, manualCognites에 반영됩니다.`,
    );

    if (!confirmed) return;

    setIsDeleting(true);
    setStatus(null);

    try {
      await deleteWordsGlobally(selectedIds);
      setStatus(`${selectedIds.length}개 표현을 전역 삭제 대상으로 반영했습니다.`);
      setSelectedIds([]);
    } catch (error) {
      console.error("[AdminDeleteTab] Global delete failed", error);
      setStatus("전역 삭제 중 오류가 발생했습니다. 콘솔을 확인하세요.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="review-content admin-delete-tab">
      <div className="review-card-modern">
        <div className="review-header">
          <div className="review-header-icon">
            <Trash2 size={28} />
          </div>
          <div>
            <h2 className="text-title m-0">Global Delete</h2>
            <p className="text-small mt-4">
              현재 활성 표현 {allEntries.length}개를 눈으로 확인하고 체크한 뒤 전체 시스템에서 삭제합니다.
            </p>
          </div>
        </div>

        <div className="admin-delete-toolbar">
          <label className="admin-delete-search">
            <Search size={16} />
            <input
              type="text"
              value={search}
              onChange={(event) => {
                const nextValue = event.target.value;
                startTransition(() => setSearch(nextValue));
              }}
              placeholder="단어, 뜻, 후리가나, ID, JLPT 검색"
            />
          </label>

          <div className="admin-delete-stats">
            <span>{visibleEntries.length} visible</span>
            <span>{selectedIds.length} selected</span>
            <span>{visibleSelectedCount} in filter</span>
          </div>
        </div>

        <div className="admin-delete-actions">
          <button type="button" className="duo-button duo-button-secondary button-standard" onClick={selectVisible} disabled={visibleEntries.length === 0 || isDeleting}>
            SELECT VISIBLE
          </button>
          <button type="button" className="duo-button duo-button-secondary button-standard" onClick={clearVisible} disabled={visibleSelectedCount === 0 || isDeleting}>
            CLEAR VISIBLE
          </button>
          <button type="button" className="duo-button duo-button-secondary button-standard" onClick={clearAllSelections} disabled={selectedIds.length === 0 || isDeleting}>
            CLEAR ALL
          </button>
          <button type="button" className="duo-button duo-button-primary button-standard admin-delete-danger" onClick={() => void handleDelete()} disabled={selectedIds.length === 0 || isDeleting}>
            {isDeleting ? "DELETING..." : `DELETE ${selectedIds.length}`}
          </button>
        </div>

        {status && <p className="admin-delete-status">{status}</p>}

        <div className="admin-delete-list">
          {visibleEntries.map((entry) => {
            const displayFurigana = normalizeDisplayFurigana(entry.word, entry.furigana);
            const isSelected = selectedSet.has(entry.id);

            return (
              <label key={entry.id} className={`admin-delete-item ${isSelected ? "is-selected" : ""}`}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleEntry(entry.id)}
                  disabled={isDeleting}
                />
                <div className="admin-delete-copy">
                  <div className="admin-delete-title-row">
                    <span className="admin-delete-word">{entry.word}</span>
                    <span className="admin-delete-chip">{entry.id}</span>
                  </div>
                  {!stats.settings?.hideFurigana && displayFurigana && entry.word !== displayFurigana && (
                    <div className="text-small">{displayFurigana}</div>
                  )}
                  <div className="admin-delete-meaning">{entry.meaning}</div>
                  <div className="admin-delete-meta">
                    <span>{entry.jlpt}</span>
                    <span>Step {entry.level}</span>
                    <span>{entry.pos}</span>
                    <span>{entry.opic}</span>
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
