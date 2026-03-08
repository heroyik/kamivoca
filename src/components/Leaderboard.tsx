"use client";

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore';
import Image from 'next/image';
import { getAvatarColor, getInitial } from '@/utils/ui';

interface LeaderboardEntry {
    id: string;
    displayName?: string;
    photoURL?: string;
    xp: number;
    gems?: number;
    broken?: boolean;
}

export default function Leaderboard() {
    const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [, setError] = useState(false);

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;
        let unsubscribe: (() => void) | undefined;

        const loadLeaderboard = () => {
            setLoading(true);
            setError(false);

            const firestore = db;
            if (!firestore) {
                setLeaders([]);
                setLoading(false);
                return;
            }

            timeoutId = setTimeout(() => {
                setLeaders([]);
                setLoading(false);
            }, 5000);

            try {
                const q = query(
                    collection(firestore, "users"),
                    orderBy("xp", "desc"),
                    limit(10)
                );

                unsubscribe = onSnapshot(q, (snapshot) => {
                    clearTimeout(timeoutId);
                    const entries = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    })) as LeaderboardEntry[];
                    setLeaders(entries);
                    setLoading(false);
                }, async (err) => {
                    console.error("Leaderboard error:", err);
                    if (err.code === 'failed-precondition' || err.message.includes('index')) {
                        try {
                            const fallbackQ = query(collection(firestore, "users"), limit(50));
                            const snapshot = await getDocs(fallbackQ);
                            const entries = snapshot.docs.map(doc => ({
                                id: doc.id,
                                ...doc.data()
                            })) as LeaderboardEntry[];
                            entries.sort((a, b) => b.xp - a.xp);
                            setLeaders(entries.slice(0, 10));
                            setLoading(false);
                            clearTimeout(timeoutId);
                            return;
                        } catch (fallbackErr) {
                            console.error("Fallback query failed:", fallbackErr);
                        }
                    }
                    setLeaders([]);
                    setLoading(false);
                    clearTimeout(timeoutId);
                });
            } catch (e) {
                console.error("Leaderboard init error:", e);
                clearTimeout(timeoutId);
                setLoading(false);
                setError(true);
            }
        };

        loadLeaderboard();
        return () => {
            if (unsubscribe) unsubscribe();
            clearTimeout(timeoutId);
        };
    }, []);

    if (loading) return <div className="flex-center p-40 text-secondary">Loading Rankings...</div>;

    return (
        <div className="p-20 max-w-600 mx-auto">
            <h2 className="font-24 font-900 text-kv-kurenai mb-20 text-center">
                Hall of Fame 🏆
            </h2>
            <div className="flex flex-col flex-gap-12">
                {leaders.map((entry, index) => (
                    <div key={entry.id} className="leaderboard-item">
                        <div className="rank-text">
                            {index === 0 ? '👑' : index + 1}
                        </div>
                        <div className="user-avatar mr-12 relative" style={{
                            backgroundColor: (entry.photoURL?.startsWith('http')) ? 'transparent' : getAvatarColor(entry.id),
                            color: 'white',
                            fontWeight: 900,
                            fontSize: '18px'
                        }}>
                            {entry.photoURL?.startsWith('http') ? (
                                <Image
                                    src={entry.photoURL}
                                    alt={entry.displayName || "学習者"}
                                    fill
                                    className="object-cover rounded-full"
                                />
                            ) : (
                                <span>{getInitial(entry.displayName)}</span>
                            )}
                        </div>
                        <div className="leader-item-name">
                            {entry.displayName || "匿名学習者"}
                        </div>
                        <div className="leader-item-xp">
                            {entry.xp.toLocaleString()} XP
                        </div>
                    </div>
                ))}
                {leaders.length === 0 && (
                    <div className="text-center text-secondary p-40">
                        Be the first to join the leaderboard! 🚀
                    </div>
                )}
            </div>
        </div>
    );
}
