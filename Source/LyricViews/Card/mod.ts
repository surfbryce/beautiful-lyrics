// Styles
import "./style.scss"

// Web-Modules
import { Maid, Giveable } from "jsr:@socali/modules/Maid"

// Spices
import {
	Spotify,
	SpotifyHistory
} from "@socali/Spices/Session"
import { SongLyrics } from "@socali/Spices/Player"

// Our Modules
import LyricsRenderer from "../../Modules/LyricsRenderer.ts"
import {
	CreateElement,
	ToggleLanguageRomanization, IsLanguageRomanized, LanguageRomanizationChanged,
	Store
} from "../Shared.ts"

// Templates
const CardContainer = `
	<div id="BeautifulLyrics-CardView" style="">
		<div class="Header" data-encore-id="type">
			<div class="Title">Lyrics</div>
		</div>
	</div>
`
const ShowLyricsButton = `<button class="ShowLyrics">Show lyrics</button>`
const RomanizationIcons = {
	Disabled: `
		<svg role="img" height="17" width="17" aria-hidden="true" viewBox="0 0 125.45 131.07" data-encore-id="icon" class="Svg-sc-ytk21e-0 Svg-img-16-icon">
			<path class="cls-1" d="m53.38,130.41c-12.54-2.87-20.86-14.36-19.98-27.42.59-7.62,5.8-15.12,13.07-18.69,4.28-2.11,11.02-3.4,17.75-3.46h4.8v-12.71c.06-16,.64-17.99,5.98-20.74,4.86-2.46,10.96-.47,13.3,4.34,1.17,2.34,1.23,3.52,1.23,17.23v14.65l2.81,1.05c13.59,5.1,30.59,17.87,32.34,24.38,1.17,4.34-.88,8.79-4.92,10.72-4.1,1.93-5.63,1.41-13.89-5.27-4.69-3.69-12.83-9.02-15.29-9.96-.88-.29-1.05,0-1.05,1.64,0,2.93-1.58,8.5-3.34,11.78-1.93,3.46-6.74,8.03-10.43,9.79-6.21,2.99-15.88,4.16-22.38,2.7v-.03Zm11.84-20.51c1.05-.47,2.4-1.46,2.87-2.29,1-1.52,1.41-5.39.7-6.15-.64-.59-12.66-.18-13.95.53-1.23.64-1.46,4.92-.29,6.45,1.82,2.34,6.86,3.05,10.66,1.46h0Z"></path>
			<path class="cls-1" d="m6.33,103.4c-4.39-1.99-6.91-6.04-6.21-9.9.23-1.11,2.23-4.8,4.51-8.32,7.21-11.19,17.64-31.23,18.98-36.56l.35-1.46h-8.67c-7.62,0-8.91-.18-10.66-1.17-2.99-1.76-4.34-3.93-4.34-6.91,0-3.52,1.64-6.04,5.1-7.73,2.81-1.41,3.4-1.46,13.89-1.46h10.96l.64-3.93c.35-2.23,1.05-6.86,1.58-10.43,1-7.21,1.93-9.79,4.22-12.19,2.34-2.46,4.39-3.34,7.85-3.34,5.74,0,9.26,3.34,9.26,8.79,0,1.46-.64,5.8-1.46,9.67-.76,3.87-1.46,7.27-1.46,7.56,0,.94,2.99-.29,7.97-3.28,6.04-3.57,9.32-4.22,12.42-2.23,4.51,2.81,4.92,10.84.82,16.35-2.7,3.63-10.9,6.33-20.92,6.91l-6.45.35-1.99,5.33c-3.63,9.67-9.43,22.73-15.35,34.34-6.74,13.3-9.43,17.64-11.72,18.98-2.46,1.46-6.86,1.76-9.32.64h0Z"></path>
			<path class="cls-1" d="m109.17,57.17c-11.19-4.69-29.82-13.3-30.88-14.24-4.69-4.22-3.46-12.42,2.17-15.12,4.28-1.99,6.56-1.29,24.9,7.73,15.12,7.38,16.88,8.44,18.34,10.61,1.99,2.87,2.34,6.8.76,9.2-1.29,1.99-5.21,3.81-8.26,3.81-1.35,0-4.34-.88-7.03-1.99Z"></path>
		</svg>
	`.trim(),
	Enabled: `
		<svg role="img" height="20" width="20" aria-hidden="true" viewBox="0 0 750 900" data-encore-id="icon" class="Svg-sc-ytk21e-0 Svg-img-16-icon">
			<path class="cls-1" d="m529.42,632.32H214.71l-81.89,163.5H13.31L377.06,80.35l350.9,715.47h-121.41l-77.13-163.5Zm-45.23-95.48l-109.03-228.9-114.27,228.9h223.3Z"></path>
		</svg>
	`.trim()
}
const ExpandedControls = `
	<div class="Controls">
		<button id="Romanize" class="ViewControl"></button>
		<button id="Page" class="ViewControl">
			<svg role="img" height="16" width="16" aria-hidden="true" viewBox="0 0 16 16" data-encore-id="icon" class="Svg-sc-ytk21e-0 Svg-img-16-icon"><path d="M14.55 1c.8 0 1.45.65 1.45 1.45V7h-1.5V2.5h-13v11h5.507V15H1.45C.65 15 0 14.35 0 13.55V2.45C0 1.65.65 1 1.45 1h13.1z"></path><path d="M16 9.757a.75.75 0 0 0-.75-.75H9.068L6.56 6.5h1.385a.75.75 0 1 0 0-1.5H4v3.946a.75.75 0 0 0 1.5 0V7.561l3.076 3.075v3.614c0 .414.336.75.75.75h5.925a.75.75 0 0 0 .75-.75V9.757z"></path>
			</svg>
		</button>
		<button id="Close" class="ViewControl">
			<svg role="img" height="16" width="16" aria-hidden="true" viewBox="0 0 16 16" data-encore-id="icon" class="Svg-sc-ytk21e-0 Svg-img-16-icon"><path d="M1.47 1.47a.75.75 0 0 1 1.06 0L8 6.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L9.06 8l5.47 5.47a.75.75 0 1 1-1.06 1.06L8 9.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L6.94 8 1.47 2.53a.75.75 0 0 1 0-1.06z"></path>
			</svg>
		</button>
	</div>
`.trim()
const LyricsContainer = `<div class="LyricsContent"><div class="ContentContainer"></div></div>`

