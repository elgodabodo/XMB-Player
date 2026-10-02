/**
 * Custom Games & Linux Applications Launcher Service
 * Manages custom executable paths, arguments, and launch states for the Game tab.
 */

import { CustomGameApp } from '../types';

export const INITIAL_GAMES: CustomGameApp[] = [
  {
    id: 'game-rpcs3',
    title: 'RPCS3 - PlayStation 3 Emulator',
    execPath: '/usr/bin/rpcs3',
    args: '--no-gui',
    category: 'emulator',
    description: 'Open-source Sony PlayStation 3 emulator and debugger',
    coverUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&q=80',
    lastPlayed: 'Yesterday',
  },
  {
    id: 'game-retroarch',
    title: 'RetroArch Universal Emulation',
    execPath: '/usr/bin/retroarch',
    args: '-v',
    category: 'retro',
    description: 'Frontend for emulators, game engines, and media players',
    coverUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&q=80',
    lastPlayed: '2 days ago',
  },
  {
    id: 'game-steam',
    title: 'Steam Big Picture Mode',
    execPath: 'steam',
    args: '-gamepadui',
    category: 'steam',
    description: 'Valve Steam gaming client for 10-foot television interface',
    coverUrl: 'https://images.unsplash.com/photo-1612287233207-6b4df30b42c4?w=400&q=80',
    lastPlayed: 'Today',
  },
  {
    id: 'game-pcsx2',
    title: 'PCSX2 - PlayStation 2 Core',
    execPath: '/usr/bin/pcsx2-qt',
    args: '-fullscreen',
    category: 'emulator',
    description: 'PlayStation 2 video game console emulator for Linux',
    coverUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&q=80',
    lastPlayed: 'Last week',
  },
];

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
        this.games = JSON.parse(stored);
      } else {
        this.games = [...INITIAL_GAMES];
        this.saveGames();
      }
    } catch {
      this.games = [...INITIAL_GAMES];
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

  public recordLaunch(id: string) {
    const index = this.games.findIndex((g) => g.id === id);
    if (index !== -1) {
      this.games[index].lastPlayed = 'Just now';
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
