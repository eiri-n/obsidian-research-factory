import { App, Notice, TFile } from 'obsidian';
import { Entry } from '@retorquere/bibtex-parser';
import { TemplateService } from './TemplateService';
import { PDFService } from './PDFService';
import { GeminiService } from './GeminiService';
import { ObsidianResearchFactorySettings } from '../types/plugin';

export class NoteGenerator {
    private app: App;
    private templateService: TemplateService;
    private pdfService: PDFService;
    private geminiService: GeminiService;
    private settings: ObsidianResearchFactorySettings;

    constructor(app: App, settings: ObsidianResearchFactorySettings) {
        this.app = app;
        this.settings = settings;
        this.templateService = new TemplateService();
        this.pdfService = new PDFService();
        this.geminiService = new GeminiService(settings.geminiApiKey, settings.aiModelName);
    }

    public updateSettings(settings: ObsidianResearchFactorySettings) {
        this.settings = settings;
        this.geminiService.updateSettings(settings.geminiApiKey, settings.aiModelName);
    }

    /**
     * Generates markdown notes for the given BibTeX entries.
     * @param entries Array of BibTeX entries
     */
    public async generateNotes(entries: Entry[]): Promise<void> {
        let createdCount = 0;
        let updatedCount = 0;
        let errorCount = 0;

        for (const entry of entries) {
            try {
                await this.createOrUpdateNote(entry);
                createdCount++;
            } catch (error) {
                console.error(`Failed to create note for entry ${entry.key}:`, error);
                errorCount++;
            }
        }

        new Notice(`Processed ${entries.length} entries.\nCreated/Updated: ${createdCount}\nErrors: ${errorCount}`);
    }

    private async createOrUpdateNote(entry: Entry): Promise<void> {
        const title = this.sanitizeFileName(this.getFieldValue(entry.fields.title) || entry.key);

        // Determine output path
        let folderPath = this.settings.noteOutputFolder || '';
        // Remove leading/trailing slashes
        folderPath = folderPath.replace(/^\/+|\/+$/g, '');

        // Ensure folder exists
        if (folderPath) {
            if (!this.app.vault.getAbstractFileByPath(folderPath)) {
                await this.app.vault.createFolder(folderPath);
            }
        }

        const filename = folderPath ? `${folderPath}/${title}.md` : `${title}.md`;

        // Prepare data for AI
        const abstract = this.getFieldValue(entry.fields.abstract);

        // Initialize with default empty values so they appear in Frontmatter
        let aiData: any = {
            ai_problem: '',
            ai_method: '',
            ai_result: '',
            ai_future_work: '',
            ai_model: '',
            ai_abstract_hash: ''
        };
        let aiHash = '';

        if (this.settings.enableAI && abstract) {
            aiHash = this.cyrb53(abstract).toString();
        } else {
            if (!this.settings.enableAI) console.log('AI is disabled in settings.');
            if (!abstract) console.log(`No abstract found for ${entry.key}.`);
        }

        const file = this.app.vault.getAbstractFileByPath(filename);
        let existingFrontmatter: any = {};

        if (file instanceof TFile) {
            // Read existing frontmatter to check for cache
            const cache = this.app.metadataCache.getFileCache(file);
            existingFrontmatter = cache?.frontmatter || {};

            // Check if we need to run AI
            if (this.settings.enableAI && abstract) {
                if (existingFrontmatter.ai_abstract_hash === aiHash) {
                    // Skip AI, use existing data if available
                    console.log(`Skipping AI for ${entry.key} (Hash match)`);
                    aiData = {
                        ai_problem: existingFrontmatter.ai_problem,
                        ai_method: existingFrontmatter.ai_method,
                        ai_result: existingFrontmatter.ai_result,
                        ai_future_work: existingFrontmatter.ai_future_work,
                        ai_model: existingFrontmatter.ai_model,
                        ai_abstract_hash: existingFrontmatter.ai_abstract_hash
                    };
                } else {
                    // Run AI
                    console.log(`Running AI for ${entry.key}`);
                    const result = await this.geminiService.analyzeAbstract(abstract, {
                        tasks: this.settings.candidateTasks,
                        methods: this.settings.candidateMethods,
                        targets: this.settings.candidateTargets
                    });

                    if (result) {
                        aiData = {
                            ai_problem: result.problem,
                            ai_method: result.method,
                            ai_result: result.result,
                            ai_future_work: result.future_work,
                            ai_model: this.settings.aiModelName,
                            ai_abstract_hash: aiHash
                        };
                    }
                }
            }
        } else if (this.settings.enableAI && abstract) {
            // New file, run AI
            console.log(`Running AI for new note ${entry.key}`);
            const result = await this.geminiService.analyzeAbstract(abstract, {
                tasks: this.settings.candidateTasks,
                methods: this.settings.candidateMethods,
                targets: this.settings.candidateTargets
            });

            if (result) {
                aiData = {
                    ai_problem: result.problem,
                    ai_method: result.method,
                    ai_result: result.result,
                    ai_future_work: result.future_work,
                    ai_model: this.settings.aiModelName,
                    ai_abstract_hash: aiHash
                };
            }
        }

        const newContent = this.buildNoteContent(entry, aiData);

        if (file instanceof TFile) {
            // Handle existing file based on policy
            const policy = this.settings.updatePolicy;

            if (policy === 'skip') {
                return;
            }

            if (policy === 'overwrite') {
                await this.app.vault.modify(file, newContent);
                return;
            }

            // Default: 'preserve' (Protect Body)
            const oldContent = await this.app.vault.read(file);
            const mergedContent = this.mergeContent(oldContent, newContent);

            // Only update if changed
            if (oldContent !== mergedContent) {
                await this.app.vault.modify(file, mergedContent);
            }

        } else {
            // Create new file
            await this.app.vault.create(filename, newContent);
        }
    }

