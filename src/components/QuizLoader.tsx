"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { getUnits } from "@/utils/vocab";
import Quiz from "./Quiz";
import { useGamification } from "@/hooks/useGamification";

interface QuizLoaderProps {
    unitId: string;
}

export default function QuizLoader({ unitId }: QuizLoaderProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { stats, isInitialized } = useGamification();

    const sourcesStr = searchParams.get("sources");
    const mode = searchParams.get("mode");
    const sources = sourcesStr ? sourcesStr.split(",") : ["1"];

    const units = getUnits();
    const unit = units.find((u) => u.id === unitId);

    // If review mode, filter by mistakes
    const isReviewMode = mode === 'review';
    let unitWords = unit?.words || [];

    if (isReviewMode && stats.mistakes) {
        // Filter words that are in the mistakes list
        unitWords = (unit?.words || []).filter(word => {
            const normalized = word.word.toLowerCase().trim();
            return !!stats.mistakes[normalized];
        });
    }

    const hasMistakes = unitWords.length > 0;

    if (!isInitialized) {
        return <div className="flex-center min-h-screen font-800">Initializing...</div>;
    }

    if (!unit) {
        return <div className="flex-center" style={{ height: '100vh' }}>Unit not found or loading...</div>;
    }

    if (isReviewMode && !hasMistakes) {
        return (
            <div className="flex-center flex-col gap-16" style={{ height: '100vh' }}>
                <div className="font-64">✨</div>
                <h2 className="text-title text-duo-green">All Caught Up!</h2>
                <p className="text-subtitle text-center px-20">You have no mistakes to review in this unit.</p>
                <button onClick={() => router.push('/')} className="duo-button duo-button-primary w-auto px-40">GO BACK</button>
            </div>
        );
    }

    return <Quiz unitId={unit.id} unitWords={unitWords} unitTitle={unit.title} sources={sources} isReview={isReviewMode} />;
}
