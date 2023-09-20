// Packages
import { Maid, Giveable } from "../../../../../../Packages/Maid"

// Modules
import { Song } from "../../../Services/Player/Song"
import LyricsRenderer from "../../LyricsRenderer"
import { CreateElement, ToggleLanguageRomanization, IsLanguageRomanized, LanguageRomanizationChanged } from "../SharedMethods"
import { SpotifyHistory, SpotifyPlaybar } from "../../../Services/Session"
import { Cache } from "../../../Services/Cache"

// Types
import { ParsedLyrics } from "../../../Services/Player/LyricsParser"

// Templates
const Container = `<div class="BeautifulLyricsPage"><div class="RootContainer"></div></div>`
const Header = `
	<div class="main-nowPlayingView-lyricsControls BeautifulLyricsPageViewControls">
		<button id="Romanize" class="Psc33HXPyazZYAAr1tgz VpNHGG5ZhoxQ8AqW709S"></button>
		<button id="ToggleDetails" class="Psc33HXPyazZYAAr1tgz VpNHGG5ZhoxQ8AqW709S"></button>
		<button id="Cinema" class="Psc33HXPyazZYAAr1tgz VpNHGG5ZhoxQ8AqW709S">
			<svg role="img" height="16" width="16" aria-hidden="true" viewBox="0 0 16 16" data-encore-id="icon" class="Svg-sc-ytk21e-0 Svg-img-16-icon">
				<path d="M14.55 1c.8 0 1.45.65 1.45 1.45V7h-1.5V2.5h-13v11h5.507V15H1.45C.65 15 0 14.35 0 13.55V2.45C0 1.65.65 1 1.45 1h13.1z"></path><path d="M16 9.757a.75.75 0 0 0-.75-.75H9.068L6.56 6.5h1.385a.75.75 0 1 0 0-1.5H4v3.946a.75.75 0 0 0 1.5 0V7.561l3.076 3.075v3.614c0 .414.336.75.75.75h5.925a.75.75 0 0 0 .75-.75V9.757z"></path>
			</svg>
		</button>
		<button id="Main" class="Psc33HXPyazZYAAr1tgz VpNHGG5ZhoxQ8AqW709S">
			<svg role="img" height="16" width="16" aria-hidden="true" viewBox="0 0 16 16" data-encore-id="icon" class="Svg-sc-ytk21e-0 Svg-img-16-icon">
				<path d="M14.55 1c.8 0 1.45.65 1.45 1.45V7h-1.5V2.5H2.595L5.5 5.406V4.021a.75.75 0 0 1 1.5 0v3.946H3.055a.75.75 0 0 1 0-1.5H4.44L1.5 3.527V13.5h5.507V15H1.45C.65 15 0 14.35 0 13.55V2.45C0 1.65.65 1 1.45 1h13.1z"></path><path d="M16 9.757a.75.75 0 0 0-.75-.75H9.325a.75.75 0 0 0-.75.75v4.493c0 .414.336.75.75.75h5.925a.75.75 0 0 0 .75-.75V9.757z"></path>
			</svg>
		</button>
		<button id="Close" class="Psc33HXPyazZYAAr1tgz VpNHGG5ZhoxQ8AqW709S">
			<svg role="img" height="16" width="16" aria-hidden="true" viewBox="0 0 16 16" data-encore-id="icon" class="Svg-sc-ytk21e-0 Svg-img-16-icon">
				<path d="M1.47 1.47a.75.75 0 0 1 1.06 0L8 6.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L9.06 8l5.47 5.47a.75.75 0 1 1-1.06 1.06L8 9.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L6.94 8 1.47 2.53a.75.75 0 0 1 0-1.06z"></path>
			</svg>
		</button>
	</div>
`.trim()
const NoLyrics = `<span class="NoLyrics">This song doesn't have any Lyrics!</span>`
const HideDetailsSVGIcon = `
	<svg role="img" data-encore-id="icon" class="Svg-sc-ytk21e-0 Svg-img-16-icon" xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 666.67 613.81">
		<path d="m73.57,0l216.65,216.65c13.05-6.25,27.68-9.75,43.11-9.75,55.23,0,100,44.77,100,100,0,15.44-3.5,30.06-9.75,43.12l216.65,216.65-47.14,47.14-92.51-92.51c-45.51,30.78-101.01,52.28-167.25,52.28C100,573.57,0,306.9,0,306.9c0,0,35.72-95.26,114.28-171.91L26.43,47.14,73.57,0Zm88.05,182.34c-44.89,43.47-74.18,95.16-88.64,124.58,28.16,57.33,113.06,199.99,260.34,199.99,45.48,0,85.01-13.6,118.76-34.1l-75.65-75.65c-13.05,6.25-27.68,9.75-43.11,9.75-55.23,0-100-44.77-100-100,0-15.44,3.5-30.06,9.75-43.11l-81.45-81.45ZM333.33,40.24c233.33,0,333.33,266.67,333.33,266.67,0,0-22.25,59.33-70.24,122.02l-47.75-47.76c20.99-28.51,35.92-55.78,45-74.27-28.16-57.33-113.06-199.99-260.35-199.99-18.5,0-36.01,2.25-52.55,6.3l-53.19-53.2c31.64-12.35,66.84-19.76,105.74-19.76Z"/>
	</svg>
`.trim()
const ShowDetailsSVGIcon = `
	<svg role="img" data-encore-id="icon" class="Svg-sc-ytk21e-0 Svg-img-16-icon" xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 666.68 533.33">
		<path d="m2.07,278.2c57.03,155.13,187.1,255.13,331.27,255.13s274.23-100,331.27-255.13c2.77-7.44,2.77-15.63,0-23.07C607.57,100,477.51,0,333.34,0S59.11,100,2.07,255.13c-2.77,7.44-2.77,15.63,0,23.07ZM333.34,66.67c112.43,0,215.03,78.1,264.3,200-49.27,121.9-151.87,200-264.3,200s-215.03-78.1-264.3-200c49.27-121.9,151.87-200,264.3-200Zm0,333.33c73.64,0,133.33-59.7,133.33-133.33s-59.7-133.33-133.33-133.33-133.33,59.7-133.33,133.33,59.7,133.33,133.33,133.33Zm0-200c36.82,0,66.67,29.85,66.67,66.67s-29.85,66.67-66.67,66.67-66.67-29.85-66.67-66.67,29.85-66.67,66.67-66.67Z"/>
	</svg>
`.trim()
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
const RomanizationPlaybarIcons = {
	Disabled: `
		<svg role="img" height="22" width="22" aria-hidden="true" viewBox="0 0 125.45 131.07" data-encore-id="icon" class="Svg-sc-ytk21e-0 Svg-img-16-icon LyricsPageIcon">
			<path class="cls-1" d="m53.38,130.41c-12.54-2.87-20.86-14.36-19.98-27.42.59-7.62,5.8-15.12,13.07-18.69,4.28-2.11,11.02-3.4,17.75-3.46h4.8v-12.71c.06-16,.64-17.99,5.98-20.74,4.86-2.46,10.96-.47,13.3,4.34,1.17,2.34,1.23,3.52,1.23,17.23v14.65l2.81,1.05c13.59,5.1,30.59,17.87,32.34,24.38,1.17,4.34-.88,8.79-4.92,10.72-4.1,1.93-5.63,1.41-13.89-5.27-4.69-3.69-12.83-9.02-15.29-9.96-.88-.29-1.05,0-1.05,1.64,0,2.93-1.58,8.5-3.34,11.78-1.93,3.46-6.74,8.03-10.43,9.79-6.21,2.99-15.88,4.16-22.38,2.7v-.03Zm11.84-20.51c1.05-.47,2.4-1.46,2.87-2.29,1-1.52,1.41-5.39.7-6.15-.64-.59-12.66-.18-13.95.53-1.23.64-1.46,4.92-.29,6.45,1.82,2.34,6.86,3.05,10.66,1.46h0Z"></path>
			<path class="cls-1" d="m6.33,103.4c-4.39-1.99-6.91-6.04-6.21-9.9.23-1.11,2.23-4.8,4.51-8.32,7.21-11.19,17.64-31.23,18.98-36.56l.35-1.46h-8.67c-7.62,0-8.91-.18-10.66-1.17-2.99-1.76-4.34-3.93-4.34-6.91,0-3.52,1.64-6.04,5.1-7.73,2.81-1.41,3.4-1.46,13.89-1.46h10.96l.64-3.93c.35-2.23,1.05-6.86,1.58-10.43,1-7.21,1.93-9.79,4.22-12.19,2.34-2.46,4.39-3.34,7.85-3.34,5.74,0,9.26,3.34,9.26,8.79,0,1.46-.64,5.8-1.46,9.67-.76,3.87-1.46,7.27-1.46,7.56,0,.94,2.99-.29,7.97-3.28,6.04-3.57,9.32-4.22,12.42-2.23,4.51,2.81,4.92,10.84.82,16.35-2.7,3.63-10.9,6.33-20.92,6.91l-6.45.35-1.99,5.33c-3.63,9.67-9.43,22.73-15.35,34.34-6.74,13.3-9.43,17.64-11.72,18.98-2.46,1.46-6.86,1.76-9.32.64h0Z"></path>
			<path class="cls-1" d="m109.17,57.17c-11.19-4.69-29.82-13.3-30.88-14.24-4.69-4.22-3.46-12.42,2.17-15.12,4.28-1.99,6.56-1.29,24.9,7.73,15.12,7.38,16.88,8.44,18.34,10.61,1.99,2.87,2.34,6.8.76,9.2-1.29,1.99-5.21,3.81-8.26,3.81-1.35,0-4.34-.88-7.03-1.99Z"></path>
		</svg>
	`.trim(),
	Enabled: `
		<svg role="img" height="25" width="25" aria-hidden="true" viewBox="0 0 750 900" data-encore-id="icon" class="Svg-sc-ytk21e-0 Svg-img-16-icon LyricsPageIcon">
			<path class="cls-1" d="m529.42,632.32H214.71l-81.89,163.5H13.31L377.06,80.35l350.9,715.47h-121.41l-77.13-163.5Zm-45.23-95.48l-109.03-228.9-114.27,228.9h223.3Z"></path>
		</svg>
	`.trim()
}

