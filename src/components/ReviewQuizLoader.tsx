"use client";

import { useState, useEffect, useMemo } from "react";
import { useGamification } from "@/hooks/useGamification";
import { filterDeletedWords, VocabEntry } from "@/utils/vocab";
import Quiz from "@/components/Quiz";
import { filterEasyCognates } from "@/utils/cognates";

export default function ReviewQuizLoader() {
    const { stats, manualCogniteIds, globalDeletedWordKeys, vocabEntries } = useGamification();
    const mistakes = stats.mistakes || {};
    const hideEasyCognates = stats.settings?.hideEasyCognates ?? false;
    // Memoize the list to prevent infinite loops. JSON.stringify ensures deep comparison.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const missedWordList = useMemo(() => Object.keys(mistakes), [JSON.stringify(mistakes)]);

    const [shuffledWords, setShuffledWords] = useState<VocabEntry[]>([]);

    useEffect(() => {
        const words = filterEasyCognates(
            filterDeletedWords(vocabEntries as VocabEntry[], globalDeletedWordKeys).filter(v => missedWordList.includes(v.word)),
            hideEasyCognates,
            manualCogniteIds,
        );
        const shuffled = [...words].sort(() => Math.random() - 0.5);
        setTimeout(() => setShuffledWords(shuffled), 0);
    }, [globalDeletedWordKeys, hideEasyCognates, manualCogniteIds, missedWordList, vocabEntries]);

    if (missedWordList.length === 0) {
        return <div className="flex-center min-h-screen text-main font-800">No words to review!</div>;
    }

    if (shuffledWords.length === 0) {
        if (hideEasyCognates && missedWordList.length > 0) {
            return <div className="flex-center min-h-screen text-main font-800">All review words are hidden as easy cognates.</div>;
        }
        return <div className="flex-center min-h-screen text-main font-800">Loading...</div>;
    }

    return (
        <Quiz 
            unitId="review" 
            unitWords={shuffledWords} 
            unitTitle="Review Session" 
            sources={['N5']} // Placeholder for distractors
        />
    );
}
