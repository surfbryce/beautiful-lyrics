// Modules
import { franc } from "franc"

// Type Modules
import Spotify from "./Spotify"

// Types
type LyricsResult = (
	{
		Source: "AppleMusic";
		Content: string;
	}
	| {
		Source: "Spotify";
		Content: Spotify.LyricLines;
	}
)

type NaturalAlignment = ("Right" | "Left")
type BaseInformation = {
	NaturalAlignment: NaturalAlignment;
}

type TimeMetadata = {
	StartTime: number;
	EndTime: number;
}
type LyricMetadata = (
	TimeMetadata
	& {
		Text: string;
	}
)

type SyllableLyricMetadata = (
	LyricMetadata
	& {
		IsPartOfWord: boolean;
	}
)

type Interlude = (
	TimeMetadata
	& {
		Type: "Interlude";
	}
)

type StaticSynced = (
	BaseInformation
	& {
		Type: "Static";
		Lyrics: string[];
	}
)

type LineVocal = (
	LyricMetadata
	& {
		Type: "Vocal";

		OppositeAligned: boolean;
	}
)
type LineSynced = (
	BaseInformation
	& TimeMetadata
	& {
		Type: "Line";
		VocalGroups: (LineVocal | Interlude)[];
	}
)

type SyllableVocal = (
	TimeMetadata
	& {
		Type: "Vocal";

		OppositeAligned: boolean;
	
		Lead: SyllableLyricMetadata[];
		Background?: SyllableLyricMetadata[];
	}
)
type SyllableSynced = (
	BaseInformation
	& TimeMetadata
	& {
		Type: "Syllable";
		VocalGroups: (SyllableVocal | Interlude)[];
	}
)

type ParsedLyrics = (StaticSynced | LineSynced | SyllableSynced)

// Behavior Constants
const MinimumInterludeDuration = 2
const EndInterludeEarlyBy = 0.25 // Seconds before our analytical end. This is used as a prep for the next vocal

// Recognition Constants
const SyllableSyncCheck = /<span\s+begin="[\d:.]+"/g
const LineSyncCheck = /<p\s+begin="[\d:.]+"/g

const FeatureAgentAttribute = "ttm:agent"
const FeatureRoleAttribute = "ttm:role"
const AgentVersion = /^v(\d+)$/

const TimeFormat = /(?:(\d+):)?(\d+)(?:\.(\d+))?$/

const RightToLeftLanguages = [
	// Persian
	'pes', 'urd',
	
	// Arabic Languages
	'arb', 'uig', // Do not include "zlm" (Malay) since the Arabic variant will be registered as Arabic

	// Hebrew Languages
	'heb', 'ydd',

	// Mende Languages
	'men'
]

// Helper Methods
const GetNaturalAlignment = (text: string): NaturalAlignment => {
	return (RightToLeftLanguages.includes(franc(text)) ? "Right" : "Left")
}

const GetFeatureAgentVersion = (element: Element) => {
	const featureAgent = element.getAttribute(FeatureAgentAttribute)
	const featureAgentVersion = (
		(featureAgent === null) ? undefined
			: AgentVersion.exec(featureAgent)?.[1]
	)

	return (
		(featureAgentVersion === undefined) ? undefined
			: parseInt(featureAgentVersion, 10)
	)
}

const GetTimeInSeconds = (time: string) => {
	// Grab our matches
	const matches = TimeFormat.exec(time)
	if (matches === null) {
		return -1
	}

	// Grab all our matches
	const minutes = (matches[1] ? parseInt(matches[1], 10) : 0)
	const seconds = parseInt(matches[2], 10)
	const milliseconds = (matches[3] ? parseInt(matches[3], 10) : 0)

	return ((minutes * 60) + seconds + (milliseconds / 1000))
}

const IsNodeASpan = (node: Node): node is HTMLSpanElement => {
	return (node.nodeName === "span")
}

