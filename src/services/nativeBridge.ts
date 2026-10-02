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
      // Optional fallback methods
      launchApp?: (execPath?: string, args?: string) => Promise<unknown>;
      [key: string]: any;
    };
  }
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
