import { App, Modal, Setting } from 'obsidian';
import ObsidianResearchFactoryPlugin from '../main';

export class WelcomeModal extends Modal {
    plugin: ObsidianResearchFactoryPlugin;

    constructor(app: App, plugin: ObsidianResearchFactoryPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: 'Welcome to Obsidian Research Factory!' });
        contentEl.createEl('p', { text: 'Let\'s get your research environment set up. Please select your BibTeX file.' });

        new Setting(contentEl)
            .setName('BibTeX File Path')
            .setDesc('Absolute path to your .bib file.')
            .addText(text => text
                .setPlaceholder('/path/to/library.bib')
                .setValue(this.plugin.settings.bibTexFilePath)
                .onChange(async (value) => {
                    this.plugin.settings.bibTexFilePath = value;
                    await this.plugin.saveSettings();
                    this.plugin.watcherService.updatePath(value);
                }));

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('Finish Setup')
                .setCta()
                .onClick(() => {
                    this.close();
                }));
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
