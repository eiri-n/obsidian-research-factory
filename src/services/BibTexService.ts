import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { parse } from '@retorquere/bibtex-parser';
import { Notice } from 'obsidian';

export class BibTexService {

    private entryHashes: Map<string, string> = new Map();

    /**
     * Reads and parses a BibTeX file from the given path.
     * @param rawPath Absolute path to the .bib file (supports ~)
     * @param forceUpdate If true, ignores cache and returns all entries.
     */
    public async loadAndParse(rawPath: string, forceUpdate: boolean = false): Promise<any[]> {
        if (!rawPath) {
            console.warn('BibTexService: No file path provided.');
            return [];
        }

        const filePath = this.resolvePath(rawPath);

        try {
            // 1. Check if file exists
            if (!fs.existsSync(filePath)) {
                const msg = `BibTeX file not found: ${filePath}`;
                console.error(msg);
                new Notice(msg);
                return [];
            }

            // 2. Read file content
            const bibtexContent = fs.readFileSync(filePath, 'utf-8');

            // 3. Parse content
            const bibliography = parse(bibtexContent);

            // 4. Output results
            if (bibliography.errors && bibliography.errors.length > 0) {
                const errorMsg = `Parsed with ${bibliography.errors.length} errors. Check console for details.`;
                console.warn('BibTeX Parsing Errors:', bibliography.errors);
                new Notice(errorMsg);
            }

            const allEntries = bibliography.entries;
            let entriesToProcess: any[] = [];

            if (forceUpdate) {
                console.log('Force update: Processing all entries.');
                entriesToProcess = allEntries;
                // Update all hashes
                this.entryHashes.clear();
                for (const entry of allEntries) {
                    this.entryHashes.set(entry.key, this.calculateHash(entry));
                }
            } else {
                // Diff update
                let changedCount = 0;
                for (const entry of allEntries) {
                    const newHash = this.calculateHash(entry);
                    const oldHash = this.entryHashes.get(entry.key);

                    if (newHash !== oldHash) {
                        entriesToProcess.push(entry);
                        this.entryHashes.set(entry.key, newHash);
                        changedCount++;
                    }
                }
                console.log(`Diff update: ${changedCount} entries changed.`);
            }

            const successMsg = `Parsed ${allEntries.length} entries. Updating ${entriesToProcess.length} notes.`;
            console.log(successMsg);
            if (entriesToProcess.length > 0 || forceUpdate) {
                new Notice(successMsg);
            }

            return entriesToProcess;

        } catch (error) {
            const errorMsg = `Failed to parse BibTeX file: ${error instanceof Error ? error.message : String(error)}`;
            console.error(errorMsg);
            new Notice('Critical Error: Failed to parse BibTeX file. See console.');
            return [];
        }
    }

    private calculateHash(entry: any): string {
        // Simple hash based on stringified fields
        // We only care about fields that affect the note content
        const dataToHash = {
            fields: entry.fields,
            creators: entry.creators,
            type: entry.type
        };
        return JSON.stringify(dataToHash);
    }

    private resolvePath(filePath: string): string {
        if (filePath.startsWith('~')) {
            return path.join(os.homedir(), filePath.slice(1));
        }
        return filePath;
    }
}
