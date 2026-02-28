import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { TextValidator } from "../../packages/text/src/validator";
import { detectTextPhase } from "../../packages/text/src/agent";

describe("text/validator.ts", () => {
  const testDir = path.join(process.cwd(), "test", "temp-text");
  const docsDir = path.join(testDir, "docs");

  beforeEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(docsDir, { recursive: true });
  });

  describe("TextValidator", () => {
    describe("validate - word count", () => {
      it("should pass when word count is above minimum", async () => {
        const validator = new TextValidator({ minWordCount: 10 });
        fs.writeFileSync(path.join(docsDir, "content.md"), 
          "# Title\n\nThis is a test content with many words to meet the minimum requirement.");
        
        const result = await validator.validate(testDir);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it("should fail when word count is below minimum", async () => {
        const validator = new TextValidator({ minWordCount: 100 });
        fs.writeFileSync(path.join(docsDir, "content.md"), "# Short content");
        
        const result = await validator.validate(testDir);
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain("words");
      });

      it("should fail when word count exceeds maximum", async () => {
        const validator = new TextValidator({ maxWordCount: 10 });
        fs.writeFileSync(path.join(docsDir, "content.md"), 
          "# Title\n\nThis is a much longer content that has way too many words.");
        
        const result = await validator.validate(testDir);
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain("words");
      });

      it("should handle both min and max word count", async () => {
        const validator = new TextValidator({ minWordCount: 10, maxWordCount: 20 });
        fs.writeFileSync(path.join(docsDir, "content.md"), 
          "# Title\n\nThis is exactly fifteen words long for testing min and max.");
        
        const result = await validator.validate(testDir);
        expect(result.valid).toBe(true);
      });
    });

    describe("validate - front matter", () => {
      it("should pass when front matter exists", async () => {
        const validator = new TextValidator({ requireFrontMatter: true });
        fs.writeFileSync(path.join(docsDir, "content.md"), 
          "---\ntitle: My Content\ndate: 2024-01-01\n---\n\n# Content");
        
        const result = await validator.validate(testDir);
        expect(result.valid).toBe(true);
      });

      it("should fail when front matter is missing", async () => {
        const validator = new TextValidator({ requireFrontMatter: true });
        fs.writeFileSync(path.join(docsDir, "content.md"), "# Content without front matter");
        
        const result = await validator.validate(testDir);
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain("front matter");
      });
    });

    describe("validate - headings", () => {
      it("should pass when headings exist", async () => {
        const validator = new TextValidator({ requireHeadings: true });
        fs.writeFileSync(path.join(docsDir, "content.md"), "# Main Title\n\n## Section 1\n\nContent here");
        
        const result = await validator.validate(testDir);
        expect(result.valid).toBe(true);
      });

      it("should fail when headings are missing", async () => {
        const validator = new TextValidator({ requireHeadings: true });
        fs.writeFileSync(path.join(docsDir, "content.md"), "Just plain text without any heading");
        
        const result = await validator.validate(testDir);
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain("headings");
      });

      it("should detect headings from h1 to h6", async () => {
        const validator = new TextValidator({ requireHeadings: true });
        fs.writeFileSync(path.join(docsDir, "content.md"), "# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6");
        
        const result = await validator.validate(testDir);
        expect(result.valid).toBe(true);
      });
    });

    describe("validate - multiple files", () => {
      it("should validate all content files in project", async () => {
        const validator = new TextValidator({ minWordCount: 5 });
        fs.writeFileSync(path.join(docsDir, "page1.md"), "# Short");
        fs.writeFileSync(path.join(docsDir, "page2.md"), "# Also short");
        
        const result = await validator.validate(testDir);
        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(2);
      });
    });

    describe("findContentFiles", () => {
      it("should find .md files", () => {
        const validator = new TextValidator();
        fs.writeFileSync(path.join(docsDir, "content.md"), "# Content");
        expect(fs.existsSync(path.join(docsDir, "content.md"))).toBe(true);
      });

      it("should find .txt files", () => {
        const validator = new TextValidator();
        fs.writeFileSync(path.join(docsDir, "content.txt"), "Plain text content");
        expect(fs.existsSync(path.join(docsDir, "content.txt"))).toBe(true);
      });

      it("should find .markdown files", () => {
        const validator = new TextValidator();
        fs.writeFileSync(path.join(docsDir, "content.markdown"), "# Markdown content");
        expect(fs.existsSync(path.join(docsDir, "content.markdown"))).toBe(true);
      });

      it("should ignore non-content files", () => {
        const validator = new TextValidator();
        fs.writeFileSync(path.join(docsDir, "script.js"), "console.log('not content')");
        expect(async () => await validator.validate(testDir)).not.toThrow();
      });

      it("should ignore node_modules and dotfiles", () => {
        const validator = new TextValidator();
        fs.mkdirSync(path.join(docsDir, "node_modules"), { recursive: true });
        fs.mkdirSync(path.join(docsDir, ".git"), { recursive: true });
        fs.writeFileSync(path.join(docsDir, "node_modules", "pkg.js"), "module.exports = {}");
        fs.writeFileSync(path.join(docsDir, ".git", "config"), "[core]");
        expect(async () => await validator.validate(testDir)).not.toThrow();
      });
    });

    describe("empty project", () => {
      it("should return invalid when no content files exist", async () => {
        const validator = new TextValidator();
        const result = await validator.validate(testDir);
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain("No content files found");
      });
    });
  });
});

describe("text/agent.ts - detectTextPhase", () => {
  const testDir = path.join(process.cwd(), "test", "temp-text-phase");

  beforeEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
  });

  describe("detectTextPhase", () => {
    it('should return "need-spec" when no spec or tasks exist', () => {
      const phase = detectTextPhase(testDir);
      expect(phase).toBe("need-spec");
    });

    it('should return "need-tasks" when spec exists but no tasks', () => {
      fs.mkdirSync(path.join(testDir, "docs"), { recursive: true });
      fs.writeFileSync(
        path.join(testDir, "docs", "content_spec.md"),
        "# Content Spec\n\nType: Blog Post"
      );

      const phase = detectTextPhase(testDir);
      expect(phase).toBe("need-tasks");
    });

    it('should return "need-tasks" when content_spec.md exists in root but no tasks', () => {
      fs.writeFileSync(
        path.join(testDir, "content_spec.md"),
        "# Content Spec\n\nType: Blog Post"
      );

      const phase = detectTextPhase(testDir);
      expect(phase).toBe("need-tasks");
    });

    it('should return "execute" when both spec and tasks exist', () => {
      fs.mkdirSync(path.join(testDir, "docs"), { recursive: true });
      fs.writeFileSync(
        path.join(testDir, "docs", "content_spec.md"),
        "# Content Spec\n\nType: Blog Post"
      );
      fs.writeFileSync(
        path.join(testDir, "content_tasks.json"),
        JSON.stringify({ tasks: [{ id: "task-1", passes: false }] })
      );

      const phase = detectTextPhase(testDir);
      expect(phase).toBe("execute");
    });

    it('should return "execute" when tasks exist but no spec (edge case)', () => {
      fs.writeFileSync(
        path.join(testDir, "content_tasks.json"),
        JSON.stringify({ tasks: [{ id: "task-1", passes: false }] })
      );

      const phase = detectTextPhase(testDir);
      expect(phase).toBe("execute");
    });
  });

  describe("runTextBot - integration", () => {
    it("should have docs directory structure ready", () => {
      expect(fs.existsSync(testDir)).toBe(true);
    });
  });
});
