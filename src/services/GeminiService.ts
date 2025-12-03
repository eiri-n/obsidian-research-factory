import { requestUrl, Notice } from 'obsidian';

export interface Candidates {
    tasks: string[];
    methods: string[];
    targets: string[];
}

export interface StructuredData {
    problem: string;
    method: string;
    result: string;
    future_work: string;
}

export class GeminiService {
    private apiKey: string;
    private modelName: string;

    constructor(apiKey: string, modelName: string) {
        this.apiKey = apiKey;
        this.modelName = modelName;
    }

    public updateSettings(apiKey: string, modelName: string) {
        this.apiKey = apiKey;
        this.modelName = modelName;
    }

    public async analyzeAbstract(abstract: string, candidates: Candidates): Promise<StructuredData | null> {
        if (!this.apiKey) {
            console.warn('Gemini API Key is missing.');
            return null;
        }

        const prompt = this.buildPrompt(abstract, candidates);

        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`;

            const response = await requestUrl({
                url: url,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }]
                })
            });

            if (response.status !== 200) {
                console.error(`Gemini API Error: ${response.status}`, response.text);
                new Notice(`Gemini API Error: ${response.status}`);
                return null;
            }

            const data = response.json;
            const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!textResponse) {
                console.warn('Gemini API returned empty response.');
                return null;
            }

            return this.parseResponse(textResponse);

        } catch (error) {
            console.error('Failed to call Gemini API:', error);
            new Notice('Failed to analyze abstract with Gemini.');
            return null;
        }
    }

    private buildPrompt(abstract: string, candidates: Candidates): string {
        return `
You are an expert researcher. Analyze the following abstract and extract the key information in Japanese.

Abstract:
"${abstract}"

Please output the result in strict JSON format with the following keys:
- "problem": 解きたい問題 (The problem the authors want to solve)
- "method": 使った手法 (The methods used)
- "result": 結果 (The results obtained)
- "future_work": 筆者が考える今後の課題 (Future challenges or limitations mentioned)

Ensure all values are in Japanese.
Do not include markdown code blocks or any other text.
`;
    }

    private parseResponse(text: string): StructuredData | null {
        try {
            // Clean up markdown code blocks if present
            const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
            const json = JSON.parse(cleanedText);

            // Validate structure
            if (json.problem && json.method && json.result) {
                return {
                    problem: String(json.problem),
                    method: String(json.method),
                    result: String(json.result),
                    future_work: String(json.future_work || '記載なし')
                };
            } else {
                console.error('Gemini response structure invalid:', json);
                return null;
            }
        } catch (error) {
            console.error('Failed to parse Gemini response JSON:', error, text);
            return null;
        }
    }
}
