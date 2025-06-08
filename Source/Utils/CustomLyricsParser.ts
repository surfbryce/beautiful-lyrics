// Source/Utils/CustomLyricsParser.ts

export interface CustomLyricLine {
    StartTime: number;
    EndTime: number;
    Text: string;
    Type: "Vocal"; // Type is fixed to "Vocal" for custom lyrics
    OppositeAligned?: boolean;
}

export interface CustomTransformedLyrics {
    Type: "Line";
    Content: CustomLyricLine[];
    EndTime: number;
    NaturalAlignment: "Start" | "Center" | "End" | "None";
}

const DEFAULT_LINE_DURATION_MS = 5000; // 5 seconds for the last line if no next line

export const parseCustomLyrics = (lyricsText: string | null | undefined): CustomTransformedLyrics | null => {
    if (!lyricsText || typeof lyricsText !== 'string' || lyricsText.trim() === "") {
        return null;
    }

    const lines = lyricsText.split(/\r?\n/);
    const parsedLines: Array<{ StartTime: number; Text: string }> = [];
    const timestampRegex = /^\s*\[(\d{2}):(\d{2})\.(\d{2,3})\]\s*(.*)$/;

    for (const line of lines) {
        const match = line.match(timestampRegex);
        if (match) {
            const minutes = parseInt(match[1], 10);
            const seconds = parseInt(match[2], 10);
            const milliseconds = parseInt(match[3].padEnd(3, '0'), 10); // Pad to 3 digits if 2 (e.g. .12 -> .120)
            const text = match[4].trim();

            if (text) { // Only add lines with actual text content
                const startTime = (minutes * 60 + seconds) * 1000 + milliseconds;
                parsedLines.push({ StartTime: startTime, Text: text });
            }
        }
    }

    if (parsedLines.length === 0) {
        return null;
    }

    // Sort lines by StartTime
    parsedLines.sort((a, b) => a.StartTime - b.StartTime);

    const content: CustomLyricLine[] = [];
    let overallEndTime = 0;

    for (let i = 0; i < parsedLines.length; i++) {
        const currentParsedLine = parsedLines[i];
        let endTime: number;

        if (i < parsedLines.length - 1) {
            endTime = parsedLines[i + 1].StartTime;
             // Ensure EndTime is not before StartTime, can happen with very close timestamps
            if (endTime <= currentParsedLine.StartTime) {
                endTime = currentParsedLine.StartTime + DEFAULT_LINE_DURATION_MS / 2; // Give it a short duration
            }
        } else {
            // Last line
            endTime = currentParsedLine.StartTime + DEFAULT_LINE_DURATION_MS;
        }

        content.push({
            StartTime: currentParsedLine.StartTime,
            EndTime: endTime,
            Text: currentParsedLine.Text,
            Type: "Vocal",
            // OppositeAligned can be set later if needed by other logic
        });

        if (endTime > overallEndTime) {
            overallEndTime = endTime;
        }
    }

    // Ensure overallEndTime is at least the EndTime of the last line.
    if (content.length > 0) {
        const lastLineEndTime = content[content.length-1].EndTime;
        if (lastLineEndTime > overallEndTime) {
            overallEndTime = lastLineEndTime;
        }
    }


    return {
        Type: "Line",
        Content: content,
        EndTime: overallEndTime,
        NaturalAlignment: "None", // Default alignment
    };
};
