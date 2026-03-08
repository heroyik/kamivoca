"use client";

import { useState, useEffect, useMemo } from "react";
import { useGamification } from "@/hooks/useGamification";
import vocabData from "@/data/vocab.json";
import { VocabEntry } from "@/utils/vocab";
import Quiz from "@/components/Quiz";

export default function ReviewQuizLoader() {
    const { stats } = useGamification();
    const mistakes = stats.mistakes || {};
    // Memoize the list to prevent infinite loops. JSON.stringify ensures deep comparison.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const missedWordList = useMemo(() => Object.keys(mistakes), [JSON.stringify(mistakes)]);

    const [shuffledWords, setShuffledWords] = useState<VocabEntry[]>([]);

    useEffect(() => {
        let words = (vocabData.data as VocabEntry[]).filter(v => 
            missedWordList.includes(v.word)
        );
        const shuffled = [...words].sort(() => Math.random() - 0.5);
        setTimeout(() => setShuffledWords(shuffled), 0);
    }, [missedWordList]);

    if (missedWordList.length === 0) {
        return <div className="flex-center min-h-screen text-main font-800">No words to review!</div>;
    }

    if (shuffledWords.length === 0) {
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
