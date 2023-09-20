// Language Modules
import { franc, francAll } from "franc"
import Kuroshiro from "@sglkc/kuroshiro"
import KuromojiAnalyzer from "./KuromojiAnalyzer"
const Aromanize = require("aromanize")
import pinyin from "pinyin"

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
type RomanizedLanguage = ("Chinese" | "Japanese" | "Korean")
type BaseInformation = {
	NaturalAlignment: NaturalAlignment;
	Language: string;
	RomanizedLanguage?: RomanizedLanguage;
}

type TimeMetadata = {
	StartTime: number;
	EndTime: number;
}
type LyricMetadata = {
	Text: string;
	RomanizedText?: string;
}
type VocalMetadata = (
	TimeMetadata
	& LyricMetadata
)

type SyllableLyricMetadata = (
	VocalMetadata
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
		Lyrics: LyricMetadata[];
	}
)

type LineVocal = (
	VocalMetadata
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
	'arb', 'uig', // Do not include "zlm" (Malay), it is in Arabic script but it's not written right-to-left

	// Hebrew Languages
	'heb', 'ydd',

	// Mende Languages
	'men'
]

const RomajiConverter = new Kuroshiro()
const RomajiPromise = RomajiConverter.init(KuromojiAnalyzer)

const KoreanTextTest = /[\uac00-\ud7af]|[\u1100-\u11ff]|[\u3130-\u318f]|[\ua960-\ua97f]|[\ud7b0-\ud7ff]/g

