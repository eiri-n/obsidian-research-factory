# Obsidian Research Factory

**Automated research workflow plugin for Obsidian.**

Obsidian Research Factory is a powerful plugin designed to streamline your academic research workflow. It automatically generates Obsidian notes from your BibTeX library, links PDFs, and applies custom tagging rules, helping you build a connected knowledge base effortlessly.

## Features

*   **BibTeX Sync**: Automatically watches your `.bib` file for changes and generates/updates notes for each entry.
*   **Smart Note Generation**: Creates structured notes with metadata (authors, year, journal) and abstract.
*   **PDF Integration**: Automatically links local PDF files (including Google Drive paths) to your notes.
*   **Auto-Tagging**: Define custom rules to automatically tag notes based on keywords in the title, abstract, or journal.
*   **Customizable Templates**: Use Mustache templates to define exactly how your notes should look.
*   **Safe Updates**:
    *   **Protect Body**: Preserves your manual notes/edits while updating metadata from BibTeX.
    *   **Overwrite**: Completely replaces the note with the latest BibTeX data.
    *   **Skip**: Ignores existing notes.
*   **Performance**: Optimized for large libraries using diff-based updates.

## Installation

1.  Clone this repository into your vault's `.obsidian/plugins/` directory:
    ```bash
    git clone https://github.com/eiri-n/obsidian-research-factory.git
    cd obsidian-research-factory
    ```
2.  Install dependencies and build:
    ```bash
    npm install
    npm run build
    ```
3.  Reload Obsidian and enable "Obsidian Research Factory" in Community Plugins.

## Usage

### 1. Configuration
Go to **Settings > Obsidian Research Factory**:
*   **BibTeX File**: Select your `.bib` file (e.g., exported from Paperpile, Zotero).
*   **PDF Root Folder**: (Optional) Path to your local PDF library.
*   **Note Output Folder**: (Optional) Folder where generated notes will be saved.
*   **Update Policy**: Choose how to handle updates (Default: "Protect Body").

### 2. Auto-Tagging
In Settings, add rules to automatically tag your papers:
*   **Keyword**: The word to search for (case-insensitive, e.g., "Diffusion").
*   **Tag**: The tag to apply (e.g., "#topic/diffusion").

### 3. Commands
*   `Obsidian Research Factory: Manually Parse BibTeX File`: Forces a full re-sync of your library.
*   `Obsidian Research Factory: Toggle File Watcher`: Restarts the file watcher.

## Development

This project uses TypeScript and the Obsidian API.

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Watch for changes (dev mode)
npm run dev
```

## License

MIT
