/**
 * Electron AppImage Native IPC Bridge
 * Matches preload.cjs:
 * - window.api.runCommand(command) -> executes terminal commands, binaries, shell scripts via child_process.exec
 * - window.api.openFile(filePath) -> opens files or directories with Linux default application via shell.openPath
 */

// Global Window type declaration for your Electron preload script
declare global {
  interface Window {
    api?: {
      runCommand: (command: string) => Promise<{ success: boolean; stdout?: string; error?: string }>;
      openFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
      readDirectory?: (dirPath: string) => Promise<{ success: boolean; files?: { name: string; path: string; size: number }[]; error?: string }>;
      getMusicDir?: () => Promise<string>;
      // Optional fallback methods
      launchApp?: (execPath?: string, args?: string) => Promise<unknown>;
      [key: string]: any;
    };
  }
}

/**
 * Format a local filesystem path safely into a file:// URL that Chromium can read
 */
export function formatFileUrl(filePath: string): string {
  if (!filePath) return '';
  if (filePath.startsWith('file://') || filePath.startsWith('blob:') || filePath.startsWith('http')) {
    return filePath;
  }
  // Windows paths: C:\Music\... -> file:///C:/Music/...
  if (/^[a-zA-Z]:[\\/]/.test(filePath)) {
    return `file:///${filePath.replace(/\\/g, '/')}`;
  }
  // Linux / Unix absolute path: /home/... -> file:///home/...
  if (filePath.startsWith('/')) {
    return `file://${filePath}`;
  }
  return filePath;
}

/**
 * Read audio files in a local directory using Electron Node.js IPC
 */
export async function readDirectory(
  dirPath: string
): Promise<{ success: boolean; files?: { name: string; path: string; size: number }[]; error?: string }> {
  if (typeof window !== 'undefined' && window.api?.readDirectory) {
    try {
      return await window.api.readDirectory(dirPath);
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to read directory' };
    }
  }

  // Fallback: If runCommand is available on Linux, we can scan via find
  if (typeof window !== 'undefined' && window.api?.runCommand) {
    try {
      const escaped = dirPath.replace(/"/g, '\\"');
      const cmd = `find "${escaped}" -maxdepth 2 -type f \\( -iname "*.mp3" -o -iname "*.flac" -o -iname "*.wav" -o -iname "*.ogg" -o -iname "*.m4a" -o -iname "*.aac" -o -iname "*.opus" \\)`;
      const res = await window.api.runCommand(cmd);
      if (res.success && res.stdout) {
        const lines = res.stdout.split('\n').map((l) => l.trim()).filter(Boolean);
        const files = lines.map((p) => ({
          name: p.split('/').pop() || 'Track',
          path: p,
          size: 0,
        }));
        return { success: true, files };
      }
    } catch (err: any) {
      console.warn('Fallback directory scan error:', err);
    }
  }

  return { success: false, error: 'Direct directory reading requires Electron runtime' };
}

/**
 * Get OS default Music directory path
 */
export async function getDefaultMusicDir(): Promise<string> {
  if (typeof window !== 'undefined' && window.api?.getMusicDir) {
    try {
      return await window.api.getMusicDir();
    } catch {}
  }
  return '';
}

/**
 * Launch an external Linux application, executable, emulator, or terminal command
 * Formats command line and invokes window.api.runCommand()
 */
export async function launchApp(
  execPath: string,
  args?: string
): Promise<{ success: boolean; output?: string; error?: string }> {
  // Build clean shell command
  const fullCommand = args ? `${execPath} ${args}`.trim() : execPath.trim();

  if (typeof window !== 'undefined' && window.api) {
    try {
      // 1. Primary method from your preload.cjs
      if (typeof window.api.runCommand === 'function') {
        const result = await window.api.runCommand(fullCommand);
        if (result && result.success) {
          return {
            success: true,
            output: result.stdout || `Successfully launched: ${fullCommand}`,
          };
        } else {
          return {
            success: false,
            error: result?.error || 'Command failed with non-zero exit code',
            output: result?.error,
          };
        }
      }

      // 2. Secondary fallback if launchApp is used
      if (typeof window.api.launchApp === 'function') {
        const res = await window.api.launchApp(execPath, args);
        return {
          success: true,
          output: typeof res === 'string' ? res : JSON.stringify(res),
        };
      }
    } catch (err: any) {
      console.error('[Electron IPC Error] Failed in launchApp:', err);
      return {
        success: false,
        error: err?.message || 'Failed to dispatch command to host',
        output: err?.message,
      };
    }
  }

  // Fallback for browser development mode
  console.log(`[NativeBridge:BrowserMode] Executing command: "${fullCommand}"`);
  return {
    success: true,
    output: `Dispatched "${fullCommand}" to Linux Subsystem`,
  };
}

/**
 * Open a media file, audio track, video, or folder using the Linux default OS application
 * Invokes window.api.openFile(filePath)
 */
export async function openMediaFile(
  filePath: string
): Promise<{ success: boolean; error?: string }> {
  if (typeof window !== 'undefined' && window.api) {
    try {
      if (typeof window.api.openFile === 'function') {
        const result = await window.api.openFile(filePath);
        return result || { success: true };
      }
    } catch (err: any) {
      console.error('[Electron IPC Error] Failed in openMediaFile:', err);
      return { success: false, error: err?.message || 'Failed to open file' };
    }
  }

  console.log(`[NativeBridge:BrowserMode] openFile("${filePath}")`);
  return { success: true };
}

export const nativeBridge = {
  launchApp,
  openMediaFile,
  isElectron: typeof window !== 'undefined' && Boolean(window.api?.runCommand),
};

/**
 * Convert a base64 encoded string into a Blob
 */
export function base64ToBlob(base64: string, mimeType = 'audio/mpeg'): Blob {
  const binaryString = atob(base64.trim().replace(/\s/g, ''));
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

/**
 * Read a local file directly using Electron IPC runCommand if available
 * (Works in AppImage on Linux with base64 and Windows with powershell)
 */
export async function readFileAsBlob(filePath: string, format = 'mp3'): Promise<Blob | null> {
  if (typeof window === 'undefined' || !window.api?.runCommand || !filePath) {
    return null;
  }
  try {
    const isWindows = /^[a-zA-Z]:/.test(filePath) || filePath.includes('\\');
    const mime = format.toLowerCase() === 'flac' ? 'audio/flac' :
                 format.toLowerCase() === 'wav' ? 'audio/wav' :
                 format.toLowerCase() === 'ogg' ? 'audio/ogg' :
                 format.toLowerCase() === 'm4a' || format.toLowerCase() === 'aac' ? 'audio/mp4' : 'audio/mpeg';

    if (isWindows) {
      const escaped = filePath.replace(/'/g, "''");
      const cmd = `powershell -NoProfile -Command "[Convert]::ToBase64String([System.IO.File]::ReadAllBytes('${escaped}'))"`;
      const res = await window.api.runCommand(cmd);
      if (res && res.success && res.stdout) {
        return base64ToBlob(res.stdout, mime);
      }
    } else {
      const escaped = filePath.replace(/"/g, '\\"');
      const cmd = `base64 -w 0 "${escaped}"`;
      const res = await window.api.runCommand(cmd);
      if (res && res.success && res.stdout) {
        return base64ToBlob(res.stdout, mime);
      }
    }
  } catch (err) {
    console.warn('Native readFileAsBlob error:', err);
  }
  return null;
}