// Helper Methods
const GetNaturalAlignment = (language: string): NaturalAlignment => {
	return (RightToLeftLanguages.includes(language) ? "Right" : "Left")
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

const GenerateChineseRomanization = <L extends LyricMetadata>(
	lyricMetadata: L,
	primaryLanguage: string
): Promise<RomanizedLanguage | void> => {
	if (primaryLanguage === "cmn") {
		lyricMetadata.RomanizedText = (
			pinyin(
				lyricMetadata.Text,
				{
					segment: false,
					group: true
				}
			).join("-")
		)
		return Promise.resolve("Chinese")
	} else {
		return Promise.resolve()
	}
}

const GenerateJapaneseRomanization = <L extends LyricMetadata>(lyricMetadata: L): Promise<RomanizedLanguage | void> => {
	if (RomajiConverter.Util.hasJapanese(lyricMetadata.Text)) {
		return (
			RomajiPromise.then(
				() => RomajiConverter.convert(
					lyricMetadata.Text,
					{
						to: "romaji",
						mode: "spaced"
					}
				)
			)
			.then(
				result => {
					lyricMetadata.RomanizedText = result
					return "Japanese"
				}
			)
		)
	} else {
		return Promise.resolve()
	}
}

const GenerateKoreanRomanization = <L extends LyricMetadata>(lyricMetadata: L): Promise<RomanizedLanguage | void> => {
	if (KoreanTextTest.test(lyricMetadata.Text)) {
		lyricMetadata.RomanizedText = Aromanize.hangulToLatin(lyricMetadata.Text, 'rr-translit')
		return Promise.resolve("Korean")
	} else {
		return Promise.resolve()
	}
}

const GenerateRomanization = <L extends LyricMetadata, I extends BaseInformation>(
	lyricMetadata: L,
	rootInformation: I
): Promise<void> => {
	return (
		GenerateChineseRomanization(lyricMetadata, rootInformation.Language)
		.then(
			(romanizedLanguage) => {
				if (romanizedLanguage === undefined) {
					return GenerateJapaneseRomanization(lyricMetadata)
				} else {
					return romanizedLanguage
				}
			}
		)
		.then(
			(romanizedLanguage) => {
				if (romanizedLanguage === undefined) {
					return GenerateKoreanRomanization(lyricMetadata)
				} else {
					return romanizedLanguage
				}
			}
		)
		.then(
			(romanizedLanguage) => {
				if (romanizedLanguage !== undefined) {
					rootInformation.RomanizedLanguage = romanizedLanguage
				}
			}
		)
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
const ParseAppleMusicLyrics = (text: string): Promise<ParsedLyrics> => {
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
			Language: "en",

			Type: "Static",
			Lyrics: []
		}

		for (const element of body.children) {
			if (element.tagName === "div") {
				for (const line of element.children) {
					if (line.tagName === "p") {
						// Create our lyric-metadata
						const lyricMetadata: LyricMetadata = {
							Text: line.textContent!
						}
						result.Lyrics.push(lyricMetadata)
					}
				}
			}
		}

		// Determine our language AND natural-alignment
		{
			// Put all our text together for processing
			let textToProcess = result.Lyrics[0].Text
			for (let index = 1; index < result.Lyrics.length; index += 1) {
				textToProcess += `\n${result.Lyrics[index].Text}`
			}

			// Determine our language
			const language = franc(textToProcess)

			// Now update our natural alignment and language
			result.Language = language
			result.NaturalAlignment = GetNaturalAlignment(language)
		}

		// Go through and romanize everything
		const romanizationPromises: Promise<void>[] = []
		for(const lyricMetadata of result.Lyrics) {
			romanizationPromises.push(GenerateRomanization(lyricMetadata, result))
		}

		// Wait for all our stored-promises to finish
		return Promise.all(romanizationPromises).then(() => result)
	} else if (syncType == "Line") {
		const result: LineSynced = {
			NaturalAlignment: "Left",
			Language: "en",

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
						const vocalGroup: LineVocal = {
							Type: "Vocal",

							OppositeAligned: oppositeAligned,

							Text: line.textContent!,

							StartTime: start,
							EndTime: end
						}
						result.VocalGroups.push(vocalGroup)
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

		// Determine our language AND natural-alignment
		{
			// Put all our text together for processing
			const lines = []
			for (const vocalGroup of result.VocalGroups) {
				if (vocalGroup.Type === "Vocal") {
					lines.push(vocalGroup.Text)
				}
			}
			const textToProcess = lines.join("\n") 

			// Determine our language
			const language = franc(textToProcess)

			// Now update our natural alignment and language
			result.Language = language
			result.NaturalAlignment = GetNaturalAlignment(language)
		}

		// Go through and romanize everything
		const romanizationPromises: Promise<void>[] = []
		for(const vocalGroup of result.VocalGroups) {
			if (vocalGroup.Type == "Vocal") {
				romanizationPromises.push(GenerateRomanization(vocalGroup, result))
			}
		}

		// Wait for all our stored-promises to finish
		return Promise.all(romanizationPromises).then(() => result)
	} else {
		const result: SyllableSynced = {
			NaturalAlignment: "Left",
			Language: "en",

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

											const backgroundLyric: SyllableLyricMetadata = {
												Text: backgroundSyllable.textContent!,

												IsPartOfWord: (
													(nextNode === undefined) ? false
													: (nextNode.nodeType !== Node.TEXT_NODE)
												),

												StartTime: start,
												EndTime: end
											}
											backgroundLyrics.push(backgroundLyric)
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

									const leadLyric: SyllableLyricMetadata = {
										Text: syllable.textContent!,

										IsPartOfWord: (
											(nextNode === undefined) ? false
											: (nextNode.nodeType !== Node.TEXT_NODE)
										),

										StartTime: start,
										EndTime: end
									}
									leadLyrics.push(leadLyric)
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

		// Determine our language AND natural-alignment
		{
			// Put all our text together for processing
			const lines = []
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
			const textToProcess = lines.join("\n") 

			// Determine our language
			const language = franc(textToProcess)

			// Now update our natural alignment and language
			result.Language = language
			result.NaturalAlignment = GetNaturalAlignment(language)
		}

		// Go through and romanize everything
		const romanizationPromises: Promise<void>[] = []
		for(const vocalGroup of result.VocalGroups) {
			if (vocalGroup.Type == "Vocal") {
				for(const syllable of vocalGroup.Lead) {
					romanizationPromises.push(GenerateRomanization(syllable, result))
				}

				if (vocalGroup.Background !== undefined) {
					for(const syllable of vocalGroup.Background) {
						romanizationPromises.push(GenerateRomanization(syllable, result))
					}
				}
			}
		}

		// Wait for all our stored-promises to finish
		return Promise.all(romanizationPromises).then(() => result)
	}
}

const ParseSpotifyLyrics = (content: Spotify.LyricLines): Promise<LineSynced> => {
	// We're just going to assume it's line-synced since that's all Spotify supports atm
	const result: LineSynced = {
		NaturalAlignment: "Left",
		Language: "en",

		StartTime: 0,
		EndTime: 0,

		Type: "Line",
		VocalGroups: []
	}
	const romanizationPromises: Promise<void>[] = []

	// Determine our language AND natural-alignment
	{
		// Put all our text together for processing
		let textToProcess = content[0].words
		for(let index = 2; index < content.length; index += 1) {
			textToProcess += `\n${content[index].words}`
		}

		// Determine our language
		const language = franc(textToProcess)

		// Now update our natural alignment and language
		result.Language = language
		result.NaturalAlignment = GetNaturalAlignment(language)
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
		const vocalGroup: LineVocal = {
			Type: "Vocal",

			OppositeAligned: false,

			Text: line.words,

			StartTime: start,
			EndTime: end
		}
		result.VocalGroups.push(vocalGroup)

		// Handle our romanization
		romanizationPromises.push(GenerateRomanization(vocalGroup, result))
	}

	// Now set our end/start times to our lyrics
	result.StartTime = result.VocalGroups[0].StartTime
	result.EndTime = result.VocalGroups[result.VocalGroups.length - 1].EndTime

	// Wait for all our stored-promises to finish
	return Promise.all(romanizationPromises).then(() => result)
}

const ParseLyrics = (content: LyricsResult): Promise<ParsedLyrics> => {
	// Grab our parsed-lyrics
	return (
		(
			(content.Source === "AppleMusic") ? ParseAppleMusicLyrics(content.Content)
			: ParseSpotifyLyrics(content.Content)
		)
		.then(
			parsedLyrics => {
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
		)
	)
}

// Exports
export { ParseLyrics }
export type {
	LyricsResult, SyllableLyricMetadata, VocalMetadata, Interlude, LyricMetadata,
	ParsedLyrics, RomanizedLanguage
}