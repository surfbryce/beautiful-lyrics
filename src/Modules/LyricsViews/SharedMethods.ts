// Packages
import { Signal } from "../../../../../Packages/Signal"

// Modules
import { Cache } from "../../Services/Cache"

// Types
import { RomanizedLanguage } from "../../Services/Player/LyricsUtilities"

// Shared Signals
const LanguageRomanizationChangedSignal = new Signal<(language: string, isRomanized: boolean) => void>()
export const LanguageRomanizationChanged = LanguageRomanizationChangedSignal.GetEvent()

// Shared Methods
export const CreateElement = <E = HTMLElement>(text: string) => {
	const element = document.createElement("div")
	element.innerHTML = text
	return element.firstElementChild as E
}

export const ToggleLanguageRomanization = (language: RomanizedLanguage, isRomanized: boolean) => {
	// Grab our lyric-view store from the cache
	const store = Cache.GetItem("LyricViews")

	// Determine whether or not we've even changed in state
	if (store.RomanizedLanguages[language] !== isRomanized) {
		// Update ourselves
		store.RomanizedLanguages[language] = isRomanized

		// Save our changes
		Cache.SaveItemChanges("LyricViews")

		// Now fire that we've changed
		LanguageRomanizationChangedSignal.Fire(language, isRomanized)
	}
}

export const IsLanguageRomanized = (language: RomanizedLanguage): boolean => {
	const store = Cache.GetItem("LyricViews")
	return (store.RomanizedLanguages[language] === true)
}