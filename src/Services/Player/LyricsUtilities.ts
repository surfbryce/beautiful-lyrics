// Shared Boundary Modules
import type {
	Lyrics as ProviderLyrics,
	LineSyncedLyrics,
	LyricMetadata
} from "../../../../Shared/Lyrics"
export type { ProviderLyrics }

// Language Modules
import { franc } from "franc"
import Kuroshiro from "@sglkc/kuroshiro"
import KuromojiAnalyzer from "./KuromojiAnalyzer"
import pinyin from "pinyin"
import Aromanize from "./Aromanize"

// Type Modules
import Spotify from "./Spotify"

// Lyrics Types
type NaturalAlignment = ("Right" | "Left")
export type RomanizedLanguage = ("Chinese" | "Japanese" | "Korean")
type BaseInformation = {
	NaturalAlignment: NaturalAlignment;
	Language: string;
	RomanizedLanguage?: RomanizedLanguage;
}
export type TransformedLyrics = (
	BaseInformation
	& ProviderLyrics
)

// Behavior Constants
const MinimumInterludeDuration = 2
const EndInterludeEarlyBy = 0.25 // Seconds before our analytical end. This is used as a prep for the next vocal

// Language Recognition Constants
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

const KoreanTextTest = /[\uac00-\ud7af]|[\u1100-\u11ff]|[\u3130-\u318f]|[\ua960-\ua97f]|[\ud7b0-\ud7ff]/
const ChineseTextText = /([\u4E00-\u9FFF])/
const JapaneseTextText = /([ぁ-んァ-ン])/

// Helper Methods
const GetNaturalAlignment = (language: string): NaturalAlignment => {
	return (RightToLeftLanguages.includes(language) ? "Right" : "Left")
}

const GenerateChineseRomanization = <L extends LyricMetadata>(
	lyricMetadata: L,
	primaryLanguage: string
): Promise<RomanizedLanguage | void> => {
	if ((primaryLanguage === "cmn") || ChineseTextText.test(lyricMetadata.Text)) {
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

const GenerateJapaneseRomanization = <L extends LyricMetadata>(
	lyricMetadata: L,
	primaryLanguage: string
): Promise<RomanizedLanguage | void> => {
	if ((primaryLanguage === "jpn") || JapaneseTextText.test(lyricMetadata.Text)) {
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

const GenerateKoreanRomanization = <L extends LyricMetadata>(
	lyricMetadata: L,
	primaryLanguage: string
): Promise<RomanizedLanguage | void> => {
	if ((primaryLanguage === "kor") || KoreanTextTest.test(lyricMetadata.Text)) {
		lyricMetadata.RomanizedText = Aromanize(lyricMetadata.Text, "RevisedRomanizationTransliteration")
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
		GenerateJapaneseRomanization(lyricMetadata, rootInformation.Language)
		.then(
			(romanizedLanguage) => {
				if (romanizedLanguage === undefined) {
					return GenerateKoreanRomanization(lyricMetadata, rootInformation.Language)
				} else {
					return romanizedLanguage
				}
			}
		)
		.then(
			(romanizedLanguage) => {
				if (romanizedLanguage === undefined) {
					return GenerateChineseRomanization(lyricMetadata, rootInformation.Language)
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

// Parse Methods
export const ParseSpotifyLyrics = (content: Spotify.LyricLines): LineSyncedLyrics => {
	// We're just going to assume it's line-synced since that's all Spotify supports atm
	const result: LineSyncedLyrics = {
		StartTime: 0,
		EndTime: 0,

		Type: "Line",
		VocalGroups: []
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

	// Wait for all our stored-promises to finish
	return result
}

// Transformation Methods
export const TransformProviderLyrics = (providerLyrics: ProviderLyrics): Promise<TransformedLyrics> => {
	// Type-case for the future
	const lyrics = (providerLyrics as TransformedLyrics)

	// First, determine our language/natural-alignment and then romanize
	const romanizationPromises: Promise<void>[] = []
	if (lyrics.Type === "Static") {
		// Determine our language AND natural-alignment
		{
			// Put all our text together for processing
			let textToProcess = lyrics.Lines[0].Text
			for (let index = 1; index < lyrics.Lines.length; index += 1) {
				textToProcess += `\n${lyrics.Lines[index].Text}`
			}

			// Determine our language
			const language = franc(textToProcess)

			// Now update our natural alignment and language
			lyrics.Language = language
			lyrics.NaturalAlignment = GetNaturalAlignment(language)
		}

		// Go through and romanize everything
		for(const lyricMetadata of lyrics.Lines) {
			romanizationPromises.push(GenerateRomanization(lyricMetadata, lyrics))
		}
	} else if (lyrics.Type === "Line") {
		// Determine our language AND natural-alignment
		{
			// Put all our text together for processing
			const lines = []
			for (const vocalGroup of lyrics.VocalGroups) {
				if (vocalGroup.Type === "Vocal") {
					lines.push(vocalGroup.Text)
				}
			}
			const textToProcess = lines.join("\n") 

			// Determine our language
			const language = franc(textToProcess)

			// Now update our natural alignment and language
			lyrics.Language = language
			lyrics.NaturalAlignment = GetNaturalAlignment(language)
		}

		// Go through and romanize everything
		for(const vocalGroup of lyrics.VocalGroups) {
			if (vocalGroup.Type == "Vocal") {
				romanizationPromises.push(GenerateRomanization(vocalGroup, lyrics))
			}
		}
	} else if (lyrics.Type === "Syllable") {
		// Determine our language AND natural-alignment
		{
			// Put all our text together for processing
			const lines = []
			for (const vocalGroup of lyrics.VocalGroups) {
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
			lyrics.Language = language
			lyrics.NaturalAlignment = GetNaturalAlignment(language)
		}

		// Go through and romanize everything
		for(const vocalGroup of lyrics.VocalGroups) {
			if (vocalGroup.Type == "Vocal") {
				for(const syllable of vocalGroup.Lead) {
					romanizationPromises.push(GenerateRomanization(syllable, lyrics))
				}

				if (vocalGroup.Background !== undefined) {
					for(const syllable of vocalGroup.Background) {
						romanizationPromises.push(GenerateRomanization(syllable, lyrics))
					}
				}
			}
		}
	}

	return (
		// Wait for our romaniazation process to finish
		Promise.all(romanizationPromises)

		// Then add in interludes according to our preferences
		.then(
			() => {
				if (lyrics.Type !== "Static") {
					// First check if our first vocal-group needs an interlude before it
					let addedStartInterlude = false
					{
						const firstVocalGroup = lyrics.VocalGroups[0]

						if (firstVocalGroup.StartTime >= MinimumInterludeDuration) {
							lyrics.VocalGroups.unshift(
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
						let index = (lyrics.VocalGroups.length - 1);
						index > (addedStartInterlude ? 1 : 0);
						index -= 1
					) {
						const endingVocalGroup = lyrics.VocalGroups[index]
						const startingVocalGroup = lyrics.VocalGroups[index - 1]

						if ((endingVocalGroup.StartTime - startingVocalGroup.EndTime) >= MinimumInterludeDuration) {
							lyrics.VocalGroups.splice(
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
			}
		)

		// Finally, return our lyrics
		.then(() => lyrics)
	)
}