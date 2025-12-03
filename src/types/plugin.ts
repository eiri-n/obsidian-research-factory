export interface TaggingRule {
    id: string;
    keyword: string;
    tag: string;
}

export type UpdatePolicy = 'preserve' | 'overwrite' | 'skip';

export interface ObsidianResearchFactorySettings {
    bibTexFilePath: string;
    template: string;
    taggingRules: TaggingRule[];
    pdfRootPath: string;
    updatePolicy: UpdatePolicy;
    noteOutputFolder: string;
}

export const DEFAULT_SETTINGS: ObsidianResearchFactorySettings = {
    bibTexFilePath: '',
    template: '', // Empty means use default
    taggingRules: [],
    pdfRootPath: '',
    updatePolicy: 'preserve',
    noteOutputFolder: '' // Empty means root
}
