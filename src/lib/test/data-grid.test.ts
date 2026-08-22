import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { parseTsv } from "@/lib/data-grid";

describe("parseTsv", () => {
  describe("basic parsing", () => {
    test("should parse simple single-row TSV", () => {
      assert.deepEqual(parseTsv("Alice\tKickflip\t95"), [["Alice", "Kickflip", "95"]]);
    });

    test("should parse multiple rows", () => {
      assert.deepEqual(parseTsv("Alice\tKickflip\t95\nBob\tOllie\t88"), [
        ["Alice", "Kickflip", "95"],
        ["Bob", "Ollie", "88"],
      ]);
    });

    test("should handle single-column paste", () => {
      assert.deepEqual(parseTsv("Alice\nBob\nCharlie"), [["Alice"], ["Bob"], ["Charlie"]]);
    });

    test("should skip empty rows", () => {
      assert.deepEqual(parseTsv("Alice\tKickflip\t95\n\nBob\tOllie\t88"), [
        ["Alice", "Kickflip", "95"],
        ["Bob", "Ollie", "88"],
      ]);
    });

    test("should handle Windows line endings", () => {
      assert.deepEqual(parseTsv("Alice\tKickflip\r\nBob\tOllie"), [
        ["Alice", "Kickflip"],
        ["Bob", "Ollie"],
      ]);
    });
  });

  describe("quoted fields (standard spreadsheet TSV)", () => {
    test("should handle quoted multiline content", () => {
      const text = 'Alice\tKickflip\t95\nBob\t"Trick with\nmultiple\nlines"\t98';
      assert.deepEqual(parseTsv(text), [
        ["Alice", "Kickflip", "95"],
        ["Bob", "Trick with\nmultiple\nlines", "98"],
      ]);
    });

    test("should handle escaped quotes", () => {
      const text = '"She said ""hello"""\t42';
      assert.deepEqual(parseTsv(text), [['She said "hello"', "42"]]);
    });

    test("should handle quoted Windows line endings", () => {
      const text = '"Line 1\r\nLine 2"\tvalue';
      assert.deepEqual(parseTsv(text), [["Line 1\r\nLine 2", "value"]]);
    });

    test("should handle mixed quoted and unquoted fields", () => {
      const text = 'plain\t"quoted\nfield"\t123';
      assert.deepEqual(parseTsv(text), [["plain", "quoted\nfield", "123"]]);
    });

    test("should detect a quoted field that leads a later row after a newline", () => {
      // No `\t"` anywhere — the quote follows a newline (Excel-style).
      const text = 'Alice\tKickflip\n"Line 1\nLine 2"\t98';
      assert.deepEqual(parseTsv(text), [
        ["Alice", "Kickflip"],
        ["Line 1\nLine 2", "98"],
      ]);
    });
  });

  describe("unquoted text (plain split, no newline reconstruction)", () => {
    // Unquoted embedded newlines are ambiguous, so each physical line is its
    // own row. Multiline cells must be quoted (as real spreadsheets do).
    test("should treat each physical line as a separate row", () => {
      const text = "Alice\tKickflip\t95\nBob\tTrick with\nmultiple\nlines\t98";
      assert.deepEqual(parseTsv(text), [
        ["Alice", "Kickflip", "95"],
        ["Bob", "Trick with"],
        ["multiple"],
        ["lines", "98"],
      ]);
    });

    test("should preserve JSON-like field values containing quotes", () => {
      // No `\t"` sequence, so this stays on the plain-split path.
      const text = 'Alice\t["React","Node.js"]\t95\nBob\t["Python"]\t88';
      assert.deepEqual(parseTsv(text), [
        ["Alice", '["React","Node.js"]', "95"],
        ["Bob", '["Python"]', "88"],
      ]);
    });
  });

  describe("ragged rows (rows preserved, never dropped)", () => {
    test("should keep a short final row with fewer columns", () => {
      assert.deepEqual(parseTsv("Alice\tKickflip\t95\nBob"), [
        ["Alice", "Kickflip", "95"],
        ["Bob"],
      ]);
    });

    test("should keep a short final row with some but not all tabs", () => {
      assert.deepEqual(parseTsv("Alice\tKickflip\t95\nBob\tOllie"), [
        ["Alice", "Kickflip", "95"],
        ["Bob", "Ollie"],
      ]);
    });
  });

  describe("edge cases", () => {
    test("should return empty array for empty string", () => {
      assert.deepEqual(parseTsv(""), []);
    });

    test("should handle single cell", () => {
      assert.deepEqual(parseTsv("hello"), [["hello"]]);
    });
  });
});
