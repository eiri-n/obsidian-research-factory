import Mustache from 'mustache';

export class TemplateService {

    // Default template based on the spec
    private readonly DEFAULT_TEMPLATE = `---
citekey: {{citekey}}
title: "{{title}}"
author: "{{author}}"
year: {{year}}
journal: "{{journal}}"
type: {{type}}
tags: {{{tags}}}
ai_model: "{{ai_model}}"
ai_abstract_hash: "{{ai_abstract_hash}}"
---

# {{title}}

{{{pdf_link}}}

## 1. どんな研究？（AI要約）
**解きたい問題**: {{ai_problem}}
**手法**: {{ai_method}}
**結果**: {{ai_result}}

## 2. Abstract
{{abstract}}

## 3. 今後の課題（AI抽出）
- {{ai_future_work}}

## 4. 自分の研究への応用アイデア
- 
`;

    /**
     * Renders the template with the given data.
     * @param data The data object to render.
     * @param templateString Optional custom template string. If not provided, uses default.
     */
    public render(data: any, templateString?: string): string {
        const template = templateString || this.DEFAULT_TEMPLATE;
        try {
            return Mustache.render(template, data);
        } catch (error) {
            console.error('Template rendering failed:', error);
            return `Error rendering template: ${error}`;
        }
    }

    public getDefaultTemplate(): string {
        return this.DEFAULT_TEMPLATE;
    }
}