// Class
export default class CardView implements Giveable {
	// Private Properties
	private readonly Maid = new Maid()

	// Private Elements
	private readonly Container: HTMLDivElement
	private readonly Header: HTMLDivElement
	private readonly ShowLyricsButton: HTMLButtonElement
	private readonly ExpandedControls: {
		Container: HTMLDivElement;
		RomanizeButton: HTMLButtonElement;
		OpenPageButton: HTMLButtonElement;
		CloseButton: HTMLButtonElement;
	}
	// deno-lint-ignore no-explicit-any
	private readonly RomanizeTooltip: any
	private readonly LyricsContainer: HTMLDivElement
	private readonly LyricsContentContainer: HTMLDivElement

	// Constructor
	constructor(insertAfter: HTMLDivElement) {
		// Handle creating our elements
		{
			// Create our container first
			this.Container = this.Maid.Give(CreateElement<HTMLDivElement>(CardContainer))
	
			// Reference our header
			this.Header = this.Container.querySelector<HTMLDivElement>(".Header")!
	
			// Create our show lyrics button
			this.ShowLyricsButton = this.Maid.Give(CreateElement<HTMLButtonElement>(ShowLyricsButton))

			// Create our expanded controls
			const expandedControlsContainer = this.Maid.Give(CreateElement<HTMLDivElement>(ExpandedControls))
			this.ExpandedControls = {
				Container: expandedControlsContainer,
				RomanizeButton: expandedControlsContainer.querySelector<HTMLButtonElement>("#Romanize")!,
				OpenPageButton: expandedControlsContainer.querySelector<HTMLButtonElement>("#Page")!,
				CloseButton: expandedControlsContainer.querySelector<HTMLButtonElement>("#Close")!,
			}

			// Remove our romanize-button if we aren't a romanized lyric
			if (SongLyrics!.RomanizedLanguage === undefined) {
				this.ExpandedControls.RomanizeButton.remove()
			}

			// Create our lyrics-container
			this.LyricsContainer = this.Maid.Give(CreateElement<HTMLDivElement>(LyricsContainer))

			// Reference our lyrics-root-container
			this.LyricsContentContainer = this.LyricsContainer.querySelector<HTMLDivElement>(".ContentContainer")!
		}

		// Create our tool-tips
		{
			const closeTooltip = Spotify.Tippy(
				this.ExpandedControls.CloseButton,
				{
					...Spotify.TippyProps,
					content: `Close Lyrics`
				}
			)
			this.Maid.Give(() => closeTooltip.destroy())
			
			const pageTooltip = Spotify.Tippy(
				this.ExpandedControls.OpenPageButton,
				{
					...Spotify.TippyProps,
					content: "Open Lyrics Page"
				}
			)
			this.Maid.Give(() => pageTooltip.destroy())

			if (SongLyrics!.RomanizedLanguage !== undefined) {
				const romanizeTooltip = Spotify.Tippy(
					this.ExpandedControls.RomanizeButton,
					{
						...Spotify.TippyProps,
						content: "Waiting For Update"
					}
				)
				this.Maid.Give(() => romanizeTooltip.destroy())
				this.RomanizeTooltip = romanizeTooltip
			}
		}

		// Handle romanization updates
		if (SongLyrics!.RomanizedLanguage !== undefined) {
			const SetContent = (isRomanized: boolean) => {
				this.RomanizeTooltip.setContent(isRomanized ? "Disable Romanization" : "Enable Romanization")
				this.ExpandedControls.RomanizeButton.innerHTML = (
					isRomanized
					? RomanizationIcons.Enabled
					: RomanizationIcons.Disabled
				)
			}

			this.Maid.Give(
				LanguageRomanizationChanged.Connect(
					(language, isRomanized) => {
						if (language === SongLyrics!.RomanizedLanguage) {
							SetContent(isRomanized)

							if (this.Maid.Has("LyricsRenderer")) {
								this.CreateLyricsRenderer()
							}
						}
					}
				)
			)

			SetContent(IsLanguageRomanized(SongLyrics!.RomanizedLanguage))
		}

		// Handle our button-presses
		{
			// Handle our show lyrics button
			this.ShowLyricsButton.addEventListener(
				"click",
				() => this.SetLyricsVisibility(true)
			)

			// Handle our close button
			this.ExpandedControls.CloseButton.addEventListener(
				"click",
				() => this.SetLyricsVisibility(false)
			)

			// Handle our open page button
			this.ExpandedControls.OpenPageButton.addEventListener(
				"click",
				() => SpotifyHistory.push("/BeautifulLyrics/Page")
			)

			// Handle our romanization button
			if (SongLyrics!.RomanizedLanguage !== undefined) {
				const romanizedLanguage = SongLyrics!.RomanizedLanguage
				this.ExpandedControls.RomanizeButton.addEventListener(
					"click",
					() => ToggleLanguageRomanization(romanizedLanguage, !IsLanguageRomanized(romanizedLanguage))
				)
			}
		}

		// Handle our overall state
		this.ReactToLyricsVisibility()

		// Now parent our container
		insertAfter.after(this.Container)
	}

