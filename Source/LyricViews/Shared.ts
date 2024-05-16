// Imported Types
import type { RomanizedLanguage } from "jsr:@socali/spices/Spicetify/Services/Player"

// Web-Modules
import { Signal } from "jsr:@socali/modules/Signal"

// Spices
import { GetInstantStore } from "jsr:@socali/spices/Spicetify/Services/Cache"

// Our store
export const Store = GetInstantStore<
	{
		CardLyricsVisible: boolean;
		PlaybarDetailsHidden: boolean;
		RomanizedLanguages: {[key in RomanizedLanguage]: boolean};
	}
>(
	"BeautifulLyrics/LyricViews", 1,
	{
		CardLyricsVisible: false,
		PlaybarDetailsHidden: false,
		RomanizedLanguages: {
			Chinese: false,
			Japanese: false,
			Korean: false,
		}
	}
)

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
	// Determine whether or not we've even changed in state
	if (Store.Items.RomanizedLanguages[language] !== isRomanized) {
		// Update ourselves
		Store.Items.RomanizedLanguages[language] = isRomanized

		// Save our changes
		Store.SaveChanges()

		// Now fire that we've changed
		LanguageRomanizationChangedSignal.Fire(language, isRomanized)
	}
}

export const IsLanguageRomanized = (language: RomanizedLanguage): boolean => {
	return (Store.Items.RomanizedLanguages[language] === true)
}