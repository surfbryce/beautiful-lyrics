// Styles
import "./style.scss"
import "../Stylings/Views.scss"

// Imported Types
import Spicetify from "jsr:@socali/spices/Spicetify/Types/App/Spicetify"

// NPM Packages
import { checkKey } from "npm:@rwh/keystrokes"

// Web Modules
import { Maid } from "jsr:@socali/modules/Maid"
import { Defer, Timeout } from "jsr:@socali/modules/Scheduler"

// Spices
import {
	GlobalMaid,
	OnSpotifyReady,
	HistoryLocation, SpotifyHistory, SpotifyPlaybar
} from "@socali/Spices/Session"
import {
	Song, SongChanged,
	SongLyrics, SongLyricsLoaded, HaveSongLyricsLoaded
} from "@socali/Spices/Player"

// Components
import CardView from "./Card/mod.ts"
import { getCustomLyric, CustomLyricEntry } from "../Components/Settings.ts" // Import for custom lyrics
import { parseCustomLyrics, CustomTransformedLyrics } from "../Utils/CustomLyricsParser.ts" // Import for custom lyrics parser
import ContainedPageView from "./Page/Contained.ts"
import FullscreenPageView from "./Page/Fullscreen.ts"

// Our Modules
import { CreateElement, ApplyDynamicBackground } from "./Shared.ts"
import Icons from "./Icons.ts"

// Create our maid
const ViewMaid = GlobalMaid.Give(new Maid())

// Template Constants
const LoadingLyricsCard = `<div class="LoadingLyricsCard Loading"></div>`

// DOM Search Constants
const CurrentMainPage = ".Root__main-view .main-view-container div[data-overlayscrollbars-viewport]"
const LegacyMainPage = ".Root__main-view .main-view-container .os-host"
const RightSidebar = ".Root__right-sidebar"
const ContentsContainer = "aside, section.main-buddyFeed-container"
const CardInsertAnchor = ".main-nowPlayingView-nowPlayingWidget, canvas"
const SpotifyCardViewQuery = ".main-nowPlayingView-section:not(:is(#BeautifulLyrics-CardView)):has(.main-nowPlayingView-lyricsTitle)"

// Store our internal utilities
let SetPlaybarPageIconActiveState: (isActive: boolean) => void
let ActivePageView: (ContainedPageView | FullscreenPageView | undefined)
let activeCustomLyricText: string | null = null; // Variable to store fetched custom lyric text
let activeCustomTransformedLyrics: CustomTransformedLyrics | null = null; // Variable to store parsed custom lyrics