// Query Constants
const HeaderQuery = ".main-view-container__scroll-node-child-spacer"
const CinemaContainerQuery = ".Root__main-view-overlay"

// Store where we last were before a Page opened
let LastPageLocation: (string | undefined)

// Class
export default class PageView implements Giveable {
	// Private Properties
	private readonly Maid = new Maid()

	// Private Elements
	private readonly Container: HTMLDivElement
	private readonly LyricsContainer: HTMLDivElement
	private readonly Header: HTMLDivElement
	private readonly Controls: {
		Romanize?: HTMLButtonElement,
		ToggleDetails?: HTMLButtonElement,
		Change?: HTMLButtonElement,
		Close?: HTMLButtonElement
	}
	private readonly UpdateRomanizedToggle = ((isRomanized: boolean) => undefined)
	private readonly SetRomanizeVisibility = ((isVisible: boolean) => undefined)

	// Private State
	private Song?: Song
	private Lyrics?: ParsedLyrics

	// Constructor
	constructor(page: HTMLDivElement, isCinema?: boolean, isFullscreen?: boolean) {
		// Determine our last-page
		const lastPage = SpotifyHistory.entries[SpotifyHistory.entries.length - 2]
		if ((lastPage !== undefined) && (lastPage.pathname.startsWith("/BeautifulLyrics") === false)) {
			LastPageLocation = lastPage.pathname
		}

		// Handle creating our elements
		{
			// Create our container first
			this.Container = this.Maid.Give(CreateElement<HTMLDivElement>(Container))
			if (isCinema) {
				this.Container.classList.add("Cinema")
			}
			if (isFullscreen) {
				this.Container.classList.add("Fullscreen")
			}

			// Create our header
			this.Header = this.Maid.Give(CreateElement<HTMLDivElement>(Header))

			// Grab our controls
			let changeButton: (HTMLButtonElement | undefined)
			if (isFullscreen) {
				// Remove all our buttons (since we expect to use the fullscreen button to exit)
				this.Header.querySelectorAll<HTMLButtonElement>("button").forEach(button => button.remove())
			} else if (isCinema) {
				// Remove our cinema button
				this.Header.querySelector<HTMLButtonElement>("#Cinema")!.remove()

				// Set our change-button
				changeButton = this.Header.querySelector<HTMLButtonElement>("#Main")!
			} else {
				// Remove our main/details button
				this.Header.querySelector<HTMLButtonElement>("#Main")!.remove()
				this.Header.querySelector<HTMLButtonElement>("#ToggleDetails")!.remove()

				// Set our change-button
				changeButton = this.Header.querySelector<HTMLButtonElement>("#Cinema")!
			}

			// Set our controls
			this.Controls = {
				Romanize: (this.Header.querySelector<HTMLButtonElement>("#Romanize") ?? undefined),
				ToggleDetails: (this.Header.querySelector<HTMLButtonElement>("#ToggleDetails") ?? undefined),
				Change: changeButton,
				Close: (this.Header.querySelector<HTMLButtonElement>("#Close") ?? undefined)
			}

			// Create our lyrics-container
			this.LyricsContainer = this.Container.querySelector<HTMLDivElement>(".RootContainer")!
		}

		// Handle our controls
		{
			// Handle our close button
			if (this.Controls.Close !== undefined) {
				const closeTooltip = Spicetify.Tippy(
					this.Controls.Close,
					{
						...Spicetify.TippyProps,
						content: `Close ${isCinema ? "Cinema" : "Page"}`
					}
				)
				this.Maid.Give(() => closeTooltip.destroy())

				this.Controls.Close.addEventListener(
					"click",
					() => this.Close()
				)
			}

			// Handle our change button
			if (this.Controls.Change !== undefined) {
				const changeTooltip = Spicetify.Tippy(
					this.Controls.Change,
					{
						...Spicetify.TippyProps,
						content: (isCinema ? "Leave Cinema" : "Enter Cinema")
					}
				)
				this.Maid.Give(() => changeTooltip.destroy())

				this.Controls.Change.addEventListener(
					"click",
					() => {
						if (isCinema) {
							SpotifyHistory.push("/BeautifulLyrics/Main")
						} else {
							SpotifyHistory.push("/BeautifulLyrics/Cinema")
						}
					}
				)
			}

			// Handle our toggle-details button
			if (this.Controls.ToggleDetails !== undefined) {
				// Get our current-state
				const stateCache = Cache.GetItem("LyricViews")
				let detailsHidden = stateCache.PlaybarDetailsHidden

				// Create our tool-tip
				const detailsTooltip = Spicetify.Tippy(
					this.Controls.ToggleDetails,
					{
						...Spicetify.TippyProps,
						content: ""
					}
				)
				this.Maid.Give(() => detailsTooltip.destroy())

				// Handle updating our icon/class
				const Update = () => {
					this.Controls.ToggleDetails!.innerHTML = (detailsHidden ? ShowDetailsSVGIcon : HideDetailsSVGIcon)

					if (detailsHidden) {
						this.Container.classList.add("PlaybarDetailsHidden")
						detailsTooltip.setContent("Show Playbar Details")
					} else {
						this.Container.classList.remove("PlaybarDetailsHidden")
						detailsTooltip.setContent("Hide Playbar Details")
					}
				}

				// Handle switching our state
				this.Controls.ToggleDetails.addEventListener(
					"click",
					() => {
						// Flip our state
						detailsHidden = !detailsHidden

						// Save our state
						stateCache.PlaybarDetailsHidden = detailsHidden
						Cache.SaveItemChanges("LyricViews")

						// Now update
						Update()
					}
				)

				// Update  immediately
				Update()
			}

			// Setup our romanization button
			{
				// Create our toggle method
				const ToggleRomanizationState = () => {
					if (this.Lyrics?.RomanizedLanguage !== undefined) {
						ToggleLanguageRomanization(
							this.Lyrics.RomanizedLanguage,
							!IsLanguageRomanized(this.Lyrics.RomanizedLanguage)
						)
					}
				}

				// Determine how our content-updates
				let setContent: ((isRomanized: boolean) => undefined)
				let setVisibility: ((isVisible: boolean) => undefined)
				if (this.Controls.Romanize === undefined) {
					const playbarButton = new SpotifyPlaybar.Button(
						"Waiting For Update",
						RomanizationPlaybarIcons.Disabled,
						ToggleRomanizationState,
						false,
						false
					)
					this.Maid.Give(() => playbarButton.deregister())

					setContent = (isRomanized: boolean): undefined => {
						playbarButton.label = (isRomanized ? "Disable Romanization" : "Enable Romanization")
						playbarButton.icon = (
							isRomanized
							? RomanizationPlaybarIcons.Enabled
							: RomanizationPlaybarIcons.Disabled
						)
						playbarButton.active = isRomanized
					}
					setVisibility = (isVisible: boolean): undefined => {
						playbarButton.element.style.display = (isVisible ? "" : "none")
					}
				} else {
					const romanizeControl = this.Controls.Romanize
					const romanizeTooltip = Spicetify.Tippy(
						romanizeControl,
						{
							...Spicetify.TippyProps,
							content: "Waiting For Update"
						}
					)
					this.Maid.Give(() => romanizeTooltip.destroy())

					setContent = (isRomanized: boolean): undefined => {
						romanizeTooltip.setContent(isRomanized ? "Disable Romanization" : "Enable Romanization")
						romanizeControl.innerHTML = (
							isRomanized
							? RomanizationIcons.Enabled
							: RomanizationIcons.Disabled
						)
					}
					setVisibility = (isVisible: boolean): undefined => {
						romanizeControl.style.display = (isVisible ? "" : "none")
					}

					romanizeControl.addEventListener("click", ToggleRomanizationState)
				}

				// Now set to our content-updater
				this.UpdateRomanizedToggle = setContent
				this.SetRomanizeVisibility = setVisibility
		
				// Handle our romanization state changing and its initial state
				this.Maid.Give(
					LanguageRomanizationChanged.Connect(
						(language, isRomanized) => {
							if (language === this.Lyrics?.RomanizedLanguage) {
								setContent(isRomanized)
								this.CreateLyricsRenderer()
							}
						}
					)
				)

				if (this.Lyrics?.RomanizedLanguage !== undefined) {
					setContent(IsLanguageRomanized(this.Lyrics.RomanizedLanguage))
				}
			}
		}

		// If we're in Fullscreen mode add escape-key support
		if (isFullscreen) {
			const HandleEscape = (event: KeyboardEvent) => {
				if (event.key === 'Escape') {
					this.Close()
				}
			}

			window.addEventListener(
				'keydown', HandleEscape,
				true
			)
			this.Maid.Give(() => window.removeEventListener('keydown', HandleEscape, true))
		}

		// Now parent our container/header (dependent on if we are cinema or not)
		if (isCinema || isFullscreen) {
			this.Container.firstChild!.before(this.Header)
			document.querySelectorAll<HTMLDivElement>(CinemaContainerQuery)[0].appendChild(this.Container)
		} else {
			page.querySelector<HTMLDivElement>(HeaderQuery)!.appendChild(this.Header)
			page.appendChild(this.Container)
		}
	}

