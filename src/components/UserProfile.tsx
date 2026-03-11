"use client";

import { auth, googleProvider } from '@/lib/firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { useGamification } from '@/hooks/useGamification';
import { UserStats } from '@/hooks/useGamification';
import { User } from 'firebase/auth';
import Image from 'next/image';
import { useState } from 'react';
import { getUnits } from '@/utils/vocab';
import { getAvatarColor, getInitial } from '@/utils/ui';
import { isUnsupportedIAB, redirectToExternalBrowser } from '@/utils/browser';
import { BASE_PATH } from '@/lib/constants';

interface UserProfileProps {
    user: User | null;
    stats: UserStats;
}

const AVATARS = [
    '/images/avatars/samurai.png',
    '/images/avatars/ninja.png',
    '/images/avatars/geisha.png',
    '/images/avatars/shiba_inu.png'
];

export default function UserProfile({ user, stats }: UserProfileProps) {
    const { unlockProgress, updateSettings, updateProfile, resetProgress } = useGamification();
    const [devClickCount, setDevClickCount] = useState(0);
    const [selectedLevel, setSelectedLevel] = useState(1);
    const [adminName, setAdminName] = useState(stats.displayName || user?.displayName || '');
    const [adminPhoto, setAdminPhoto] = useState(stats.photoURL || user?.photoURL || '');


    const handleLogin = async () => {
        if (!auth || !googleProvider) {
            alert("Firebase Authentication is not available in this environment.");
            return;
        }

        // Handle In-App Browser redirection for Google Login compatibility
        if (isUnsupportedIAB()) {
            redirectToExternalBrowser();
            return;
        }

        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Login failed", error);
            alert("Google Login failed. Please check your Firebase config.");
        }
    };

    const handleLogout = () => {
        if (auth) signOut(auth);
    };

    const toggleSetting = (key: 'soundEnabled' | 'hapticsEnabled' | 'hideFurigana' | 'unlockAllLevels') => {
        if (stats.settings) {
            updateSettings({ [key]: !stats.settings[key] });
        }
    };

    return (
        <div className="profile-container pb-140">
            <div className="card-premium text-center p-32 mb-24">
                {/* Unified Profile Header */}
                {(() => {
                    const googlePhoto = user?.photoURL;
                    const localAvatar = (stats.photoURL && !stats.photoURL.startsWith('http')) ? stats.photoURL : null;
                    const displayPhoto = googlePhoto || (stats.photoURL?.startsWith('http') ? stats.photoURL : null);
                    const displayName = user?.displayName || stats.displayName || 'Guest User';
                    return (
                        <>
                            <div
                                onClick={() => setDevClickCount(prev => prev + 1)}
                                className="avatar-container"
                                style={{
                                    backgroundColor: displayPhoto ? 'transparent' : getAvatarColor(user?.uid || 'guest'),
                                    color: 'white',
                                    fontWeight: 900,
                                    fontSize: '48px'
                                }}
                            >
                                {displayPhoto ? (
                                    <Image
                                        src={displayPhoto}
                                        alt={displayName}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <span>{getInitial(displayName)}</span>
                                )}
                            </div>
                            <h2 className="font-24 font-900 text-main mb-4">{displayName}</h2>
                            <p className="text-secondary font-700 mb-16">日本語学習者 🇯🇵</p>

                            {/* Avatar Grid - only show when no Google photo available */}
                            {!googlePhoto && (
                                <div className="avatar-grid flex justify-start sm:justify-center gap-12 py-16 px-16 overflow-x-auto no-scrollbar">
                                    {AVATARS.map((avatar, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => updateProfile({ photoURL: avatar })}
                                            className={`relative w-48 h-48 rounded-full overflow-hidden cursor-pointer border-2 ${localAvatar === avatar ? 'border-duo-green' : 'border-transparent'}`}
                                        >
                                            <Image src={`${BASE_PATH}${avatar}`} alt={`Avatar ${idx}`} fill className="object-cover" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    );
                })()}

                <div className="stat-grid">
                    <div className="profile-stat-card">
                        <span className="font-12 font-800 text-secondary uppercase">Streak</span>
                        <span className="font-24 font-900 text-duo-orange">🔥 {stats.streak}</span>
                    </div>
                    <div className="profile-stat-card">
                        <span className="font-12 font-800 text-secondary uppercase">Total XP</span>
                        <span className="font-24 font-900 text-duo-green">✨ {stats.xp}</span>
                    </div>
                    <div className="profile-stat-card">
                        <span className="font-12 font-800 text-secondary uppercase">Gems</span>
                        <span className="font-24 font-900 text-duo-blue">💎 {stats.gems}</span>
                    </div>
                    <div className="profile-stat-card">
                        <span className="font-12 font-800 text-secondary uppercase">Mastery (極)</span>
                        <span className="font-24 font-900 text-duo-yellow">👑 {stats.masteredUnits?.length || 0}</span>
                    </div>
                </div>

                {user ? (
                    <>
                        {/* Developer Tools */}
                        {user.email === 'heroyik@gmail.com' && devClickCount >= 5 && (
                            <div className="mt-32 p-16 bg-dev border-dev rounded-12 text-left">
                                <p className="font-14 font-800 text-duo-green mb-12">🔧 DEV CONSOLE</p>

                                <div className="space-y-12 mb-20">
                                    <div className="flex flex-col gap-4">
                                        <label className="font-12 font-800 uppercase text-secondary">Admin Name</label>
                                        <input
                                            type="text"
                                            value={adminName}
                                            onChange={(e) => setAdminName(e.target.value)}
                                            className="input-standard py-8 px-12"
                                            placeholder="Display Name"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-4">
                                        <label className="font-12 font-800 uppercase text-secondary">Admin Photo URL</label>
                                        <input
                                            type="text"
                                            value={adminPhoto}
                                            onChange={(e) => setAdminPhoto(e.target.value)}
                                            className="input-standard py-8 px-12 font-11"
                                            placeholder="https://image-url"
                                        />
                                    </div>
                                    <button
                                        onClick={() => {
                                            updateProfile({ displayName: adminName, photoURL: adminPhoto });
                                            alert("Admin profile updated! Please wait for sync.");
                                        }}
                                        className="duo-button duo-button-secondary py-8"
                                    >
                                        Update Profile Metadata
                                    </button>
                                </div>

                                <div className="border-t border-glass pt-16 mt-16">
                                    <label className="font-12 font-800 uppercase text-secondary mb-8 block">Progression Tools</label>
                                    <div className="flex items-center gap-8">
                                        <select
                                            value={selectedLevel}
                                            onChange={(e) => setSelectedLevel(Number(e.target.value))}
                                            className="select-standard flex-1"
                                        >
                                            <option value={0}>Initialize (Reset All)</option>
                                            {Array.from({ length: 15 }, (_, i) => i + 1).map(level => (
                                                <option key={level} value={level}>Unlock to Level {level}</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={() => {
                                                if (selectedLevel === 0) {
                                                    if (confirm("Are you sure you want to RESET all progress? This cannot be undone.")) {
                                                        resetProgress();
                                                        setDevClickCount(0);
                                                        alert("Progress initialized!");
                                                    }
                                                } else {
                                                    const units = getUnits();
                                                    unlockProgress(units.slice(0, selectedLevel).map(u => u.id));
                                                    setDevClickCount(0);
                                                }
                                            }}
                                            className="duo-button duo-button-primary w-auto py-8"
                                        >
                                            GO
                                        </button>
                                    </div>
                                </div>

                            </div>
                        )}

                        <button
                            onClick={handleLogout}
                            className="duo-button bg-kv-kurenai shadow-kv-kurenai mt-32 text-white font-900 w-auto mx-auto block"
                        >
                            LOG OUT
                        </button>
                    </>
                ) : (
                    <div className="py-24 border-t-glass mt-24">
                        <div className="font-64 mb-16">🔑</div>
                        <h2 className="font-20 font-900 text-main mb-12">Save Your Progress</h2>
                        <p className="text-secondary font-700 mb-24 px-16">
                            Sign in with Google to sync your XP, streak, and crowns across devices!
                        </p>
                        <button
                            onClick={handleLogin}
                            className="duo-button duo-button-outline flex-center gap-12 p-16 bg-google"
                        >
                            <Image
                                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                                alt="Google"
                                width={20}
                                height={20}
                            />
                            LOG IN WITH GOOGLE
                        </button>
                    </div>
                )}

                {/* Settings Section (Moved outside to allow Guest access) */}
                <div className="settings-section mt-24 pt-24 border-t-glass">
                    <h3 className="font-18 font-900 text-main mb-16 text-left">Settings</h3>

                    <div className="settings-item">
                        <div className="flex flex-col">
                            <span className="font-16 font-700">Sound Effects</span>
                            <span className="font-12 text-secondary">Audio feedback in quiz</span>
                        </div>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={stats.settings?.soundEnabled ?? true}
                                onChange={() => toggleSetting('soundEnabled')}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>

                    <div className="settings-item">
                        <div className="flex flex-col">
                            <span className="font-16 font-700">Haptic Feedback</span>
                            <span className="font-12 text-secondary">Vibration on interactions</span>
                        </div>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={stats.settings?.hapticsEnabled ?? true}
                                onChange={() => toggleSetting('hapticsEnabled')}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>


                    <div className="settings-item">
                        <div className="flex flex-col">
                            <span className="font-16 font-700">Hide Furigana</span>
                            <span className="font-12 text-secondary">Hardcore mode flag</span>
                        </div>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={stats.settings?.hideFurigana ?? false}
                                onChange={() => toggleSetting('hideFurigana')}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>

                    <div className="settings-item">
                        <div className="flex flex-col">
                            <span className="font-16 font-700">Unlock All Levels</span>
                            <span className="font-12 text-secondary">Start any level freely</span>
                        </div>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={stats.settings?.unlockAllLevels ?? false}
                                onChange={() => toggleSetting('unlockAllLevels')}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
}
