import { Page } from '@playwright/test';
import { UserStats } from '@/contexts/GamificationContext';

type TestStatsOverride =
  Omit<Partial<UserStats>, 'settings'> & {
    settings?: Partial<NonNullable<UserStats['settings']>>;
  };

/**
 * Seeds the localStorage with kamivoca_stats to bypass Auth
 */
export async function seedTestState(page: Page, stats: TestStatsOverride = {}) {
  const baseSettings: NonNullable<UserStats['settings']> = defaultTestStats.settings ?? {
    soundEnabled: true,
    hapticsEnabled: true,
    hideFurigana: false,
    unlockAllLevels: false,
    hideEasyCognates: false,
  };

  const finalStats: UserStats = {
    ...defaultTestStats,
    ...stats,
    settings: {
      ...baseSettings,
      ...(stats.settings || {}),
    },
  };
  
  await page.goto('');
  await page.evaluate((data) => {
    localStorage.setItem('kamivoca_stats', JSON.stringify(data));
  }, finalStats);
  await page.goto(''); // Full reload to ensure state is picked up
}

export const defaultTestStats: UserStats = {
  xp: 1500,
  gems: 50,
  streak: 5,
  lastStudyDate: new Date().toISOString().split('T')[0],
  completedUnits: ['unit-1'],
  masteredUnits: [],
  mistakes: { '沐浴': 1 },
  unitStats: {
    'unit-1': { failedWords: 1, attempts: 2, isMastered: false }
  },
  settings: {
    soundEnabled: true,
    hapticsEnabled: true,
    hideFurigana: false,
    unlockAllLevels: false,
    hideEasyCognates: false,
  },
};
