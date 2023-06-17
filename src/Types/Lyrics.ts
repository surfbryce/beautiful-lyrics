type LyricTimeframe = {
	Start: number;
	End: number;
}

type Lyric = (
	{
		Type: "Unsynced";
		Text: string;
	}
	| (
		{
			Type: "Line";
			Text: string;
		}
		& LyricTimeframe
	)
	| (
		{
			Type: "Syllable";
			Text: string;
		}
		& LyricTimeframe
	)
)

type LyricGroup = {
	Type: ("Lead" | "Background");
	Lyrics: Lyric[];
}