// Parse Methods
const parser = new DOMParser()
const ParseAppleMusicLyrics = (text: string) => {
	// Our text is XML so we'll just parse it first
	const parsedDocument = parser.parseFromString(text, "text/xml")
	const body = parsedDocument.querySelector("body")!

	// Determine if we're syllable synced, line synced, or statically synced
	const syncType = (
		SyllableSyncCheck.test(text) ? "Syllable"
			: LineSyncCheck.test(text) ? "Line"
				: "Static"
	)

	// For static-sync we just have to extract each line of text
	if (syncType === "Static") {
		const result: StaticSynced = {
			NaturalAlignment: "Left",

			Type: "Static",
			Lyrics: []
		}

		for (const element of body.children) {
			if (element.tagName === "div") {
				for (const line of element.children) {
					if (line.tagName === "p") {
						result.Lyrics.push(line.textContent!)
					}
				}
			}
		}

		// Determine our natural-alignment
		{
			let textToProcess = result.Lyrics[0]
			for (let index = 1; index < result.Lyrics.length; index += 1) {
				textToProcess += `\n${result.Lyrics[index]}`
			}

			result.NaturalAlignment = GetNaturalAlignment(textToProcess)
		}

		return result
	} else if (syncType == "Line") {
		const result: LineSynced = {
			NaturalAlignment: "Left",

			StartTime: 0,
			EndTime: 0,

			Type: "Line",
			VocalGroups: []
		}

		for (const element of body.children) {
			if (element.tagName === "div") {
				for (const line of element.children) {
					if (line.tagName === "p") {
						// Determine whether or not we are opposite-aligned
						const featureAgentVersion = GetFeatureAgentVersion(line)
						const oppositeAligned = (
							(featureAgentVersion === undefined) ? false
								: (featureAgentVersion === 2)
						)

						// Grab our times
						const start = GetTimeInSeconds(line.getAttribute("begin")!)
						const end = GetTimeInSeconds(line.getAttribute("end")!)

						// Store our lyrics now
						result.VocalGroups.push(
							{
								Type: "Vocal",

								OppositeAligned: oppositeAligned,

								Text: line.textContent!,

								StartTime: start,
								EndTime: end
							}
						)
					}
				}
			}
		}

		// Now set our StartTime/EndTime
		{
			const firstLine = result.VocalGroups[0]
			const lastLine = result.VocalGroups[result.VocalGroups.length - 1]

			result.StartTime = firstLine.StartTime
			result.EndTime = lastLine.EndTime
		}

		// Determine our natural-alignment
		{
			let lines = []
			for (const vocalGroup of result.VocalGroups) {
				if (vocalGroup.Type === "Vocal") {
					lines.push(vocalGroup.Text)
				}
			}

			result.NaturalAlignment = GetNaturalAlignment(lines.join("\n"))
		}

		return result
	} else {
		const result: SyllableSynced = {
			NaturalAlignment: "Left",

			StartTime: 0,
			EndTime: 0,

			Type: "Syllable",
			VocalGroups: []
		}

		for (const element of body.children) {
			if (element.tagName === "div") {
				for (const line of element.children) {
					if (line.tagName === "p") {
						// Determine whether or not we are opposite-aligned
						const featureAgentVersion = GetFeatureAgentVersion(line)
						const oppositeAligned = (
							(featureAgentVersion === undefined) ? false
								: (featureAgentVersion === 2)
						)

						// Store our lyrics now
						const leadLyrics: SyllableLyricMetadata[] = []
						const backgroundLyrics: SyllableLyricMetadata[] = []
						const lineNodes = line.childNodes
						for (const [index, syllable] of lineNodes.entries()) {
							if (IsNodeASpan(syllable)) {
								// We have to first determine if we're a background lyric - since we have inner spans if we are
								const isBackground = (syllable.getAttribute(FeatureRoleAttribute) === "x-bg")

								if (isBackground) {
									// Gather our background-lyrics
									const backgroundNodes = syllable.childNodes
									for (const [backgroundIndex, backgroundSyllable] of backgroundNodes.entries()) {
										if (IsNodeASpan(backgroundSyllable)) {
											const start = GetTimeInSeconds(backgroundSyllable.getAttribute("begin")!)
											const end = GetTimeInSeconds(backgroundSyllable.getAttribute("end")!)

											const nextNode = backgroundNodes[backgroundIndex + 1]

											backgroundLyrics.push(
												{
													Text: backgroundSyllable.textContent!,

													IsPartOfWord: (
														(nextNode === undefined) ? false
														: (nextNode.nodeType !== Node.TEXT_NODE)
													),

													StartTime: start,
													EndTime: end
												}
											)
										}
									}

									// Now determine whether or not we are surrounded by parentheses
									{
										const firstBackgroundSyllable = backgroundLyrics[0]
										const lastBackgroundSyllable = backgroundLyrics[backgroundLyrics.length - 1]

										if (
											firstBackgroundSyllable.Text.startsWith("(")
											&& lastBackgroundSyllable.Text.endsWith(")")
										) {
											// We are surrounded by parentheses, so we'll remove them
											firstBackgroundSyllable.Text = firstBackgroundSyllable.Text.slice(1)
											lastBackgroundSyllable.Text = lastBackgroundSyllable.Text.slice(0, -1)
										}
									}
								} else {
									const start = GetTimeInSeconds(syllable.getAttribute("begin")!)
									const end = GetTimeInSeconds(syllable.getAttribute("end")!)

									const nextNode = lineNodes[index + 1]

									leadLyrics.push(
										{
											Text: syllable.textContent!,

											IsPartOfWord: (
												(nextNode === undefined) ? false
												: (nextNode.nodeType !== Node.TEXT_NODE)
											),

											StartTime: start,
											EndTime: end
										}
									)
								}
							}
						}

						// Now store our line
						result.VocalGroups.push(
							{
								Type: "Vocal",

								OppositeAligned: oppositeAligned,

								StartTime: (
									(backgroundLyrics.length === 0) ? leadLyrics[0].StartTime
									: Math.min(leadLyrics[0].StartTime, backgroundLyrics[0].StartTime)
								),
								EndTime: (
									(backgroundLyrics.length === 0) ? leadLyrics[leadLyrics.length - 1].EndTime
									: Math.max(
										leadLyrics[leadLyrics.length - 1].EndTime,
										backgroundLyrics[backgroundLyrics.length - 1].EndTime
									)
								),

								Lead: leadLyrics,
								Background: (
									(backgroundLyrics.length === 0) ? undefined
									: backgroundLyrics
								)
							}
						)
					}
				}
			}
		}

		// Now set our StartTime/EndTime
		{
			const firstLine = result.VocalGroups[0]
			const lastLine = result.VocalGroups[result.VocalGroups.length - 1]

			result.StartTime = firstLine.StartTime
			result.EndTime = lastLine.EndTime
		}

		// Determine our natural-alignment
		{
			let lines = []
			for (const vocalGroup of result.VocalGroups) {
				if (vocalGroup.Type === "Vocal") {
					let text = vocalGroup.Lead[0].Text
					for (let index = 1; index < vocalGroup.Lead.length; index += 1) {
						const syllable = vocalGroup.Lead[index]
						text += `${syllable.IsPartOfWord ? "" : " "}${syllable.Text}`
					}

					lines.push(text)
				}
			}

			result.NaturalAlignment = GetNaturalAlignment(lines.join("\n"))
		}

		return result
	}
}

