import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

export class PDFService {

    /**
     * Resolves the absolute path to the PDF file based on the BibTeX entry and user settings.
     * @param fileField The content of the 'file' field from BibTeX.
     * @param rootPath The user-configured PDF root directory.
     * @returns The resolved absolute path, or null if not found.
     */
    public resolvePDFPath(fileField: string, rootPath: string): string | null {
        if (!fileField) return null;

        // Paperpile often exports file field as "Name.pdf:Path/To/Name.pdf:application/pdf"
        // We need to extract the path part.
        const parts = fileField.split(';');

        for (const part of parts) {
            // Check for Paperpile format (Name:Path:Type) or simple path
            const subParts = part.split(':');
            let candidatePath = '';

            if (subParts.length >= 2 && subParts[1].trim().endsWith('.pdf')) {
                // Format: Name.pdf:All Papers/Folder/File.pdf:application/pdf
                candidatePath = subParts[1].trim();
            } else {
                // Format: All Papers/Folder/File.pdf
                candidatePath = part.trim();
            }

            if (candidatePath) {
                // 1. Try absolute path (if it is one)
                if (path.isAbsolute(candidatePath) && fs.existsSync(candidatePath)) {
                    return candidatePath;
                }

                // 2. Try relative to rootPath
                if (rootPath) {
                    const resolvedRoot = this.resolveHomeDir(rootPath);
                    const fullPath = path.join(resolvedRoot, candidatePath);

                    if (fs.existsSync(fullPath)) {
                        return fullPath;
                    }

                    // 3. Try just the filename in rootPath (flattened structure)
                    const filename = path.basename(candidatePath);
                    const flatPath = path.join(resolvedRoot, filename);
                    if (fs.existsSync(flatPath)) {
                        return flatPath;
                    }
                }
            }
        }

        return null;
    }

    public getLink(pdfPath: string): string {
        if (!pdfPath) return '';
        return `file://${pdfPath}`;
    }

    private resolveHomeDir(filePath: string): string {
        if (filePath.startsWith('~')) {
            return path.join(os.homedir(), filePath.slice(1));
        }
        return filePath;
    }
}
