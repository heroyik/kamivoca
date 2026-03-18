"use client";

import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Search, PenSquare, RotateCcw, Save } from "lucide-react";
import { useGamification } from "@/hooks/useGamification";
import { filterDeletedWords, normalizeDisplayFurigana, VocabEntry } from "@/utils/vocab";

interface EditDraft {
  word: string;
  furigana: string;
  meaning: string;
  level: string;
  jlpt: string;
  pos: string;
  opic: string;
  exampleText: string;
  synonymsText: string;
}

function normalizeSearchValue(value: string) {
  return value.trim().toLowerCase();
}

function createDraft(entry: VocabEntry): EditDraft {
  return {
    word: entry.word,
    furigana: entry.furigana,
    meaning: entry.meaning,
    level: String(entry.level),
    jlpt: entry.jlpt,
    pos: entry.pos,
    opic: entry.opic,
    exampleText: (entry.example ?? []).join("\n"),
    synonymsText: (entry.synonyms ?? []).join("\n"),
  };
}

function parseLineList(value: string) {
  return Array.from(
    new Set(
      value
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function parseSynonyms(value: string) {
  return Array.from(
    new Set(
      value
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

export default function AdminEditTab() {
  const {
    vocabEntries,
    deleteWordsGlobally,
    saveVocabOverride,
    clearVocabOverride,
    globalDeletedWordKeys,
    stats,
  } = useGamification();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const editPanelRef = useRef<HTMLDivElement | null>(null);
  const deferredSearch = useDeferredValue(search);
  const searchValue = normalizeSearchValue(deferredSearch);

  const allEntries = useMemo(() => filterDeletedWords(vocabEntries, globalDeletedWordKeys).sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    return a.word.localeCompare(b.word, "ja");
  }), [globalDeletedWordKeys, vocabEntries]);

  const visibleEntries = useMemo(() => allEntries.filter((entry) => {
    if (!searchValue) return true;
    return [
      entry.id,
      entry.word,
      entry.furigana,
      entry.meaning,
      entry.jlpt,
      entry.pos,
      entry.opic,
      ...(entry.example ?? []),
      ...(entry.synonyms ?? []),
      `step ${entry.level}`,
    ].some((value) => value?.toLowerCase().includes(searchValue));
  }), [allEntries, searchValue]);

  const editingEntry = useMemo(
    () => allEntries.find((entry) => entry.id === editingId) ?? null,
    [allEntries, editingId],
  );

  useEffect(() => {
    if (visibleEntries.length === 0) {
      setEditingId(null);
      return;
    }

    if (!editingId || !visibleEntries.some((entry) => entry.id === editingId)) {
      setEditingId(visibleEntries[0].id);
    }
  }, [editingId, visibleEntries]);

  useEffect(() => {
    if (!editingEntry) {
      setDraft(null);
      return;
    }

    setDraft(createDraft(editingEntry));
  }, [editingEntry]);

  useEffect(() => {
    if (!editingEntry || !editPanelRef.current) return;

    editPanelRef.current.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [editingEntry]);

  const selectedSet = new Set(selectedIds);
  const visibleSelectedCount = visibleEntries.filter((entry) => selectedSet.has(entry.id)).length;

  const updateDraft = (field: keyof EditDraft, value: string) => {
    setDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

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

  const reloadDraft = () => {
    if (!editingEntry) return;
    setDraft(createDraft(editingEntry));
    setStatus("현재 저장된 값으로 에디터를 다시 불러왔습니다.");
  };

  const handleSave = async () => {
    if (!editingEntry || !draft || isSaving) return;

    setIsSaving(true);
    setStatus(null);

    try {
      await saveVocabOverride(editingEntry.id, {
        word: draft.word.trim(),
        furigana: draft.furigana.trim(),
        meaning: draft.meaning.trim(),
        level: Math.max(1, Number.parseInt(draft.level, 10) || editingEntry.level),
        jlpt: draft.jlpt.trim(),
        pos: draft.pos.trim(),
        opic: draft.opic.trim(),
        example: parseLineList(draft.exampleText),
        synonyms: parseSynonyms(draft.synonymsText),
      });
      setStatus("수정 내용을 저장했고 example/synonyms 배열도 다시 반영했습니다.");
    } catch (error) {
      console.error("[AdminEditTab] Save failed", error);
      setStatus("저장 중 오류가 발생했습니다. 콘솔을 확인하세요.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetOverride = async () => {
    if (!editingEntry || isSaving) return;
    const confirmed = window.confirm(`${editingEntry.word}의 admin override를 제거하고 기본 데이터로 되돌립니다.`);
    if (!confirmed) return;

    setIsSaving(true);
    setStatus(null);
    try {
      await clearVocabOverride(editingEntry.id);
      setStatus("override를 제거했습니다. 기본 vocab 값으로 되돌아갑니다.");
    } catch (error) {
      console.error("[AdminEditTab] Reset failed", error);
      setStatus("override 초기화 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
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
      console.error("[AdminEditTab] Global delete failed", error);
      setStatus("전역 삭제 중 오류가 발생했습니다. 콘솔을 확인하세요.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="review-content admin-edit-tab">
      <div className="review-card-modern">
        <div className="review-header">
          <div className="review-header-icon">
            <PenSquare size={28} />
          </div>
          <div>
            <h2 className="text-title m-0">Global Edit</h2>
            <p className="text-small mt-4">
              현재 활성 표현 {allEntries.length}개를 검색하고, 개별 수정 또는 선택 삭제를 진행합니다.
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
              placeholder="단어, 뜻, 후리가나, 예문, 동의어, ID 검색"
            />
          </label>

          <div className="admin-delete-stats">
            <span>{visibleEntries.length} visible</span>
            <span>{selectedIds.length} selected</span>
            <span>{visibleSelectedCount} in filter</span>
          </div>
        </div>

        <p className="admin-edit-hint">
          체크박스는 삭제 후보 선택입니다. 카드 본문을 누르면 바로 편집 모드로 전환됩니다.
        </p>

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

        <div className="admin-edit-layout">
          <div className="admin-delete-list">
            {visibleEntries.map((entry) => {
              const displayFurigana = normalizeDisplayFurigana(entry.word, entry.furigana);
              const isSelected = selectedSet.has(entry.id);
              const isEditing = entry.id === editingId;

              return (
                <div key={entry.id} className={`admin-delete-item admin-edit-item ${isSelected ? "is-selected" : ""} ${isEditing ? "is-editing" : ""}`}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleEntry(entry.id)}
                    disabled={isDeleting}
                  />
                  <button
                    type="button"
                    className="admin-edit-entry-button"
                    onClick={() => {
                      setEditingId(entry.id);
                      setStatus(null);
                    }}
                  >
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
                  </button>
                </div>
              );
            })}
          </div>

          <div ref={editPanelRef} className="admin-edit-panel">
            {!editingEntry || !draft ? (
              <div className="admin-edit-empty">
                <div className="font-64">🛠️</div>
                <h3 className="text-title m-0">Select A Vocab</h3>
                <p className="text-small">왼쪽 목록에서 수정할 표현을 고르면 상세 편집기가 열립니다.</p>
              </div>
            ) : (
              <>
                <div className="admin-edit-panel-header">
                  <div>
                    <h3 className="text-title m-0">{editingEntry.word}</h3>
                    <p className="text-small mt-4">저장 시 example와 synonyms는 textarea 기준으로 다시 배열화됩니다.</p>
                  </div>
                  <span className="admin-delete-chip">{editingEntry.id}</span>
                </div>

                <div className="admin-edit-form-grid">
                  <label className="admin-edit-field">
                    <span>Word</span>
                    <input value={draft.word} onChange={(event) => updateDraft("word", event.target.value)} />
                  </label>
                  <label className="admin-edit-field">
                    <span>Furigana</span>
                    <input value={draft.furigana} onChange={(event) => updateDraft("furigana", event.target.value)} />
                  </label>
                  <label className="admin-edit-field admin-edit-field-wide">
                    <span>Meaning</span>
                    <textarea rows={3} value={draft.meaning} onChange={(event) => updateDraft("meaning", event.target.value)} />
                  </label>
                  <label className="admin-edit-field">
                    <span>Step</span>
                    <input value={draft.level} onChange={(event) => updateDraft("level", event.target.value)} inputMode="numeric" />
                  </label>
                  <label className="admin-edit-field">
                    <span>JLPT</span>
                    <input value={draft.jlpt} onChange={(event) => updateDraft("jlpt", event.target.value)} />
                  </label>
                  <label className="admin-edit-field">
                    <span>POS</span>
                    <input value={draft.pos} onChange={(event) => updateDraft("pos", event.target.value)} />
                  </label>
                  <label className="admin-edit-field">
                    <span>OPIC</span>
                    <input value={draft.opic} onChange={(event) => updateDraft("opic", event.target.value)} />
                  </label>
                  <label className="admin-edit-field admin-edit-field-wide">
                    <span>Examples</span>
                    <textarea rows={7} value={draft.exampleText} onChange={(event) => updateDraft("exampleText", event.target.value)} placeholder="한 줄에 예문 하나" />
                  </label>
                  <label className="admin-edit-field admin-edit-field-wide">
                    <span>Synonyms</span>
                    <textarea rows={4} value={draft.synonymsText} onChange={(event) => updateDraft("synonymsText", event.target.value)} placeholder="한 줄 하나 또는 comma 구분" />
                  </label>
                </div>

                <div className="admin-edit-actions">
                  <button type="button" className="duo-button duo-button-primary button-standard" onClick={() => void handleSave()} disabled={isSaving}>
                    <Save size={16} />
                    {isSaving ? "SAVING..." : "SAVE"}
                  </button>
                  <button type="button" className="duo-button duo-button-secondary button-standard" onClick={reloadDraft} disabled={isSaving}>
                    <RotateCcw size={16} />
                    RELOAD
                  </button>
                  <button type="button" className="duo-button duo-button-secondary button-standard" onClick={() => void handleResetOverride()} disabled={isSaving}>
                    <RotateCcw size={16} />
                    RESET OVERRIDE
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