// Wait for Spotify to start our processing
OnSpotifyReady
.then( // Custom Lyrics Loading on Song Change
	() => {
		const loadCustomLyrics = () => {
			activeCustomLyricText = null; // Reset on each song change
			activeCustomTransformedLyrics = null; // Reset parsed lyrics

			const track = globalThis.Spicetify?.Player?.data?.track;
			if (track && track.metadata) {
				const title = track.metadata.title;
				const artist = track.metadata.artist_name;

				if (title && artist) {
					console.log(`Beautiful Lyrics: Checking custom lyrics for ${title} - ${artist}`);
					const customLyricEntry = getCustomLyric(title, artist);
					if (customLyricEntry && customLyricEntry.lyricsText) {
						activeCustomLyricText = customLyricEntry.lyricsText;
						console.log("Beautiful Lyrics: Found custom lyrics text.");
						activeCustomTransformedLyrics = parseCustomLyrics(activeCustomLyricText);
						if (activeCustomTransformedLyrics) {
							console.log("Beautiful Lyrics: Successfully parsed custom lyrics.");
							// If views need to be updated reactively after they are already loaded,
							// an event/signal here would be useful. For now, views will get it at instantiation.
							// HaveSongLyricsLoaded = true; // Potentially set this true
							// SongLyricsLoaded.Dispatch(); // And dispatch if custom lyrics make them "loaded"
						} else {
							console.warn("Beautiful Lyrics: Failed to parse custom lyrics text.");
						}
					} else {
						console.log("Beautiful Lyrics: No custom lyrics found or text is empty.");
					}
				} else {
					console.warn("Beautiful Lyrics: Could not retrieve title or artist for current song.");
				}
			} else {
				console.warn("Beautiful Lyrics: Spicetify Player data or track metadata not available for custom lyric check.");
			}
		};

		// Initial load
		loadCustomLyrics();

		// Listen for song changes
		ViewMaid.Give(SongChanged.Connect(() => {
			loadCustomLyrics();
			// Potentially trigger re-render of views if they are active
			// This is important if a view is already open and song changes.
			// For now, new views get the new lyrics. Existing views might not update unless they also listen to SongChanged.
			// Or, we could explicitly update ActivePageView if it exists.
			if (ActivePageView && typeof (ActivePageView as any).updateLyrics === 'function') {
				// This assumes views will have an updateLyrics method, which they don't yet.
				// (ActivePageView as any).updateLyrics(activeCustomTransformedLyrics);
			}
			// Similarly for CardView, if a direct reference is kept or an event system is used.
		}));
	}
)
.then( // Playbar Icons
	() => {
		// Store references for our buttons
		let lyricsButton: Spicetify.Playbar.Button
		let fullscreenButton: Spicetify.Playbar.Button

		// Lyrics Button
		{
			lyricsButton = new SpotifyPlaybar.Button(
				"Lyrics Page",
				Icons.LyricsPage,
				() => {
					if (ActivePageView === undefined) {
						SpotifyHistory.push(`/BeautifulLyrics/${checkKey("shift") ? "Fullscreen" : "Page"}`)
					} else {
						ActivePageView.Close()
						ActivePageView = undefined
					}
				},
				false, false
			)
			ViewMaid.Give(() => lyricsButton.deregister())

			{
				const CheckForSongExistence = () => {
					if (Song === undefined) {
						lyricsButton.deregister()
					} else {
						lyricsButton.register()
					}
				}
				ViewMaid.Give(SongChanged.Connect(CheckForSongExistence))
				ViewMaid.Give(Timeout(1, CheckForSongExistence))
			}

			SetPlaybarPageIconActiveState = (isActive: boolean) => lyricsButton.active = isActive
		}

		// Fullscreen Button
		{
			fullscreenButton = new SpotifyPlaybar.Button(
				"Enter Fullscreen",
				Icons.FullscreenOpen,
				() => SpotifyHistory.push(
					{
						pathname: "/BeautifulLyrics/Fullscreen",
						search: "",
						hash: "",
						state: {
							FromPlaybar: true
						}
					}
				),
				false,
				false
			)
			ViewMaid.Give(() => fullscreenButton.deregister())
	
			// Mark our fullscreen-button and force it to the right
			fullscreenButton.element.style.order = "100000"
			fullscreenButton.element.id = "BeautifulLyricsFullscreenButton"
		}

		// Handle removing our buttons if we DON'T have a song
		{
			const CheckForSongExistence = () => {
				if (Song === undefined) {
					lyricsButton.deregister()
					fullscreenButton.deregister()
				} else {
					lyricsButton.register()
					fullscreenButton.register()
				}
			}
			ViewMaid.Give(SongChanged.Connect(CheckForSongExistence))
			ViewMaid.Give(Timeout(1, CheckForSongExistence))
		}
	}
)
.then( // Right Side-bar/Card View
	() => {
		// Store our state
		let sidebar: HTMLDivElement, contentsContainer: (HTMLDivElement | undefined)
		const contentsContainerMaid = ViewMaid.Give(new Maid())
		const nowPlayingViewMaid = ViewMaid.Give(new Maid())

		// Each check method
		const CheckForNowPlaying = () => {
			// Clean-up when we are called
			nowPlayingViewMaid.CleanUp()

			// Now check to see if we have our card anchor
			const cardAnchor = contentsContainer!.querySelector<HTMLDivElement>(CardInsertAnchor)
			if (cardAnchor === null) {
				return
			}

			// Immediately add our class to the top container
			const backgroundMaid = nowPlayingViewMaid.Give(new Maid())
			let backgroundApplied = false
			const CheckDynamicBackground = () => {
				if (SpotifyHistory.location.pathname === "/BeautifulLyrics/Fullscreen") {
					backgroundMaid.CleanUp()
					backgroundApplied = false
				} else if (backgroundApplied === false) {
					backgroundApplied = true
					ApplyDynamicBackground(contentsContainer!, backgroundMaid)
				}
			}
			CheckDynamicBackground()
			nowPlayingViewMaid.Give(SpotifyHistory.listen(CheckDynamicBackground))

			// Now we can monitor for Spotifys lyrics card (and hide it)
			const cardContainer = cardAnchor.parentElement!
			const CheckForLyricsCard = () => {
				const cardView = cardContainer.querySelector<HTMLDivElement>(SpotifyCardViewQuery)
				if (cardView !== null) {
					cardView.style.display = "none"
				}
			}
			CheckForLyricsCard()
			const containerObserver = nowPlayingViewMaid.Give(new MutationObserver(CheckForLyricsCard))
			containerObserver.observe(cardContainer, { childList: true })

			// Also handle our own card
			const ShouldCreateCard = () => {
				if (
					SpotifyHistory.location.pathname.startsWith("/BeautifulLyrics") ||
					Song === undefined ||
					// If no custom lyrics, AND default lyrics are loaded but undefined (error state for default)
					(!activeCustomTransformedLyrics && HaveSongLyricsLoaded && SongLyrics === undefined)
				) {
					nowPlayingViewMaid.Clean("Card");
					return;
					// If no custom lyrics, AND default lyrics are still loading
				} else if (!activeCustomTransformedLyrics && !HaveSongLyricsLoaded) {
					const card = nowPlayingViewMaid.Give(CreateElement<HTMLDivElement>(LoadingLyricsCard), "Card");
					cardAnchor.after(card);
					return;
				}

				// Pass activeCustomTransformedLyrics to CardView
				// If we have activeCustomTransformedLyrics, we can render immediately.
				// Otherwise, SongLyrics must be available (implicit from conditions above).
				nowPlayingViewMaid.Give(new CardView(cardAnchor, activeCustomTransformedLyrics), "Card");
			}
			ShouldCreateCard()
			// Re-evaluate card creation if custom lyrics become available/unavailable (via SongChanged -> loadCustomLyrics),
			// or if normal lyrics load, or navigation changes.
			nowPlayingViewMaid.GiveItems(
				SongLyricsLoaded.Connect(ShouldCreateCard), // For when normal lyrics load
				SongChanged.Connect(ShouldCreateCard),      // For when song changes (custom lyrics might appear/disappear)
				SpotifyHistory.listen(ShouldCreateCard)   // For navigation changes
			)
		}
		const DeferCheckForNowPlaying = () => ViewMaid.Give(Defer(CheckForNowPlaying), "CheckForNowPlaying")

		const CheckForContentsContainer = () => {
			// Clean-up when we are called
			contentsContainerMaid.CleanUp()
			nowPlayingViewMaid.CleanUp()

			// Determine if our contents-container even exists
			contentsContainer = (sidebar.querySelector<HTMLDivElement>(ContentsContainer) ?? undefined)
			if (contentsContainer === undefined) {
				return
			}

			// Check if there's anything we can do immediately
			CheckForNowPlaying()

			// Handle when we should check
			contentsContainerMaid.Give(SongChanged.Connect(DeferCheckForNowPlaying))

		}
		const DeferCheckForContentsContainer = () => ViewMaid.Give(Defer(CheckForContentsContainer), "CheckForContentsContainer")

		const CheckForSidebar = () => {
			// Check for our sidebar existing
			const newSidebar = document.querySelector<HTMLDivElement>(RightSidebar)
			if (newSidebar === null) {
				ViewMaid.Give(Defer(CheckForSidebar), "CheckForSidebar")
				return
			}
			sidebar = newSidebar

			// Create our observer
			const sidebarChildObserver = ViewMaid.Give(new MutationObserver(DeferCheckForContentsContainer))

			// Check if there's anything we can do immediately
			CheckForContentsContainer()

			// Observe our elements
			sidebarChildObserver.observe(sidebar, { childList: true })
			for (const element of sidebar.children) {
				if (
					(element instanceof HTMLDivElement)
					&& ((element.children.length === 0) || (element.querySelector(ContentsContainer) !== null))
				) {
					sidebarChildObserver.observe(element, { childList: true })
				}
			}
		}
		CheckForSidebar()
	}
)
.then( // Location Handler
	() => {
		let pageContainer: HTMLDivElement
		let pageContainerIsLegacy = false

		const HandleSpotifyLocation = (location: HistoryLocation) => {
			// Remove our previous page-view
			ViewMaid.Clean("PageView")
	
			// Now handle our page-view
			if (location.pathname === "/BeautifulLyrics/Page") {
				SetPlaybarPageIconActiveState(true)
				// Pass activeCustomTransformedLyrics to ContainedPageView
				ActivePageView = ViewMaid.Give(new ContainedPageView(pageContainer, pageContainerIsLegacy, activeCustomTransformedLyrics), "PageView")
				ActivePageView.Closed.Connect(() => SetPlaybarPageIconActiveState(false))
				ActivePageView.Closed.Connect(() => ActivePageView = undefined)
			} else if (location.pathname === "/BeautifulLyrics/Fullscreen") {
				// Pass activeCustomTransformedLyrics to FullscreenPageView
				ActivePageView = ViewMaid.Give(new FullscreenPageView(location.state.FromPlaybar, activeCustomTransformedLyrics), "PageView")
				ActivePageView.Closed.Connect(() => ActivePageView = undefined)
			}
		}

		// Wait until we find our MainPageContainer
		const SearchDOM = () => {
			// Go through each container possibility
			let possibleContainer = document.querySelector<HTMLDivElement>(CurrentMainPage) ?? undefined
			let possiblyLegacy = false
			if (possibleContainer === undefined) {
				possibleContainer = document.querySelector<HTMLDivElement>(LegacyMainPage) ?? undefined
				possiblyLegacy = true
			}

			// If we still have no container we need to wait again for it
			if (possibleContainer === undefined) {
				ViewMaid.Give(Defer(SearchDOM))
			} else {
				pageContainer = possibleContainer
				pageContainerIsLegacy = possiblyLegacy
				HandleSpotifyLocation(SpotifyHistory.location)
				ViewMaid.Give(SpotifyHistory.listen(HandleSpotifyLocation))
			}
		}
		SearchDOM()
	}
)
.then( // Spotify Fullscreen Button Removal
	() => {
		const SearchDOM = () => {
			const controlsContainer = document.querySelector<HTMLButtonElement>(".main-nowPlayingBar-extraControls")
			if (controlsContainer === null) {
				ViewMaid.Give(Defer(SearchDOM))
			} else {
				for (const element of controlsContainer.children) {
					if (
						(element.attributes.getNamedItem("data-testid")?.value === "fullscreen-mode-button")
						&& (element.id !== "BeautifulLyricsFullscreenButton")
					) {
						(element as HTMLElement).style.display = "none"
					}
				}
			}
		}
		SearchDOM()
	}
)