const ParseSpotifyLyrics = (content: Spotify.LyricLines) => {
	// We're just going to assume it's line-synced since that's all Spotify supports atm
	const result: LineSynced = {
		NaturalAlignment: "Left",

		StartTime: 0,
		EndTime: 0,

		Type: "Line",
		VocalGroups: []
	}

	// Determine our alignment
	{
		let textToProcess = content[0].words
		for(let index = 2; index < content.length; index += 1) {
			textToProcess += `\n${content[index].words}`
		}

		if (GetNaturalAlignment(textToProcess) === "Right") {
			result.NaturalAlignment = "Right"
		}
	}

	// Go through every entry and start populating
	for (const [index, line] of content.entries()) {
		// Ignore this line if we're an "interlude"
		if (line.words.includes("♪")) {
			continue
		} else if ((line.words.length === 0) && (line.endTimeMs === "0")) { // Or if we're a filler-vocal
			continue
		}

		// Grab our timestamps
		const start = (parseInt(line.startTimeMs, 10) / 1000)
		const end = (
			(line.endTimeMs === "0")
			? (parseInt(content[index + 1].startTimeMs, 10) / 1000)
			: (parseInt(line.endTimeMs, 10) / 1000)
		)

		// Now store our lyrics
		result.VocalGroups.push(
			{
				Type: "Vocal",

				OppositeAligned: false,

				Text: line.words,

				StartTime: start,
				EndTime: end
			}
		)
	}

	// Now set our end/start times to our lyrics
	result.StartTime = result.VocalGroups[0].StartTime
	result.EndTime = result.VocalGroups[result.VocalGroups.length - 1].EndTime

	return result
}

const ParseLyrics = (content: LyricsResult): ParsedLyrics => {
	// Grab our parsed-lyrics
	const parsedLyrics = (
		(content.Source === "AppleMusic") ? ParseAppleMusicLyrics(content.Content)
		: ParseSpotifyLyrics(content.Content)
	)

	// Now add in interludes anywhere we can
	if (parsedLyrics.Type !== "Static") {
		// First check if our first vocal-group needs an interlude before it
		let addedStartInterlude = false
		{
			const firstVocalGroup = parsedLyrics.VocalGroups[0]

			if (firstVocalGroup.StartTime >= MinimumInterludeDuration) {
				parsedLyrics.VocalGroups.unshift(
					{
						Type: "Interlude",

						StartTime: 0,
						EndTime: (firstVocalGroup.StartTime - EndInterludeEarlyBy)
					}
				)

				addedStartInterlude = true
			}
		}

		// Now go through our vocals and determine if we need to add an interlude anywhere
		for (
			let index = (parsedLyrics.VocalGroups.length - 1);
			index > (addedStartInterlude ? 1 : 0);
			index -= 1
		) {
			const endingVocalGroup = parsedLyrics.VocalGroups[index]
			const startingVocalGroup = parsedLyrics.VocalGroups[index - 1]

			if ((endingVocalGroup.StartTime - startingVocalGroup.EndTime) >= MinimumInterludeDuration) {
				parsedLyrics.VocalGroups.splice(
					index,
					0,
					{
						Type: "Interlude",

						StartTime: startingVocalGroup.EndTime,
						EndTime: (endingVocalGroup.StartTime - EndInterludeEarlyBy)
					}
				)
			}
		}
	}

	// Now return our parsed-lyrics
	return parsedLyrics
}

// Exports
export { ParseLyrics }
export type { LyricsResult, SyllableLyricMetadata, LyricMetadata, Interlude, ParsedLyrics }