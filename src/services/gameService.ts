/**
 * Custom Games & Linux Applications Launcher Service
 * Manages custom executable paths, arguments, and launch states for the Game tab.
 */

import { CustomGameApp } from '../types';
import { launchApp } from './nativeBridge';

export const INITIAL_GAMES: CustomGameApp[] = [];

class GameService {
  private games: CustomGameApp[] = [];

  constructor() {
    this.loadGames();
  }

  private loadGames() {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('xmb_custom_games');
      if (stored) {
        const parsed: CustomGameApp[] = JSON.parse(stored);
        // Filter out premade sample games
        this.games = parsed.filter(
          (g) => !['game-rpcs3', 'game-retroarch', 'game-steam', 'game-pcsx2'].includes(g.id)
        );
        this.saveGames();
      } else {
        this.games = [];
        this.saveGames();
      }
    } catch {
      this.games = [];
    }
  }

  public getGames(): CustomGameApp[] {
    return [...this.games];
  }

  public addGame(game: Omit<CustomGameApp, 'id'>): CustomGameApp {
    const newGame: CustomGameApp = {
      ...game,
      id: `game-${Date.now()}`,
      lastPlayed: 'Just added',
    };
    this.games.unshift(newGame);
    this.saveGames();
    return newGame;
  }

  public removeGame(id: string) {
    this.games = this.games.filter((g) => g.id !== id);
    this.saveGames();
  }

  public updateGame(id: string, updates: Partial<CustomGameApp>) {
    const index = this.games.findIndex((g) => g.id === id);
    if (index !== -1) {
      this.games[index] = { ...this.games[index], ...updates };
      this.saveGames();
    }
  }

  public async launchGame(game: CustomGameApp): Promise<{ success: boolean; output?: string }> {
    this.recordLaunch(game.id);
    return await launchApp(game.execPath, game.args);
  }

  public recordLaunch(id: string) {
    const g = this.games.find((item) => item.id === id);
    if (g) {
      g.lastPlayed = 'Just now';
      this.saveGames();
    }
  }

  private saveGames() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('xmb_custom_games', JSON.stringify(this.games));
    }
  }
}

export const gameService = new GameService();
