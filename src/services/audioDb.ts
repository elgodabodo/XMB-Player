/**
 * IndexedDB Persistent Audio & Library Store
 * Stores audio Blobs and the full track collection so large music collections (e.g. 900+ tracks)
 * never exceed browser localStorage quota (5MB) and persist across restarts.
 */

import { Track } from '../types';

const DB_NAME = 'xmb_audio_storage';
const DB_VERSION = 2;
const STORE_NAME = 'audio_blobs';
const STORE_TRACKS = 'tracks_store';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(STORE_TRACKS)) {
        db.createObjectStore(STORE_TRACKS);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save audio blob into IndexedDB with graceful handling if quota is reached
 */
export async function saveAudioBlob(trackId: string, blob: Blob): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(blob, trackId);
      req.onsuccess = () => resolve();
      req.onerror = () => {
        console.warn('Audio blob storage warning (quota or disk limit reached):', req.error);
        resolve(); // Always resolve so import pipeline never breaks
      };
    });
  } catch (err) {
    console.warn('Failed to save audio blob to IndexedDB:', err);
  }
}

export async function getAudioBlob(trackId: string): Promise<Blob | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(trackId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function deleteAudioBlob(trackId: string): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(trackId);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {}
}

export async function clearAllAudioBlobs(): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {}
}

/**
 * Save full tracks collection into IndexedDB
 * Allows unlimited track collections (1,000+ files) without hitting localStorage 5MB limit
 */
export async function saveTracksToDb(tracks: Track[]): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_TRACKS, 'readwrite');
      const store = tx.objectStore(STORE_TRACKS);
      const req = store.put(tracks, 'library_tracks');
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {}
}

/**
 * Retrieve tracks collection from IndexedDB
 */
export async function getTracksFromDb(): Promise<Track[] | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_TRACKS, 'readonly');
      const store = tx.objectStore(STORE_TRACKS);
      const req = store.get('library_tracks');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}
