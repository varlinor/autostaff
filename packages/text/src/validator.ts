/**
 * Text content validator
 * 
 * Validates text content creation tasks including:
 * - Word count verification
 * - Structure validation
 * - Format checking
 */

import fs from "node:fs";
import path from "node:path";

export interface TextValidatorOptions {
  minWordCount?: number;
  maxWordCount?: number;
  requireFrontMatter?: boolean;
  requireHeadings?: boolean;
}

export class TextValidator {
  private options: TextValidatorOptions;

  constructor(options: TextValidatorOptions = {}) {
    this.options = options;
  }

  /**
   * Validate text content task completion
   */
  async validate(projectDir: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    const contentFiles = this.findContentFiles(projectDir);

    if (contentFiles.length === 0) {
      errors.push("No content files found");
      return { valid: false, errors };
    }

    for (const file of contentFiles) {
      const content = fs.readFileSync(file, "utf-8");
      const relativePath = path.relative(projectDir, file);

      // Word count check
      if (this.options.minWordCount) {
        const wordCount = this.countWords(content);
        if (wordCount < this.options.minWordCount) {
          errors.push(`${relativePath}: ${wordCount} words (minimum: ${this.options.minWordCount})`);
        }
      }

      if (this.options.maxWordCount) {
        const wordCount = this.countWords(content);
        if (wordCount > this.options.maxWordCount) {
          errors.push(`${relativePath}: ${wordCount} words (maximum: ${this.options.maxWordCount})`);
        }
      }

      // Front matter check
      if (this.options.requireFrontMatter && !this.hasFrontMatter(content)) {
        errors.push(`${relativePath}: Missing front matter (title, date, etc.)`);
      }

      // Headings check
      if (this.options.requireHeadings && !this.hasHeadings(content)) {
        errors.push(`${relativePath}: Missing headings`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Find content files in project
   */
  private findContentFiles(projectDir: string): string[] {
    const extensions = [".md", ".txt", ".markdown"];
    const files: string[] = [];

    const walkDir = (dir: string) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
            walkDir(fullPath);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (extensions.includes(ext)) {
              files.push(fullPath);
            }
          }
        }
      } catch {
        // Ignore permission errors
      }
    };

    walkDir(projectDir);
    return files;
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    const withoutFrontMatter = text.replace(/^---[\s\S]*?---/, "");
    const plainText = withoutFrontMatter
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
      .replace(/[#*_~`]/g, "")
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`[^`]+`/g, "");

    const words = plainText.split(/\s+/).filter(word => word.length > 0);
    return words.length;
  }

  /**
   * Check if content has front matter
   */
  private hasFrontMatter(content: string): boolean {
    return /^---\n[\s\S]*?---/m.test(content);
  }

  /**
   * Check if content has headings
   */
  private hasHeadings(content: string): boolean {
    return /^#{1,6}\s+/m.test(content);
  }
}
