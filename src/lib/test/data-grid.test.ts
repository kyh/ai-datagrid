import { describe, expect, it } from "vitest";

import { parseTsv } from "@/lib/data-grid";

describe("parseTsv", () => {
  describe("basic parsing", () => {
    it("should parse simple single-row TSV", () => {
      expect(parseTsv("Alice\tKickflip\t95")).toEqual([
        ["Alice", "Kickflip", "95"],
      ]);
    });

    it("should parse multiple rows", () => {
      expect(parseTsv("Alice\tKickflip\t95\nBob\tOllie\t88")).toEqual([
        ["Alice", "Kickflip", "95"],
        ["Bob", "Ollie", "88"],
      ]);
    });

    it("should handle single-column paste", () => {
      expect(parseTsv("Alice\nBob\nCharlie")).toEqual([
        ["Alice"],
        ["Bob"],
        ["Charlie"],
      ]);
    });

    it("should skip empty rows", () => {
      expect(parseTsv("Alice\tKickflip\t95\n\nBob\tOllie\t88")).toEqual([
        ["Alice", "Kickflip", "95"],
        ["Bob", "Ollie", "88"],
      ]);
    });

    it("should handle Windows line endings", () => {
      expect(parseTsv("Alice\tKickflip\r\nBob\tOllie")).toEqual([
        ["Alice", "Kickflip"],
        ["Bob", "Ollie"],
      ]);
    });
  });

  describe("quoted fields (standard spreadsheet TSV)", () => {
    it("should handle quoted multiline content", () => {
      const text =
        'Alice\tKickflip\t95\nBob\t"Trick with\nmultiple\nlines"\t98';
      expect(parseTsv(text)).toEqual([
        ["Alice", "Kickflip", "95"],
        ["Bob", "Trick with\nmultiple\nlines", "98"],
      ]);
    });

    it("should handle escaped quotes", () => {
      const text = '"She said ""hello"""\t42';
      expect(parseTsv(text)).toEqual([['She said "hello"', "42"]]);
    });

    it("should handle quoted Windows line endings", () => {
      const text = '"Line 1\r\nLine 2"\tvalue';
      expect(parseTsv(text)).toEqual([["Line 1\r\nLine 2", "value"]]);
    });

    it("should handle mixed quoted and unquoted fields", () => {
      const text = 'plain\t"quoted\nfield"\t123';
      expect(parseTsv(text)).toEqual([["plain", "quoted\nfield", "123"]]);
    });
  });

  describe("unquoted text (plain split, no newline reconstruction)", () => {
    // Unquoted embedded newlines are ambiguous, so each physical line is its
    // own row. Multiline cells must be quoted (as real spreadsheets do).
    it("should treat each physical line as a separate row", () => {
      const text = "Alice\tKickflip\t95\nBob\tTrick with\nmultiple\nlines\t98";
      expect(parseTsv(text)).toEqual([
        ["Alice", "Kickflip", "95"],
        ["Bob", "Trick with"],
        ["multiple"],
        ["lines", "98"],
      ]);
    });

    it("should preserve JSON-like field values containing quotes", () => {
      // No `\t"` sequence, so this stays on the plain-split path.
      const text = 'Alice\t["React","Node.js"]\t95\nBob\t["Python"]\t88';
      expect(parseTsv(text)).toEqual([
        ["Alice", '["React","Node.js"]', "95"],
        ["Bob", '["Python"]', "88"],
      ]);
    });
  });

  describe("ragged rows (rows preserved, never dropped)", () => {
    it("should keep a short final row with fewer columns", () => {
      expect(parseTsv("Alice\tKickflip\t95\nBob")).toEqual([
        ["Alice", "Kickflip", "95"],
        ["Bob"],
      ]);
    });

    it("should keep a short final row with some but not all tabs", () => {
      expect(parseTsv("Alice\tKickflip\t95\nBob\tOllie")).toEqual([
        ["Alice", "Kickflip", "95"],
        ["Bob", "Ollie"],
      ]);
    });
  });

  describe("edge cases", () => {
    it("should return empty array for empty string", () => {
      expect(parseTsv("")).toEqual([]);
    });

    it("should handle single cell", () => {
      expect(parseTsv("hello")).toEqual([["hello"]]);
    });
  });
});
