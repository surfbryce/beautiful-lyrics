// Packages
import { Maid, Giveable } from "../../../../../../Packages/Maid"

// Modules
import { Song } from "../../../Services/Player/Song"
import LyricsRenderer from "../../LyricsRenderer"
import { CreateElement } from "../SharedMethods"
import { SpotifyHistory } from "../../../Services/Session"
import { Cache } from "../../../Services/Cache"

// Templates
const Container = `<div class="BeautifulLyricsPage"><div class="RootContainer"></div></div>`
const Header = `<div class="main-nowPlayingView-lyricsControls"><button id="ToggleDetails" class="Psc33HXPyazZYAAr1tgz VpNHGG5ZhoxQ8AqW709S" aria-label="Toggle Playbar Details"></button><button id="Cinema" class="Psc33HXPyazZYAAr1tgz VpNHGG5ZhoxQ8AqW709S" aria-label="Open in cinema mode"><svg role="img" height="16" width="16" aria-hidden="true" viewBox="0 0 16 16" data-encore-id="icon" class="Svg-sc-ytk21e-0 Svg-img-16-icon"><path d="M14.55 1c.8 0 1.45.65 1.45 1.45V7h-1.5V2.5h-13v11h5.507V15H1.45C.65 15 0 14.35 0 13.55V2.45C0 1.65.65 1 1.45 1h13.1z"></path><path d="M16 9.757a.75.75 0 0 0-.75-.75H9.068L6.56 6.5h1.385a.75.75 0 1 0 0-1.5H4v3.946a.75.75 0 0 0 1.5 0V7.561l3.076 3.075v3.614c0 .414.336.75.75.75h5.925a.75.75 0 0 0 .75-.75V9.757z"></path></svg></button><button id="Main" class="Psc33HXPyazZYAAr1tgz VpNHGG5ZhoxQ8AqW709S" aria-label="Minimize lyrics" aria-expanded="false"><svg role="img" height="16" width="16" aria-hidden="true" viewBox="0 0 16 16" data-encore-id="icon" class="Svg-sc-ytk21e-0 Svg-img-16-icon"><path d="M14.55 1c.8 0 1.45.65 1.45 1.45V7h-1.5V2.5H2.595L5.5 5.406V4.021a.75.75 0 0 1 1.5 0v3.946H3.055a.75.75 0 0 1 0-1.5H4.44L1.5 3.527V13.5h5.507V15H1.45C.65 15 0 14.35 0 13.55V2.45C0 1.65.65 1 1.45 1h13.1z"></path><path d="M16 9.757a.75.75 0 0 0-.75-.75H9.325a.75.75 0 0 0-.75.75v4.493c0 .414.336.75.75.75h5.925a.75.75 0 0 0 .75-.75V9.757z"></path></svg></button><button id="Close" class="Psc33HXPyazZYAAr1tgz VpNHGG5ZhoxQ8AqW709S" aria-label="Close lyrics"><svg role="img" height="16" width="16" aria-hidden="true" viewBox="0 0 16 16" data-encore-id="icon" class="Svg-sc-ytk21e-0 Svg-img-16-icon"><path d="M1.47 1.47a.75.75 0 0 1 1.06 0L8 6.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L9.06 8l5.47 5.47a.75.75 0 1 1-1.06 1.06L8 9.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L6.94 8 1.47 2.53a.75.75 0 0 1 0-1.06z"></path></svg></button></div>`
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
		ToggleDetails?: HTMLButtonElement,
		Change?: HTMLButtonElement,
		Close?: HTMLButtonElement
	}

	// Private State
	private Song?: Song

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
				// If we don't have lyrics we need to display that
				if (details?.Lyrics === undefined) {
					this.LyricsContainer.appendChild(this.Maid.Give(CreateElement<HTMLSpanElement>(NoLyrics), "LyricsRenderer"))
				} else { // Otherwise, render our lyrics
					this.Maid.Give(new LyricsRenderer(this.LyricsContainer, song, details.Lyrics), "LyricsRenderer")
				}
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