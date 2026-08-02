// Web-Modules
import { Maid } from "@Universal/Modules/Maid.ts"

// Spices
import { Spotify } from "@Spices/Spicetify/Services/Session.ts"
import {
	SongChanged,
	SongLyrics, SongLyricsLoaded, HaveSongLyricsLoaded
} from "@Spices/Spicetify/Services/Player/mod.ts"

// Modules
import LyricsRenderer from "../../Modules/LyricsRenderer.ts"

// Our Modules
import Icons from "./Icons.ts"
import {
	CreateElement,
	ToggleLanguageRomanization, IsLanguageRomanized, LanguageRomanizationChanged
} from "../Shared.ts"

const TranslationStorageKey = "BeautifulLyrics:ShowTranslations"
const TranslationIcon = `<svg class="BeautifulLyricsTranslationIcon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12.9 15.1 10.8 13l.1-.1a14.7 14.7 0 0 0 3.1-5.5h2.4V5.8h-5.6V4H9.2v1.8H3.6v1.6h8.8a12.7 12.7 0 0 1-2.7 4.5A12.4 12.4 0 0 1 7.8 9H6.2a14 14 0 0 0 2.4 4L4.4 17.1l1.1 1.1 4.2-4.1 2.6 2.6.6-1.6ZM17.4 10h-1.6l-3.6 10h1.7l.9-2.5h3.7l.9 2.5H21l-3.6-10Zm-2.1 6 1.3-3.8 1.3 3.8h-2.6Z"/></svg>`

const IsTranslationEnabled = () => localStorage.getItem(TranslationStorageKey) === "true"
const GetTargetLanguage = () => {
	const locale = Spotify.Locale?.getLocale?.() || navigator.language || "es"
	return locale.toLowerCase().split(/[-_]/)[0]
}

const TranslateCurrentLyrics = async (root: HTMLElement) => {
	if (!IsTranslationEnabled()) return
	const targetLanguage = GetTargetLanguage()
	root.querySelectorAll<HTMLElement>(".LyricsTranslation").forEach(translation => {
		if (translation.dataset.translationTarget !== targetLanguage) translation.remove()
	})
	const groups = [...root.querySelectorAll<HTMLElement>(".Lyrics .VocalsGroup")]
		.filter(group => !group.querySelector(".LyricsTranslation") && group.dataset.translationLoading !== "true")

	for (let start = 0; start < groups.length; start += 8) {
		await Promise.all(groups.slice(start, start + 8).map(async group => {
			if (group.querySelector(".LyricsTranslation") || group.dataset.translationLoading === "true") return
			group.dataset.translationLoading = "true"
			const sourceClone = group.cloneNode(true) as HTMLElement
			sourceClone.querySelectorAll(".LyricsTranslation").forEach(node => node.remove())
			const source = (sourceClone.textContent ?? "").trim()
			if (!source) {
				delete group.dataset.translationLoading
				return
			}
			const url = new URL("https://translate.googleapis.com/translate_a/single")
			url.searchParams.set("client", "gtx")
			url.searchParams.set("sl", "auto")
			url.searchParams.set("tl", targetLanguage)
			url.searchParams.set("dt", "t")
			url.searchParams.set("q", source)
			try {
				const response = await fetch(url)
				if (!response.ok || !group.isConnected || group.querySelector(".LyricsTranslation")) return
				const body = await response.json()
				const detectedLanguage = String(body?.[2] ?? "").toLowerCase().split(/[-_]/)[0]
				if (detectedLanguage === targetLanguage) return
				const text = (body?.[0] ?? []).map((part: unknown[]) => part?.[0] ?? "").join("")
				if (!text) return
				const translation = document.createElement("span")
				translation.classList.add("LyricsTranslation")
				translation.dataset.translationTarget = targetLanguage
				translation.textContent = text
				group.appendChild(translation)
			} catch (error) {
				console.warn("Beautiful Lyrics: translation failed", error)
			} finally {
				delete group.dataset.translationLoading
			}
		}))
	}
}

export const SetupTranslationButton = (
	button: HTMLButtonElement,
	page: HTMLElement,
	maid: Maid
) => {
	button.innerHTML = TranslationIcon
	const tooltip = Spotify.Tippy(button, { ...Spotify.TippyProps, content: "Translate lyrics" })
	maid.Give(() => tooltip.destroy())

	const ApplyState = () => {
		const enabled = IsTranslationEnabled()
		document.body.classList.toggle("BeautifulLyricsTranslationsEnabled", enabled)
		button.classList.toggle("Active", enabled)
		button.setAttribute("aria-pressed", enabled ? "true" : "false")
		tooltip.setContent(enabled ? "Hide translations" : "Translate lyrics")
		if (enabled) void TranslateCurrentLyrics(page)
	}

	button.addEventListener("click", () => {
		localStorage.setItem(TranslationStorageKey, IsTranslationEnabled() ? "false" : "true")
		ApplyState()
	})

	let updateTimer: ReturnType<typeof setTimeout> | undefined
	const observer = new MutationObserver(records => {
		if (!IsTranslationEnabled()) return
		const hasExternalChange = records.some(record =>
			[...record.addedNodes].some(node =>
				!(node instanceof HTMLElement && node.classList.contains("LyricsTranslation"))
			)
		)
		if (!hasExternalChange) return
		clearTimeout(updateTimer)
		updateTimer = setTimeout(() => void TranslateCurrentLyrics(page), 150)
	})
	observer.observe(page, { childList: true, subtree: true })
	maid.Give(() => {
		observer.disconnect()
		clearTimeout(updateTimer)
	})
	ApplyState()
}

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
