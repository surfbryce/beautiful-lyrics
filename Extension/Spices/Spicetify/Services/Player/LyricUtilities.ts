// Shared Boundary Modules
import type {
	Lyrics as ProviderLyrics,
	TextMetadata
} from "@Universal/Types/Lyrics.ts"
export type { ProviderLyrics }

// Language Modules
import { franc } from "npm:franc@^6.2.0"
import Kuroshiro from "npm:@sglkc/kuroshiro@^1.0.1"
import * as KuromojiAnalyzer from "./KuromojiAnalyzer.ts"
import pinyin from "@Pinyin/Source/main.ts"
import Aromanize from "./Aromanize.ts"

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
	.then(() => true)
	.catch(error => {
		console.warn("Beautiful Lyrics: Japanese romanization unavailable", error)
		return false
	})

const KoreanTextTest = /[\uac00-\ud7af]|[\u1100-\u11ff]|[\u3130-\u318f]|[\ua960-\ua97f]|[\ud7b0-\ud7ff]/
const ChineseTextText = /([\u4E00-\u9FFF])/
const JapaneseTextText = /([ぁ-んァ-ン])/

// Helper Methods
const GetNaturalAlignment = (language: string): NaturalAlignment => {
	return (RightToLeftLanguages.includes(language) ? "Right" : "Left")
}

const GenerateChineseRomanization = <L extends TextMetadata>(
	lyricMetadata: L,
	primaryLanguage: string
): Promise<RomanizedLanguage | void> => {
	if ((primaryLanguage === "cmn") || ChineseTextText.test(lyricMetadata.Text)) {
		return (
			pinyin(
				lyricMetadata.Text,
				{
					segment: false,
					group: true
				}
			)
			.then(result => lyricMetadata.RomanizedText = result.join("-"))
			.then(() => "Chinese")
		)
	} else {
		return Promise.resolve()
	}
}

const GenerateJapaneseRomanization = <L extends TextMetadata>(
	lyricMetadata: L,
	primaryLanguage: string
): Promise<RomanizedLanguage | void> => {
	if ((primaryLanguage === "jpn") || JapaneseTextText.test(lyricMetadata.Text)) {
		return (
			RomajiPromise.then(
				ready => ready ? RomajiConverter.convert(
					lyricMetadata.Text,
					{
						to: "romaji",
						mode: "spaced"
					}
				) : undefined
			)
			.then(
				result => {
					if (result === undefined) return
					lyricMetadata.RomanizedText = result
					return "Japanese"
				}
			)
		)
	} else {
		return Promise.resolve()
	}
}

const GenerateKoreanRomanization = <L extends TextMetadata>(
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

const GenerateRomanization = <L extends TextMetadata, I extends BaseInformation>(
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
			for (const vocalGroup of lyrics.Content) {
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
		for(const vocalGroup of lyrics.Content) {
			if (vocalGroup.Type == "Vocal") {
				romanizationPromises.push(GenerateRomanization(vocalGroup, lyrics))
			}
		}
	} else if (lyrics.Type === "Syllable") {
		// Determine our language AND natural-alignment
		{
			// Put all our text together for processing
			const lines = []
			for (const vocalGroup of lyrics.Content) {
				if (vocalGroup.Type === "Vocal") {
					let text = vocalGroup.Lead.Syllables[0].Text
					for (let index = 1; index < vocalGroup.Lead.Syllables.length; index += 1) {
						const syllable = vocalGroup.Lead.Syllables[index]
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
		for(const vocalGroup of lyrics.Content) {
			if (vocalGroup.Type == "Vocal") {
				for(const syllable of vocalGroup.Lead.Syllables) {
					romanizationPromises.push(GenerateRomanization(syllable, lyrics))
				}

				if (vocalGroup.Background !== undefined) {
					for(const syllable of vocalGroup.Background[0].Syllables) {
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
				if (lyrics.Type === "Static") {
					return
				}

				// Go through and grab our start/end times
				const vocalTimes: {
					StartTime: number;
					EndTime: number;
				}[] = []
				if (lyrics.Type === "Line") {
					for(const vocal of lyrics.Content) {
						if (vocal.Type === "Vocal") {
							vocalTimes.push(
								{
									StartTime: vocal.StartTime,
									EndTime: vocal.EndTime
								}
							)
						}
					}
				} else if (lyrics.Type === "Syllable") {
					for(const vocal of lyrics.Content) {
						if (vocal.Type === "Vocal") {
							let startTime = vocal.Lead.StartTime, endTime = vocal.Lead.EndTime
							if (vocal.Background !== undefined) {
								for(const backgroundVocal of vocal.Background) {
									startTime = Math.min(startTime, backgroundVocal.StartTime)
									endTime = Math.max(endTime, backgroundVocal.EndTime)
								}
							}
							vocalTimes.push(
								{
									StartTime: startTime,
									EndTime: endTime
								}
							)
						}
					}
				}

				// First check if our first vocal-group needs an interlude before it
				let addedStartInterlude = false
				{
					const firstVocalGroup = vocalTimes[0]

					if (firstVocalGroup.StartTime >= MinimumInterludeDuration) {
						vocalTimes.unshift({StartTime: -1, EndTime: -1})
						lyrics.Content.unshift(
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
					let index = (vocalTimes.length - 1);
					index > (addedStartInterlude ? 1 : 0);
					index -= 1
				) {
					const endingVocalGroup = vocalTimes[index]
					const startingVocalGroup = vocalTimes[index - 1]

					if ((endingVocalGroup.StartTime - startingVocalGroup.EndTime) >= MinimumInterludeDuration) {
						vocalTimes.splice(index, 0, {StartTime: -1, EndTime: -1})
						lyrics.Content.splice(
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
		)

		// Finally, return our lyrics
		.then(() => lyrics)
	)
}