    private mergeContent(oldContent: string, newContent: string): string {
        // Extract body from old content (everything after the second '---')
        const oldParts = oldContent.split(/^---$/m);
        let oldBody = '';

        if (oldParts.length >= 3) {
            // [empty, frontmatter, body]
            oldBody = oldParts.slice(2).join('---');
        } else {
            // No frontmatter found, treat whole file as body? 
            // Or just append new frontmatter? 
            // For safety, if structure is weird, keep old content as body.
            oldBody = oldContent;
        }

        // Extract frontmatter from new content
        const newParts = newContent.split(/^---$/m);
        let newFrontmatter = '';
        if (newParts.length >= 3) {
            newFrontmatter = `---\n${newParts[1].trim()}\n---`;
        }

        // If we couldn't parse new frontmatter, fallback to overwrite (shouldn't happen with our template)
        if (!newFrontmatter) return newContent;

        // Combine
        // Ensure oldBody starts with newline if it doesn't
        if (oldBody && !oldBody.startsWith('\n')) {
            oldBody = '\n' + oldBody;
        }

        return newFrontmatter + oldBody;
    }

    private buildNoteContent(entry: Entry, aiData: any = {}): string {
        const data = {
            citekey: entry.key,
            title: this.getFieldValue(entry.fields.title),
            author: this.formatAuthors(entry),
            year: this.getFieldValue(entry.fields.year),
            journal: this.getFieldValue(entry.fields.journal),
            type: entry.type,
            abstract: this.getFieldValue(entry.fields.abstract) || 'No abstract available.',
            tags: this.generateTags(entry),
            pdf_path: this.getPDFPath(entry),
            pdf_link: this.getPDFLink(entry),
            ...aiData
        };

        return this.templateService.render(data, this.settings.template);
    }

    private getPDFPath(entry: Entry): string {
        const fileField = this.getFieldValue(entry.fields.file);
        return this.pdfService.resolvePDFPath(fileField, this.settings.pdfRootPath) || '';
    }

    private getPDFLink(entry: Entry): string {
        const path = this.getPDFPath(entry);
        if (!path) return '';
        // Wrap URL in angle brackets to handle spaces/special chars in Obsidian
        return `[Open PDF](<${this.pdfService.getLink(path)}>)`;
    }

    private generateTags(entry: Entry): string {
        const tags: string[] = [];
        const contentToCheck = [
            this.getFieldValue(entry.fields.title),
            this.getFieldValue(entry.fields.abstract),
            this.getFieldValue(entry.fields.journal)
        ].join(' ').toLowerCase();

        for (const rule of this.settings.taggingRules) {
            const keyword = rule.keyword ? rule.keyword.trim().toLowerCase() : '';
            if (keyword && contentToCheck.includes(keyword)) {
                tags.push(rule.tag);
            }
        }

        // Deduplicate
        const uniqueTags = [...new Set(tags)];

        if (uniqueTags.length === 0) return '';

        // Return as YAML list format: ["tag1", "tag2"]
        // This handles spaces, special chars, and avoids # comment issues automatically
        return JSON.stringify(uniqueTags);
    }
    private getFieldValue(field: string | string[] | undefined): string {
        if (!field) return '';
        if (Array.isArray(field)) return field[0] || '';
        return field;
    }

    private formatAuthors(entry: Entry): string {
        // 1. Try parsed creators (structured)
        const creators = (entry as any).creators?.author;
        if (Array.isArray(creators) && creators.length > 0) {
            return creators.map((a: any) => a.lastName || a.literal || '').join(', ');
        }

        // 2. Fallback to raw field
        const rawAuthor = (entry.fields as any).author;
        if (Array.isArray(rawAuthor) && rawAuthor.length > 0) {
            // Check if it's an array of objects (Creators) or strings
            if (typeof rawAuthor[0] === 'object') {
                return rawAuthor.map((a: any) => {
                    const first = a.firstName || '';
                    const last = a.lastName || a.literal || '';
                    return [first, last].filter(Boolean).join(' ');
                }).join(', ');
            }
            // Array of strings
            return rawAuthor.join(', ');
        } else if (typeof rawAuthor === 'string') {
            return rawAuthor;
        }

        return 'Unknown Author';
    }

    private sanitizeFileName(name: string): string {
        return name.replace(/[\\/:*?"<>|]/g, '').substring(0, 255);
    }

    private cyrb53(str: string, seed = 0): number {
        let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
        for (let i = 0, ch; i < str.length; i++) {
            ch = str.charCodeAt(i);
            h1 = Math.imul(h1 ^ ch, 2654435761);
            h2 = Math.imul(h2 ^ ch, 1597334677);
        }
        h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
        h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
        return 4294967296 * (2097151 & h2) + (h1 >>> 0);
    }
}
