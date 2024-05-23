// Web-Modules
import { Maid } from "jsr:@socali/modules/Maid"

// Spices
import { Spotify } from "@socali/Spices/Session"
import {
	SongChanged,
	SongLyrics, SongLyricsLoaded, HaveSongLyricsLoaded
} from "@socali/Spices/Player"

// Modules
import LyricsRenderer from "../../Modules/LyricsRenderer.ts"

// Our Modules
import Icons from "./Icons.ts"
import {
	CreateElement,
	ToggleLanguageRomanization, IsLanguageRomanized, LanguageRomanizationChanged
} from "../Shared.ts"

// Shared Lyrics Behavior
export const CreateLyricsRenderer = (
	container: HTMLDivElement,
	maid: Maid,
	noLyricsTemplate?: string,
) => {
	const UpdateLyricsRenderer = () => {
		// Wipe our previous renderer
		maid.Clean("LyricsRenderer")

		// If we don't have lyrics we need to display that
		if (HaveSongLyricsLoaded === false) {
			if (noLyricsTemplate === undefined) {
				container.classList.remove("NoLyrics")
			}

			container.appendChild(maid.Give(CreateElement<HTMLElement>(Icons.LoadingLyrics), "LyricsRenderer"))
		} else if (SongLyrics === undefined) {
			if (noLyricsTemplate === undefined) {
				container.classList.add("NoLyrics")
			} else {
				container.appendChild(maid.Give(CreateElement<HTMLSpanElement>(noLyricsTemplate), "LyricsRenderer"))
			}
		} else { // Otherwise, render our lyrics
			if (noLyricsTemplate === undefined) {
				container.classList.remove("NoLyrics")
			}

			maid.Give(
				new LyricsRenderer(
					container, SongLyrics,
					(
						(SongLyrics.RomanizedLanguage !== undefined)
						&& IsLanguageRomanized(SongLyrics.RomanizedLanguage)
					)
				),
				"LyricsRenderer"
			)
		}
	}
	UpdateLyricsRenderer()
	maid.Give(SongChanged.Connect(UpdateLyricsRenderer))
	maid.Give(SongLyricsLoaded.Connect(UpdateLyricsRenderer))

	// For external use to combine with romanization toggling
	return UpdateLyricsRenderer
}

// Handle Romanization Toggling for Header button
export const SetupRomanizationButton = (
	romanizationToggle: HTMLButtonElement,
	updateLyricsRenderer: () => void,
	maid: Maid
) => {
	// Create our toggle method
	const ToggleRomanizationState = () => {
		if (SongLyrics?.RomanizedLanguage !== undefined) {
			ToggleLanguageRomanization(
				SongLyrics.RomanizedLanguage,
				!IsLanguageRomanized(SongLyrics.RomanizedLanguage)
			)
		}
	}

	// Setup behavior and the tooltip
	romanizationToggle.addEventListener("click", ToggleRomanizationState)
	const romanizeTooltip = Spotify.Tippy(
		romanizationToggle,
		{
			...Spotify.TippyProps,
			content: "__WAITING__"
		}
	)
	maid.Give(() => romanizeTooltip.destroy())

	// Handle updating our state
	const SetContent = (isRomanized: boolean): undefined => {
		romanizeTooltip.setContent(isRomanized ? "Disable Romanization" : "Enable Romanization")
		romanizationToggle.innerHTML = (isRomanized ? Icons.EnableRomanization : Icons.DisableRomanization)
	}
	const SetVisibility = (isVisible: boolean): undefined => {
		romanizationToggle.style.display = (isVisible ? "" : "none")
	}

	// Handle our romanization state changing and its initial state
	maid.Give(
		LanguageRomanizationChanged.Connect(
			(language, isRomanized) => {
				if (language === SongLyrics?.RomanizedLanguage) {
					SetContent(isRomanized)
					updateLyricsRenderer()
				}
			}
		)
	)

	// Handle updating our state
	{
		const Update = () => {
			if (SongLyrics?.RomanizedLanguage === undefined) {
				SetVisibility(false)
			} else {
				SetContent(IsLanguageRomanized(SongLyrics.RomanizedLanguage))
				SetVisibility(true)
			}
		}

		Update()
		maid.Give(SongChanged.Connect(Update))
		maid.Give(SongLyricsLoaded.Connect(Update))
	}
}