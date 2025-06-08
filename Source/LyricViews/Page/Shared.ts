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
import type { CustomTransformedLyrics } from "../../../Utils/CustomLyricsParser.ts" // Added

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
	customTransformedLyrics?: CustomTransformedLyrics | null // Added parameter
) => {
	const UpdateLyricsRenderer = () => {
		// Wipe our previous renderer
		maid.Clean("LyricsRenderer")

		if (customTransformedLyrics) { // Prioritize custom lyrics
			if (noLyricsTemplate === undefined) { // Standard page views don't use noLyricsTemplate with renderer
				container.classList.remove("NoLyrics");
			}
			maid.Give(
				new LyricsRenderer(
					container,
					customTransformedLyrics as any, // Use type assertion
					false // isRomanized is false for custom lyrics
				),
				"LyricsRenderer"
			);
		} else { // Fallback to default SongLyrics logic
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
	}
	UpdateLyricsRenderer() // Initial call

	// Re-render if the song changes OR if default lyrics load (in case custom lyrics were not present)
	// The `loadCustomLyrics` in `LyricViews/mod.ts` is connected to SongChanged and will update `activeCustomTransformedLyrics`.
	// If a view is already open, it needs to re-render.
	// The `UpdateLyricsRenderer` function itself is returned, so the calling module can trigger it upon specific state changes if needed.
	// However, for simplicity with current structure, we rely on SongChanged to re-evaluate.
	// If `customTransformedLyrics` was passed initially, it won't change unless the whole view is re-created or an explicit update method is called.
	// The `Contained.ts` and `Fullscreen.ts` get `activeCustomTransformedLyrics` at creation.
	// If `activeCustomTransformedLyrics` changes while a view is open, that view won't update unless `UpdateLyricsRenderer` is called again.
	// `SongChanged` will re-evaluate `activeCustomTransformedLyrics` AND then will cause `UpdateLyricsRenderer` to run again here.
	maid.Give(SongChanged.Connect(UpdateLyricsRenderer))
	maid.Give(SongLyricsLoaded.Connect(UpdateLyricsRenderer)) // Still relevant for the fallback case

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