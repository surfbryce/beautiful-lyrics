// Packages
import { Maid, Giveable } from "../../../../../../Packages/Maid"

// Modules
import { ParsedLyrics } from "../../../Services/Player/LyricsParser"
import { Song } from "../../../Services/Player/Song"
import LyricsRenderer from "../../LyricsRenderer"
import { CreateElement } from "../SharedMethods"
import { Cache } from "../../../Services/Cache"
import { SpotifyHistory } from "../../../Services/Session"

// Templates
const CardContainer = `<div id="BeautifulLyrics-CardView" class="main-nowPlayingView-section main-nowPlayingView-sectionHeaderSpacing" style=""><div id="Header" class="Type__TypeElement-sc-goli3j-0 TypeElement-balladBold-textBase-type main-nowPlayingView-sectionHeader main-nowPlayingView-lyricsTitle" data-encore-id="type">Lyrics</div></div>`
const ShowLyricsButton = `<button id="ShowLyrics" class="Button-sc-y0gtbx-0 Button-sm-buttonSecondary-useBrowserDefaultFocusStyle Button-sm-buttonSecondary-isUsingKeyboard-useBrowserDefaultFocusStyle ButtonSecondary___StyledEncoreButtonSecondary-sc-1nxt2rd-0 StyledEncoreButtonSecondary-sm" data-encore-id="buttonSecondary">Show lyrics</button>`
const ExpandedControls = `<div class="main-nowPlayingView-lyricsControls"><button id="Page" class="Psc33HXPyazZYAAr1tgz VpNHGG5ZhoxQ8AqW709S" aria-label="Open in cinema mode"><svg role="img" height="16" width="16" aria-hidden="true" viewBox="0 0 16 16" data-encore-id="icon" class="Svg-sc-ytk21e-0 Svg-img-16-icon"><path d="M14.55 1c.8 0 1.45.65 1.45 1.45V7h-1.5V2.5h-13v11h5.507V15H1.45C.65 15 0 14.35 0 13.55V2.45C0 1.65.65 1 1.45 1h13.1z"></path><path d="M16 9.757a.75.75 0 0 0-.75-.75H9.068L6.56 6.5h1.385a.75.75 0 1 0 0-1.5H4v3.946a.75.75 0 0 0 1.5 0V7.561l3.076 3.075v3.614c0 .414.336.75.75.75h5.925a.75.75 0 0 0 .75-.75V9.757z"></path></svg></button><button id="Close" class="Psc33HXPyazZYAAr1tgz VpNHGG5ZhoxQ8AqW709S" aria-label="Close lyrics"><svg role="img" height="16" width="16" aria-hidden="true" viewBox="0 0 16 16" data-encore-id="icon" class="Svg-sc-ytk21e-0 Svg-img-16-icon"><path d="M1.47 1.47a.75.75 0 0 1 1.06 0L8 6.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L9.06 8l5.47 5.47a.75.75 0 1 1-1.06 1.06L8 9.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L6.94 8 1.47 2.53a.75.75 0 0 1 0-1.06z"></path></svg></button></div>`
const LyricsContainer = `<div class="main-nowPlayingView-lyricsContent"><div class="RootContainer"></div></div>`

// Class
export default class CardView implements Giveable {
	// Private Properties
	private readonly Maid = new Maid()

	private readonly Song: Song
	private readonly Lyrics: ParsedLyrics

	// Private Elements
	private readonly Container: HTMLDivElement
	private readonly Header: HTMLDivElement
	private readonly ShowLyricsButton: HTMLButtonElement
	private readonly ExpandedControls: {
		Container: HTMLDivElement;
		OpenPageButton: HTMLButtonElement;
		CloseButton: HTMLButtonElement;
	}
	private readonly LyricsContainer: HTMLDivElement
	private readonly LyricsRootContainer: HTMLDivElement

	// Private State
	private CachedLyricViewSettings = Cache.GetItem("LyricViews")

	// Constructor
	constructor(
		song: Song, lyrics: ParsedLyrics,
		insertAfter: HTMLDivElement
	) {
		// Store our song/lyrics
		this.Song = song
		this.Lyrics = lyrics

		// Handle creating our elements
		{
			// Create our container first
			this.Container = this.Maid.Give(CreateElement<HTMLDivElement>(CardContainer))
	
			// Reference our header
			this.Header = this.Container.querySelector<HTMLDivElement>("#Header")!
	
			// Create our show lyrics button
			this.ShowLyricsButton = this.Maid.Give(CreateElement<HTMLButtonElement>(ShowLyricsButton))

			// Create our expanded controls
			const expandedControlsContainer = this.Maid.Give(CreateElement<HTMLDivElement>(ExpandedControls))
			this.ExpandedControls = {
				Container: expandedControlsContainer,
				OpenPageButton: expandedControlsContainer.querySelector<HTMLButtonElement>("#Page")!,
				CloseButton: expandedControlsContainer.querySelector<HTMLButtonElement>("#Close")!,
			}

			// Create our lyrics-container
			this.LyricsContainer = this.Maid.Give(CreateElement<HTMLDivElement>(LyricsContainer))

			// Reference our lyrics-root-container
			this.LyricsRootContainer = this.LyricsContainer.querySelector<HTMLDivElement>(".RootContainer")!
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
				() => SpotifyHistory.push("/BeautifulLyrics/Main")
			)
		}

		// Handle our overall state
		this.ReactToLyricsVisibility()

		// Now parent our container
		insertAfter.after(this.Container)
	}

	// Private Methods
	private SetLyricsVisibility(visible: boolean) {
		this.CachedLyricViewSettings.CardLyricsVisible = visible
		this.ReactToLyricsVisibility()
		Cache.SaveItemChanges("LyricViews")
	}

	private ReactToLyricsVisibility() {
		// Determine if we are visible
		const isVisbile = this.CachedLyricViewSettings.CardLyricsVisible

		// Determine what is presently parented to header
		const visibleHeaderElement = isVisbile ? this.ExpandedControls.Container : this.ShowLyricsButton
		this.Header.appendChild(visibleHeaderElement)
		this.Maid.Give(() => visibleHeaderElement.remove(), "VisibleHeaderElement")

		// Determine whether or not our lyrics should be visible
		if (isVisbile) {
			// Generate our lyrics
			this.Maid.Give(
				new LyricsRenderer(this.LyricsRootContainer, this.Song, this.Lyrics),
				"LyricsRenderer"
			)

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