	// Private Methods
	private CreateLyricsRenderer(shouldUpdateRomanizeToggle?: true) {
		// If we don't have lyrics we need to display that
		if (this.Lyrics === undefined) {
			this.LyricsContainer.appendChild(
				this.Maid.Give(CreateElement<HTMLSpanElement>(NoLyrics), "LyricsRenderer")
			)
			this.SetRomanizeVisibility(false)
		} else { // Otherwise, render our lyrics
			let isRomanized = false
			if (this.Lyrics.RomanizedLanguage === undefined) {
				this.SetRomanizeVisibility(false)
			} else {
				isRomanized = IsLanguageRomanized(this.Lyrics.RomanizedLanguage)
				if (shouldUpdateRomanizeToggle) {
					this.UpdateRomanizedToggle(isRomanized)
				}
				this.SetRomanizeVisibility(true)
			}

			this.Maid.Give(
				new LyricsRenderer(
					this.LyricsContainer, this.Song!, this.Lyrics,
					isRomanized
				),
				"LyricsRenderer"
			)
		}
	}

	private ReactToSongChange() {
		// Remove our old lyrics
		this.Maid.Clean("LyricsRenderer")

		// Don't continue if we don't have a song
		const song = this.Song
		if (song === undefined) {
			return
		}

		// Grab our details
		song.GetDetails()
		.then(
			details => {
				// Store our lyrics
				this.Lyrics = details?.Lyrics

				// Now create our lyrics-renderer
				this.CreateLyricsRenderer(true)
			}
		)
	}

	// Public Methods
	public IsCinema() {
		return this.Container.classList.contains("Cinema")
	}

	public IsFullscreen() {
		return this.Container.classList.contains("Fullscreen")
	}

	public SetSong(song?: Song) {
		if (this.Song !== song) {
			// Store our song
			this.Song = song

			// Handle setting our lyrics
			this.ReactToSongChange()
		}
	}

	public Close() {
		// If we have a last-page then go there
		if (LastPageLocation !== undefined) {
			return SpotifyHistory.push(LastPageLocation)
		}

		// Otherwise, send us home
		SpotifyHistory.push("/")
	}

	// Deconstructor
	public Destroy() {
		this.Maid.Destroy()
	}
}