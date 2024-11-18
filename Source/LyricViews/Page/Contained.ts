// Styles
import "./style.scss"

// Web-Modules
import { Maid, Giveable } from "jsr:@socali/modules/Maid"
import { Timeout } from "jsr:@socali/modules/Scheduler"

// Spices
import {
	Spotify,
	SpotifyHistory
} from "@socali/Spices/Session"
import { Song, SongChanged } from "@socali/Spices/Player"

// Our Modules
import { CreateLyricsRenderer, SetupRomanizationButton } from "./Shared.ts"
import { CreateElement, ApplyDynamicBackground } from "../Shared.ts"

// Templates
const Container = `
	<div class="BeautifulLyricsPage Contained">
		<div class="Content"></div>
	</div>
`
const Header = `
	<div class="ViewControls">
		<button id="Romanize" class="ViewControl"></button>
		<button id="Cinema" class="ViewControl">
			<svg role="img" height="16" width="16" aria-hidden="true" viewBox="0 0 16 16" data-encore-id="icon" class="Svg-sc-ytk21e-0 Svg-img-16-icon">
				<path d="M14.55 1c.8 0 1.45.65 1.45 1.45V7h-1.5V2.5h-13v11h5.507V15H1.45C.65 15 0 14.35 0 13.55V2.45C0 1.65.65 1 1.45 1h13.1z"></path><path d="M16 9.757a.75.75 0 0 0-.75-.75H9.068L6.56 6.5h1.385a.75.75 0 1 0 0-1.5H4v3.946a.75.75 0 0 0 1.5 0V7.561l3.076 3.075v3.614c0 .414.336.75.75.75h5.925a.75.75 0 0 0 .75-.75V9.757z"></path>
			</svg>
		</button>
		<button id="Close" class="ViewControl">
			<svg role="img" height="16" width="16" aria-hidden="true" viewBox="0 0 16 16" data-encore-id="icon" class="Svg-sc-ytk21e-0 Svg-img-16-icon">
				<path d="M1.47 1.47a.75.75 0 0 1 1.06 0L8 6.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L9.06 8l5.47 5.47a.75.75 0 1 1-1.06 1.06L8 9.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L6.94 8 1.47 2.53a.75.75 0 0 1 0-1.06z"></path>
			</svg>
		</button>
	</div>
`.trim()
const NoLyrics = `<span class="NoLyrics">This song doesn't have any Lyrics!</span>`

// Query Constants
const HeaderQuery = ".main-view-container__scroll-node-child-spacer, .main-view-container__scroll-node-child"

// Store where we last were before a Page opened
let LastPageLocation: (string | undefined)

// Class
export default class PageView implements Giveable {
	// Private Properties
	private readonly Maid = new Maid()

	// Public Properties
	public readonly Closed = this.Maid.Destroyed

	// Constructor
	constructor(page: HTMLDivElement, isLegacy: boolean) {
		// Determine our last-page
		const lastPage = SpotifyHistory.entries[SpotifyHistory.entries.length - 2]
		if ((lastPage !== undefined) && (lastPage.pathname.startsWith("/BeautifulLyrics") === false)) {
			LastPageLocation = lastPage.pathname
		}

		// Create our container/header
		const container = this.Maid.Give(CreateElement<HTMLDivElement>(Container))
		const header = this.Maid.Give(CreateElement<HTMLDivElement>(Header))

		// Apply our dynamic background
		ApplyDynamicBackground(container, this.Maid)

		// Handle lyric-rendering changes
		const content = container.querySelector<HTMLDivElement>(".Content")!
		const UpdateLyricsRenderer = CreateLyricsRenderer(content, this.Maid, NoLyrics)

		// Handle our controls
		{
			// Grab our controls
			const changeButton = header.querySelector<HTMLButtonElement>("#Cinema")!
			const romanizeButton = header.querySelector<HTMLButtonElement>("#Romanize")!
			const closeButton = header.querySelector<HTMLButtonElement>("#Close")!

			// Handle our close button
			{
				const closeTooltip = Spotify.Tippy(
					closeButton,
					{
						...Spotify.TippyProps,
						content: `Close Page`
					}
				)
				this.Maid.Give(() => closeTooltip.destroy())

				closeButton.addEventListener(
					"click",
					() => this.Close()
				)
			}

			// Handle our change button
			{
				const changeTooltip = Spotify.Tippy(
					changeButton,
					{
						...Spotify.TippyProps,
						content: "Enter Cinema"
					}
				)
				this.Maid.Give(() => changeTooltip.destroy())

				changeButton.addEventListener(
					"click",
					() => SpotifyHistory.push("/BeautifulLyrics/Fullscreen")
				)
			}

			// Setup our romanization button
			SetupRomanizationButton(romanizeButton, UpdateLyricsRenderer, this.Maid)
		}

		// Now parent our container/header
		if (isLegacy) {
			page.style.containerType = "inline-size"
			this.Maid.Give(() => page.style.containerType = "")
		}
		container.appendChild(header)
		page.appendChild(container)

		// Handle watching for no-songs
		{
			const CheckForSongExistence = () => {
				if (Song === undefined) {
					this.Close()
				}
			}

			this.Maid.Give(SongChanged.Connect(CheckForSongExistence))
			this.Maid.Give(Timeout(1, CheckForSongExistence))
		}
	}

	// Public Methods
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