	// Private Methods
	private SetLyricsVisibility(visible: boolean) {
		Store.Items.CardLyricsVisible = visible
		this.ReactToLyricsVisibility()
		Store.SaveChanges()
	}

	private CreateLyricsRenderer() {
		this.Maid.Give(
			new LyricsRenderer(
				this.LyricsContentContainer, SongLyrics!,
				(
					(SongLyrics!.RomanizedLanguage === undefined)
					? false
					: IsLanguageRomanized(SongLyrics!.RomanizedLanguage)
				)
			),
			"LyricsRenderer"
		)
	}

	private ReactToLyricsVisibility() {
		// Determine if we are visible
		const isVisbile = Store.Items.CardLyricsVisible

		// Determine what is presently parented to header
		const visibleHeaderElement = isVisbile ? this.ExpandedControls.Container : this.ShowLyricsButton
		this.Header.appendChild(visibleHeaderElement)
		this.Maid.Give(() => visibleHeaderElement.remove(), "VisibleHeaderElement")

		// Determine whether or not our lyrics should be visible
		if (isVisbile) {
			// Generate our lyrics
			this.CreateLyricsRenderer()

			// Parent our container
			this.Container.appendChild(this.LyricsContainer)
		} else {
			// Unparent our container
			this.LyricsContainer.remove()

			// Destroy our lyrics renderer
			this.Maid.Clean("LyricsRenderer")
		}
	}

	// Deconstructor
	public Destroy() {
		this.Maid.Destroy()
	}
}