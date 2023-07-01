// Packages
import { Maid, Giveable } from "../../../../../../Packages/Maid"

// Modules
import { ParsedLyrics } from "../../../Services/Player/LyricsParser"
import { Song } from "../../../Services/Player/Song"
import LyricsRenderer from "../../LyricsRenderer"
import { CreateElement } from "../SharedMethods"
import { SpotifyHistory } from "../../../Services/Session"

// Templates
const Container = `<div class="BeautifulLyricsPage"><div class="RootContainer"></div></div>`
const Header = `<div class="main-nowPlayingView-lyricsControls"><button id="Cinema" class="Psc33HXPyazZYAAr1tgz VpNHGG5ZhoxQ8AqW709S" aria-label="Open in cinema mode"><svg role="img" height="16" width="16" aria-hidden="true" viewBox="0 0 16 16" data-encore-id="icon" class="Svg-sc-ytk21e-0 Svg-img-16-icon"><path d="M14.55 1c.8 0 1.45.65 1.45 1.45V7h-1.5V2.5h-13v11h5.507V15H1.45C.65 15 0 14.35 0 13.55V2.45C0 1.65.65 1 1.45 1h13.1z"></path><path d="M16 9.757a.75.75 0 0 0-.75-.75H9.068L6.56 6.5h1.385a.75.75 0 1 0 0-1.5H4v3.946a.75.75 0 0 0 1.5 0V7.561l3.076 3.075v3.614c0 .414.336.75.75.75h5.925a.75.75 0 0 0 .75-.75V9.757z"></path></svg></button><button id="Main" class="Psc33HXPyazZYAAr1tgz VpNHGG5ZhoxQ8AqW709S" aria-label="Minimize lyrics" aria-expanded="false"><svg role="img" height="16" width="16" aria-hidden="true" viewBox="0 0 16 16" data-encore-id="icon" class="Svg-sc-ytk21e-0 Svg-img-16-icon"><path d="M14.55 1c.8 0 1.45.65 1.45 1.45V7h-1.5V2.5H2.595L5.5 5.406V4.021a.75.75 0 0 1 1.5 0v3.946H3.055a.75.75 0 0 1 0-1.5H4.44L1.5 3.527V13.5h5.507V15H1.45C.65 15 0 14.35 0 13.55V2.45C0 1.65.65 1 1.45 1h13.1z"></path><path d="M16 9.757a.75.75 0 0 0-.75-.75H9.325a.75.75 0 0 0-.75.75v4.493c0 .414.336.75.75.75h5.925a.75.75 0 0 0 .75-.75V9.757z"></path></svg></button><button id="Close" class="Psc33HXPyazZYAAr1tgz VpNHGG5ZhoxQ8AqW709S" aria-label="Close lyrics"><svg role="img" height="16" width="16" aria-hidden="true" viewBox="0 0 16 16" data-encore-id="icon" class="Svg-sc-ytk21e-0 Svg-img-16-icon"><path d="M1.47 1.47a.75.75 0 0 1 1.06 0L8 6.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L9.06 8l5.47 5.47a.75.75 0 1 1-1.06 1.06L8 9.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L6.94 8 1.47 2.53a.75.75 0 0 1 0-1.06z"></path></svg></button></div>`
const NoLyrics = `<span class="NoLyrics">This song doesn't have any Lyrics!</span>`

// Query Constants
const HeaderQuery = ".main-view-container__scroll-node-child-spacer"
const CinemaContainerQuery = ".Root__main-view-overlay"

// Class
export default class PageView implements Giveable {
	// Private Properties
	private readonly Maid = new Maid()

	// Private Elements
	private readonly Container: HTMLDivElement
	private readonly LyricsContainer: HTMLDivElement
	private readonly Header: HTMLDivElement
	private readonly Controls: {
		Change: HTMLButtonElement,
		Close: HTMLButtonElement
	}

	// Private State
	private Song?: Song

	// Constructor
	constructor(page: HTMLDivElement, isCinema?: true) {
		// Handle creating our elements
		{
			// Create our container first
			this.Container = this.Maid.Give(CreateElement<HTMLDivElement>(Container))
			if (isCinema) {
				this.Container.classList.add("Cinema")
			}

			// Create our header
			this.Header = this.Maid.Give(CreateElement<HTMLDivElement>(Header))

			// Grab our controls
			let changeButton: HTMLButtonElement
			if (isCinema) {
				// Remove our cinema button
				this.Header.querySelector<HTMLButtonElement>("#Cinema")!.remove()

				// Set our change-button
				changeButton = this.Header.querySelector<HTMLButtonElement>("#Main")!
			} else {
				// Remove our main button
				this.Header.querySelector<HTMLButtonElement>("#Main")!.remove()

				// Set our change-button
				changeButton = this.Header.querySelector<HTMLButtonElement>("#Cinema")!
			}

			// Set our controls
			this.Controls = {
				Change: changeButton,
				Close: this.Header.querySelector<HTMLButtonElement>("#Close")!
			}

			// Create our lyrics-container
			this.LyricsContainer = this.Container.querySelector<HTMLDivElement>(".RootContainer")!
		}

		// Handle our controls
		{
			// Create tippy-tips for our buttons
			const closeTooltip = Spicetify.Tippy(
				this.Controls.Close,
				{
					...Spicetify.TippyProps,
					content: `Close ${isCinema ? "Cinema" : "Page"}`
				}
			)
			this.Maid.Give(() => closeTooltip.destroy())
			
			const changeTooltip = Spicetify.Tippy(
				this.Controls.Change,
				{
					...Spicetify.TippyProps,
					content: (isCinema ? "Leave Cinema" : "Enter Cinema")
				}
			)
			this.Maid.Give(() => changeTooltip.destroy())

			// Handle our close button
			this.Controls.Close.addEventListener(
				"click",
				() => this.Close()
			)

			// Handle our change button
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

		// Now parent our container/header (dependent on if we are cinema or not)
		if (isCinema) {
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
	public SetSong(song?: Song) {
		if (this.Song !== song) {
			// Store our song
			this.Song = song

			// Handle setting our lyrics
			this.ReactToSongChange()
		}
	}

	public Close() {
		// Find a page that isn't related to us
		for (let index = (SpotifyHistory.entries.length - 1); index >= 0; index -= 1) {
			const path = SpotifyHistory.entries[index].pathname

			if (path.startsWith("/BeautifulLyrics") === false) {
				SpotifyHistory.push(path)
				break
			}
		}

		// Otherwise, send us home
		SpotifyHistory.push("/")
	}

	// Deconstructor
	public Destroy() {
		this.Maid.Destroy()
	}
}