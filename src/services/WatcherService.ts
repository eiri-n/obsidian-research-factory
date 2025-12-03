import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Notice } from 'obsidian';

export class WatcherService {
    private watcher: fs.FSWatcher | null = null;
    private filePath: string;
    private onChange: () => void;
    private debounceTimer: NodeJS.Timeout | null = null;
    private readonly DEBOUNCE_MS = 1000;

    constructor(filePath: string, onChange: () => void) {
        this.filePath = this.resolvePath(filePath);
        this.onChange = onChange;
    }

    public start(): void {
        if (this.watcher) {
            return; // Already watching
        }

        // Re-resolve in case it changed (though constructor handles init)
        const resolvedPath = this.resolvePath(this.filePath);

        if (!resolvedPath || !fs.existsSync(resolvedPath)) {
            console.warn(`WatcherService: File not found: ${resolvedPath}`);
            return;
        }

        try {
            console.log(`Starting watcher on: ${resolvedPath}`);
            this.watcher = fs.watch(resolvedPath, (eventType, filename) => {
                if (eventType === 'change') {
                    this.handleFileChange();
                }
            });
            new Notice(`Started watching: ${resolvedPath}`);
        } catch (error) {
            console.error('Failed to start watcher:', error);
            new Notice('Failed to start file watcher.');
        }
    }

    public stop(): void {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
            console.log('Stopped watcher.');
        }
    }

    public updatePath(newPath: string): void {
        const resolved = this.resolvePath(newPath);
        if (this.filePath === resolved) return;

        this.stop();
        this.filePath = resolved;
        this.start();
    }

    private handleFileChange(): void {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = setTimeout(() => {
            console.log('File change detected (debounced). Triggering update...');
            this.onChange();
            this.debounceTimer = null;
        }, this.DEBOUNCE_MS);
    }

    private resolvePath(filePath: string): string {
        if (!filePath) return '';
        if (filePath.startsWith('~')) {
            return path.join(os.homedir(), filePath.slice(1));
        }
        return filePath;
    }
}
