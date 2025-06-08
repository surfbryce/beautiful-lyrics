/// <reference lib="deno.ns" />
// Source/Utils/CustomLyricsParser.test.ts

import {
    assertEquals,
    assertNotEquals, // Using assertNotEquals instead of a manual check with assertNull
    assert, // For general assertions
    assertArrayIncludes,
} from "https://deno.land/std@0.210.0/testing/asserts.ts"; // Using a specific version for stability
import { parseCustomLyrics, CustomLyricLine, CustomTransformedLyrics } from "./CustomLyricsParser.ts";

Deno.test("parseCustomLyrics tests", async (t: Deno.TestContext) => {

    await t.step("should parse valid LRC format with multiple lines", () => {
        const lrcText = `
[00:01.00]Line 1
[00:02.50]Line 2
[00:03.750]Line 3
        `;
        const result = parseCustomLyrics(lrcText);
        assertNotEquals(result, null, "Result should not be null for valid LRC");
        if (!result) return;

        assertEquals(result.Type, "Line");
        assertEquals(result.Content.length, 3);
        assertEquals(result.NaturalAlignment, "None");

        assertEquals(result.Content[0].Text, "Line 1");
        assertEquals(result.Content[0].StartTime, 1000);
        assertEquals(result.Content[0].EndTime, 2500);
        assertEquals(result.Content[0].Type, "Vocal");

        assertEquals(result.Content[1].Text, "Line 2");
        assertEquals(result.Content[1].StartTime, 2500);
        assertEquals(result.Content[1].EndTime, 3750);

        assertEquals(result.Content[2].Text, "Line 3");
        assertEquals(result.Content[2].StartTime, 3750);
        assertEquals(result.Content[2].EndTime, 3750 + 5000); // Default duration for last line

        assertEquals(result.EndTime, result.Content[2].EndTime);
    });

    await t.step("should handle leading/trailing whitespace around timestamps and text", () => {
        const lrcText = "  [00:05.12]  Spaced Text  ";
        const result = parseCustomLyrics(lrcText);
        assertNotEquals(result, null, "Result should not be null");
        assertNotEquals(result, null, "Result should not be null");
        if (!result) return;
        assertEquals(result.Content.length, 1);
        assertEquals(result.Content[0].Text, "Spaced Text");
        assertEquals(result.Content[0].StartTime, 5120);
    });

    await t.step("should correctly calculate EndTime for the last line", () => {
        const lrcText = "[00:10.00]Last line here";
        const result = parseCustomLyrics(lrcText);
        assertNotEquals(result, null, "Result should not be null");
        if (!result) return;
        assertEquals(result.Content.length, 1);
        assertEquals(result.Content[0].EndTime, 10000 + 5000); // StartTime + DEFAULT_LINE_DURATION_MS
        assertEquals(result.EndTime, 10000 + 5000);
    });

    await t.step("should correctly calculate EndTime for consecutive lines", () => {
        const lrcText = `
[00:15.00]Line A
[00:16.00]Line B
        `;
        const result = parseCustomLyrics(lrcText);
        assertNotEquals(result, null, "Result should not be null");
        if (!result) return;
        assertEquals(result.Content.length, 2);
        assertEquals(result.Content[0].EndTime, 16000); // EndTime of Line A is StartTime of Line B
    });

    await t.step("should return null for empty input string", () => {
        assertEquals(parseCustomLyrics(""), null);
    });

    await t.step("should return null for input string with only whitespace", () => {
        assertEquals(parseCustomLyrics("   \n\t  "), null);
    });

    await t.step("should return null for null input", () => {
        assertEquals(parseCustomLyrics(null), null);
    });

    await t.step("should return null for undefined input", () => {
        assertEquals(parseCustomLyrics(undefined), null);
    });


    await t.step("should return null for input string with no valid LRC lines", () => {
        const lrcText = "Just some random text\nWithout any timestamps";
        assertEquals(parseCustomLyrics(lrcText), null);
    });

    await t.step("should ignore lines without timestamps", () => {
        const lrcText = `
[00:20.00]Valid Line 1
This line should be ignored
[00:22.00]Valid Line 2
        `;
        const result = parseCustomLyrics(lrcText);
        assertNotEquals(result, null, "Result should not be null");
        assertNotEquals(result, null, "Result should not be null");
        if (!result) return;
        assertEquals(result.Content.length, 2);
        assertEquals(result.Content[0].Text, "Valid Line 1");
        assertEquals(result.Content[1].Text, "Valid Line 2");
    });

    await t.step("should ignore lines with malformed timestamps", () => {
        const lrcText = `
[00:25.00]Good one
[xx:yy.zz]Bad one
[00:30:00.00]Another bad one (too many colons)
[00:32.00]Good two
        `;
        const result = parseCustomLyrics(lrcText);
        assertNotEquals(result, null, "Result should not be null");
        if (!result) return;
        assertEquals(result.Content.length, 2);
        assertEquals(result.Content[0].Text, "Good one");
        assertEquals(result.Content[1].Text, "Good two");
    });

    await t.step("should handle lines with only timestamp and no text (ignore them)", () => {
        const lrcText = `
[00:35.00]
[00:36.00]Text here
[00:37.00]
        `;
        const result = parseCustomLyrics(lrcText);
        assertNotEquals(result, null, "Result should not be null");
        if (!result) return;
        assertEquals(result.Content.length, 1);
        assertEquals(result.Content[0].Text, "Text here");
    });

    await t.step("should ensure Type is 'Line' and NaturalAlignment is 'None'", () => {
        const lrcText = "[00:40.00]Test line";
        const result = parseCustomLyrics(lrcText);
        assertNotEquals(result, null, "Result should not be null");
        if (!result) return;
        assertEquals(result.Type, "Line");
        assertEquals(result.NaturalAlignment, "None");
    });

    await t.step("should handle milliseconds of 2 or 3 digits", () => {
        const lrcText = `
[00:45.12]Two digits ms
[00:46.123]Three digits ms
        `;
        const result = parseCustomLyrics(lrcText);
        assertNotEquals(result, null, "Result should not be null");
        if (!result) return;
        assertEquals(result.Content.length, 2);
        assertEquals(result.Content[0].StartTime, 45120);
        assertEquals(result.Content[1].StartTime, 46123);
    });

    await t.step("should sort lines by StartTime if not initially sorted", () => {
        const lrcText = `
[00:55.00]Line C (55s)
[00:50.00]Line A (50s)
[00:52.50]Line B (52.5s)
        `;
        const result = parseCustomLyrics(lrcText);
        assertNotEquals(result, null, "Result should not be null");
        if (!result) return;
        assertEquals(result.Content.length, 3);
        assertEquals(result.Content[0].Text, "Line A (50s)");
        assertEquals(result.Content[0].StartTime, 50000);
        assertEquals(result.Content[1].Text, "Line B (52.5s)");
        assertEquals(result.Content[1].StartTime, 52500);
        assertEquals(result.Content[2].Text, "Line C (55s)");
        assertEquals(result.Content[2].StartTime, 55000);

        assertEquals(result.Content[0].EndTime, 52500);
        assertEquals(result.Content[1].EndTime, 55000);
    });

    await t.step("should handle EndTime correctly for very close timestamps", () => {
        const lrcText = `
[01:00.000]Close A
[01:00.001]Close B
[01:00.002]Close C
        `;
        const result = parseCustomLyrics(lrcText);
        assertNotEquals(result, null, "Result should not be null for close timestamps");
        if (!result) return;
        assertEquals(result.Content.length, 3);
        assertEquals(result.Content[0].StartTime, 60000);
        assertEquals(result.Content[0].EndTime, 60001);
        assertEquals(result.Content[1].StartTime, 60001);
        assertEquals(result.Content[1].EndTime, 60002);
        assertEquals(result.Content[2].StartTime, 60002);
        // Default end time for the last line
        assertEquals(result.Content[2].EndTime, 60002 + 5000);
    });

    await t.step("should handle EndTime for duplicate timestamps (treats them as subsequent lines)", () => {
        const lrcText = `
[01:05.000]Duplicate Time 1
[01:05.000]Duplicate Time 2
[01:06.000]Next Line
        `;
        const result = parseCustomLyrics(lrcText);
        assertNotEquals(result, null, "Result should not be null for duplicate timestamps");
        if (!result) return;

        // The parser sorts by StartTime. If timestamps are identical, original order is maintained.
        // EndTime calculation gives a small duration if next line has same/earlier StartTime.
        assertEquals(result.Content.length, 3);
        assertEquals(result.Content[0].StartTime, 65000);
        assertEquals(result.Content[0].Text, "Duplicate Time 1");
        assertEquals(result.Content[0].EndTime, 65000 + 5000/2); // Default duration / 2 because next line has same start time

        assertEquals(result.Content[1].StartTime, 65000);
        assertEquals(result.Content[1].Text, "Duplicate Time 2");
        assertEquals(result.Content[1].EndTime, 66000); // EndTime is StartTime of "Next Line"

        assertEquals(result.Content[2].StartTime, 66000);
        assertEquals(result.Content[2].Text, "Next Line");
    });
});

// To run these tests, use `deno test Source/Utils/CustomLyricsParser.test.ts`
// Ensure CustomLyricsParser.ts is in the same directory or adjust import path.
