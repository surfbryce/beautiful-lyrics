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

// Wait for Spotify to start our processing
OnSpotifyReady
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
					// We shouldn't be rendering the card-view when we have another of our views open
					SpotifyHistory.location.pathname.startsWith("/BeautifulLyrics")
					|| (Song === undefined)
					|| (HaveSongLyricsLoaded && (SongLyrics === undefined))
				) {
					nowPlayingViewMaid.Clean("Card")
					return
				} else if (HaveSongLyricsLoaded === false) { // Render a template if we're still loading our lyrics
					const card = nowPlayingViewMaid.Give(CreateElement<HTMLDivElement>(LoadingLyricsCard), "Card")
					cardAnchor.after(card)

					return
				}

				nowPlayingViewMaid.Give(new CardView(cardAnchor), "Card")
			}
			ShouldCreateCard()
			nowPlayingViewMaid.GiveItems(
				SongLyricsLoaded.Connect(ShouldCreateCard),
				SpotifyHistory.listen(ShouldCreateCard)
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
				ActivePageView = ViewMaid.Give(new ContainedPageView(pageContainer, pageContainerIsLegacy), "PageView")
				ActivePageView.Closed.Connect(() => SetPlaybarPageIconActiveState(false))
				ActivePageView.Closed.Connect(() => ActivePageView = undefined)
			} else if (location.pathname === "/BeautifulLyrics/Fullscreen") {
				ActivePageView = ViewMaid.Give(new FullscreenPageView(location.state.FromPlaybar), "PageView")
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
						(
							element.innerHTML.includes("0v1.018l2.72-2.72a.75.75 0 0 1 1.06 0zm2.94-2.94a.75.75")
							|| element.innerHTML.includes("2H14V4.757a1 1 0 1 1 2 0v1.829l4.293-4.293a1")
							|| element.innerHTML.includes("M6.53 9.47a.75.75 0 0 1 0 1.06l-2.72 2.72h1.018a.75.75")
							|| element.innerHTML.includes("M6.53 9.47a.75.75 0 010 1.06l-2.72 2.72h1.018a.75.75")
						)
						&& (element.id !== "BeautifulLyricsFullscreenButton")
					) {
						element.remove()
					}
				}
			}
		}
		SearchDOM()
	}
)