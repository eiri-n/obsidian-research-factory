import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import ObsidianResearchFactoryPlugin from '../main';

export class ObsidianResearchFactorySettingTab extends PluginSettingTab {
    plugin: ObsidianResearchFactoryPlugin;

    constructor(app: App, plugin: ObsidianResearchFactoryPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        containerEl.createEl('h2', { text: 'Obsidian Research Factory Settings' });

        new Setting(containerEl)
            .setName('BibTeX File Path')
            .setDesc('The absolute path to your .bib file (e.g., /Users/name/Documents/paperpile.bib)')
            .addText(text => text
                .setPlaceholder('/path/to/your/library.bib')
                .setValue(this.plugin.settings.bibTexFilePath)
                .onChange(async (value) => {
                    this.plugin.settings.bibTexFilePath = value;
                    await this.plugin.saveSettings();
                    this.plugin.watcherService.updatePath(value);
                }));

        new Setting(containerEl)
            .setName('Note Output Folder')
            .setDesc('Folder where new notes will be created (e.g. "Literature/Inbox"). Leave empty for root.')
            .addText(text => text
                .setPlaceholder('Literature/Inbox')
                .setValue(this.plugin.settings.noteOutputFolder)
                .onChange(async (value) => {
                    this.plugin.settings.noteOutputFolder = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('PDF Root Folder')
            .setDesc('Local folder where your PDFs are stored. Used to resolve relative paths.')
            .addText(text => text
                .setPlaceholder('/Users/name/Google Drive/Paperpile')
                .setValue(this.plugin.settings.pdfRootPath)
                .onChange(async (value) => {
                    this.plugin.settings.pdfRootPath = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Update Policy')
            .setDesc('How to handle existing notes when the BibTeX file is updated.')
            .addDropdown(dropdown => dropdown
                .addOption('preserve', 'Protect Body (Update Metadata Only)')
                .addOption('overwrite', 'Overwrite (Replace Entire Note)')
                .addOption('skip', 'Skip (Do Not Update)')
                .setValue(this.plugin.settings.updatePolicy)
                .onChange(async (value) => {
                    this.plugin.settings.updatePolicy = value as any;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Note Template')
            .setDesc('Mustache template for new notes. Leave empty to use default.')
            .addTextArea(text => text
                .setPlaceholder('--- ...')
                .setValue(this.plugin.settings.template)
                .onChange(async (value) => {
                    this.plugin.settings.template = value;
                    await this.plugin.saveSettings();
                }))
            .addButton(btn => btn
                .setButtonText('Reset to Default')
                .setWarning()
                .onClick(async () => {
                    this.plugin.settings.template = '';
                    await this.plugin.saveSettings();
                    // Refresh the display to show empty textarea
                    this.display();
                    new Notice('Template reset to default.');
                }));

        containerEl.createEl('h3', { text: 'Auto-Tagging Rules' });

        const rulesContainer = containerEl.createDiv();
        this.renderRules(rulesContainer);

        new Setting(containerEl)
            .addButton(btn => btn
                .setButtonText('Add Rule')
                .onClick(async () => {
                    this.plugin.settings.taggingRules.push({
                        id: Date.now().toString(),
                        keyword: '',
                        tag: ''
                    });
                    await this.plugin.saveSettings();
                    this.renderRules(rulesContainer);
                }));
    }

    private renderRules(container: HTMLElement): void {
        container.empty();
        this.plugin.settings.taggingRules.forEach((rule, index) => {
            const div = container.createDiv({ cls: 'tagging-rule-row' });
            div.style.display = 'flex';
            div.style.gap = '10px';
            div.style.marginBottom = '10px';

            new Setting(div)
                .setName(`Rule ${index + 1}`)
                .addText(text => text
                    .setPlaceholder('Keyword (e.g. "AI")')
                    .setValue(rule.keyword)
                    .onChange(async (value) => {
                        rule.keyword = value;
                        await this.plugin.saveSettings();
                    }))
                .addText(text => text
                    .setPlaceholder('Tag (e.g. "#topic/ai")')
                    .setValue(rule.tag)
                    .onChange(async (value) => {
                        rule.tag = value;
                        await this.plugin.saveSettings();
                    }))
                .addButton(btn => btn
                    .setButtonText('Remove')
                    .setWarning()
                    .onClick(async () => {
                        this.plugin.settings.taggingRules.splice(index, 1);
                        await this.plugin.saveSettings();
                        this.renderRules(container);
                    }));
        });
    }
}
