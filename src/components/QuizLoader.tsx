"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { BASE_PATH } from "@/lib/constants";
import { getUnits } from "@/utils/vocab";
import Quiz from "./Quiz";
import { useGamification } from "@/hooks/useGamification";
import { filterEasyCognates } from "@/utils/cognates";

interface QuizLoaderProps {
    unitId: string;
}

export default function QuizLoader({ unitId }: QuizLoaderProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { stats, isInitialized, manualCogniteIds, globalDeletedWordKeys, vocabEntries, isOfflineMode } = useGamification();

    const sourcesStr = searchParams.get("sources");
    const mode = searchParams.get("mode");
    const priorityWord = searchParams.get("word")?.trim() ?? "";
    const sources = sourcesStr ? sourcesStr.split(",") : ["1"];

    const hideEasyCognates = stats.settings?.hideEasyCognates ?? false;
    const units = getUnits(globalDeletedWordKeys, vocabEntries).map((unit) => ({
        ...unit,
        words: filterEasyCognates(unit.words, hideEasyCognates, manualCogniteIds),
    }));
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

    const goHome = () => {
        if (isOfflineMode && typeof window !== "undefined") {
            window.location.assign(`${BASE_PATH}/`);
            return;
        }
        router.push("/");
    };

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
                <button onClick={goHome} className="duo-button duo-button-primary w-auto px-40">GO BACK</button>
            </div>
        );
    }

    if (unitWords.length === 0) {
        return (
            <div className="flex-center flex-col gap-16" style={{ height: '100vh' }}>
                <div className="font-64">🫥</div>
                <h2 className="text-title text-duo-blue">No quiz words left</h2>
                <p className="text-subtitle text-center px-20">
                    {hideEasyCognates
                        ? "This step only contains easy cognates right now, so they were hidden by your profile setting."
                        : "No words are available in this step."}
                </p>
                <button onClick={goHome} className="duo-button duo-button-primary w-auto px-40">GO BACK</button>
            </div>
        );
    }

    return (
        <Quiz
            unitId={unit.id}
            unitWords={unitWords}
            unitTitle={unit.title}
            sources={sources}
            isReview={isReviewMode}
            priorityWord={priorityWord || undefined}
        />
    );
}
