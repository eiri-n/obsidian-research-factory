import { Plugin, Notice } from 'obsidian';
import { ObsidianResearchFactorySettings, DEFAULT_SETTINGS } from './types/plugin';
import { ObsidianResearchFactorySettingTab } from './ui/SettingsTab';
import { BibTexService } from './services/BibTexService';
import { NoteGenerator } from './services/NoteGenerator';

import { WatcherService } from './services/WatcherService';

import { WelcomeModal } from './ui/WelcomeModal';

export default class ObsidianResearchFactoryPlugin extends Plugin {
    settings: ObsidianResearchFactorySettings;
    bibTexService: BibTexService;
    noteGenerator: NoteGenerator;
    watcherService: WatcherService;

    async onload() {
        console.log('Loading Obsidian Research Factory plugin...');

        await this.loadSettings();

        this.bibTexService = new BibTexService();
        this.noteGenerator = new NoteGenerator(this.app, this.settings);

        // Initialize Watcher
        this.watcherService = new WatcherService(
            this.settings.bibTexFilePath,
            async () => {
                new Notice('BibTeX file changed. Checking for updates...');
                // Diff update (forceUpdate = false)
                const entries = await this.bibTexService.loadAndParse(this.settings.bibTexFilePath, false);
                if (entries && entries.length > 0) {
                    await this.noteGenerator.generateNotes(entries);
                } else {
                    console.log('No changes detected in BibTeX entries.');
                }
            }
        );

        // Register Settings Tab
        this.addSettingTab(new ObsidianResearchFactorySettingTab(this.app, this));

        // Show Welcome Modal if path is not set
        if (!this.settings.bibTexFilePath) {
            new WelcomeModal(this.app, this).open();
        }

        // Add Command: Manually Parse BibTeX
        this.addCommand({
            id: 'parse-bibtex-manual',
            name: 'Manually Parse BibTeX File',
            callback: async () => {
                const path = this.settings.bibTexFilePath;
                if (!path) {
                    new Notice('Please set the BibTeX file path in settings first.');
                    return;
                }
                new Notice('Starting manual BibTeX parse (Force Update)...');
                // Force update = true
                const entries = await this.bibTexService.loadAndParse(path, true);
                if (entries && entries.length > 0) {
                    new Notice(`Generating ${entries.length} notes...`);
                    await this.noteGenerator.generateNotes(entries);
                }
            }
        });

        // Add Command: Toggle Watcher
        this.addCommand({
            id: 'toggle-watcher',
            name: 'Toggle File Watcher',
            callback: () => {
                // For now, just restart it. In future, we can add a setting to enable/disable.
                this.watcherService.stop();
                this.watcherService.start();
            }
        });

        // Initial check on load
        if (this.settings.bibTexFilePath) {
            // Initial load should be a force update to populate cache and ensure consistency
            this.bibTexService.loadAndParse(this.settings.bibTexFilePath, true).then(entries => {
                if (entries && entries.length > 0) {
                    console.log(`Auto-parsed ${entries.length} entries.`);
                    // Auto-start watcher if path exists
                    this.watcherService.start();
                }
            }).catch(err => {
                console.error('Auto-parse failed on load:', err);
            });
        }
    }

    async onunload() {
        console.log('Unloading Obsidian Research Factory plugin...');
        this.watcherService.stop();
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        // Propagate settings updates to services
        if (this.noteGenerator) {
            this.noteGenerator.updateSettings(this.settings);
        }
    }
}
