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
---

# {{title}}

{{{pdf_link}}}

## 1. どんな研究？（3行要約）
- {{abstract}}

## 2. 手法（Methodology）の肝は？
- 

## 3. 結果のハイライト
- 

## 4. 残された課題・批判（Research Gap）
- 

## 5. 自分の研究への応用アイデア
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
