// Packages
import { Maid } from "../../../../Packages/Maid"
import { Signal } from "../../../../Packages/Signal"

// Modules
import { GlobalMaid, HistoryLocation, SpotifyHistory } from "../Services/Session"
import Player from "../Services/Player"

// Components
import CardView from "./LyricsViews/Components/CardView"
import PageView from "./LyricsViews/Components/PageView"
import { Song } from "../Services/Player/Song"

// CSS
import "../Stylings/Views.scss"

// Create our maid
const ViewMaid = GlobalMaid.Give(new Maid())

// Behavior Constants
const InsertCardAfterQuery = "aside .main-nowPlayingView-nowPlayingWidget"
const SpotifyCardViewQuery = "aside .main-nowPlayingView-section:not(:is(#BeautifulLyrics-CardView)):has(.main-nowPlayingView-lyricsTitle)"

// Main method
export default () => {
	// Also store our potential page-view
	let ActivePageView: (PageView | undefined)

	// Handle our right-sidebar
	let InsertCardAfter: (HTMLDivElement | undefined)
	const InsertCardAfterChanged = new Signal<() => void>()
	const DetectSideBarChanges = () => {
		// Grab our elements
		const insertAfter = (document.querySelector<HTMLDivElement>(InsertCardAfterQuery) || undefined) 
		const spotifyCardView = (document.querySelector<HTMLDivElement>(SpotifyCardViewQuery) || undefined)

		// Determine if we changed our insert-after element
		if (insertAfter !== InsertCardAfter) {
			InsertCardAfter = insertAfter
			InsertCardAfterChanged.Fire()
		}

		// If we have a spotify card-view we need to hide it
		if (spotifyCardView !== undefined) {
			spotifyCardView.style.display = "none"
		}
	}

	// Handle our card-view
	const ShouldHandleCardView = (
		() => {
			const HandleCardView = (song: Song) => {
				// Now grab our details
				song.GetDetails()
				.then(
					details => {
						// No details means no lyrics
						if (details === undefined) {
							return
						}
	
						// No lyrics means no lyrics! (DUH!)
						if (details.Lyrics === undefined) {
							return
						}
	
						// Make sure we have something to insert after
						if (InsertCardAfter === undefined) {
							return
						}
	
						// If we already have it don't do anything
						if (ViewMaid.Has("CardView")) {
							return
						}
	
						// Now create our card-view
						ViewMaid.Give(
							new CardView(song, details.Lyrics, InsertCardAfter),
							"CardView"
						)
					}
				)
			}
	
			const ShouldHandleCardView = () => {
				// First make sure that we aren't in any other view
				if (SpotifyHistory.location.pathname.startsWith("/BeautifulLyrics")) {
					ViewMaid.Clean("CardView")
					return
				}
	
				// Now check if we have a song
				const song = Player.GetSong()
				if (song === undefined) {
					return
				}
	
				// Now handle our card-view
				HandleCardView(song)
			}

			InsertCardAfterChanged.Connect(ShouldHandleCardView)

			return ShouldHandleCardView
		}
	)()

	// Handle our page-view
	const HandlePageView = () => {
		// If we don't have a page-view don't do anything
		if (ActivePageView === undefined) {
			return
		}

		// Set our song
		ActivePageView.SetSong(Player.GetSong())
	}

	// Now handle songs changing
	{
		// Handle our current-song
		const HandleSong = (song?: Song) => {
			// Immediately remove our card-view
			ViewMaid.Clean("CardView")

			// Now handle our card-view
			ShouldHandleCardView()

			// Now handle our page-view
			HandlePageView()
		}

		// Handle our song changing
		Player.SongChanged.Connect(HandleSong)

		// Immediately handle our current-song
		HandleSong(Player.GetSong())
	}

	// Handle our Spotify Page Location changing
	let mainPage: HTMLDivElement
	const HandleSpotifyLocation = (location: HistoryLocation) => {
		// Handle our card-view immediately
		ShouldHandleCardView()

		// Remove our previous page-view
		ViewMaid.Clean("PageView")

		// Now handle our page-view
		if (location.pathname === "/BeautifulLyrics/Main") {
			ActivePageView = ViewMaid.Give(
				new PageView(mainPage),
				"PageView"
			)
			HandlePageView()
		} else if (location.pathname === "/BeautifulLyrics/Cinema") {
			ActivePageView = ViewMaid.Give(
				new PageView(mainPage, true),
				"PageView"
			)
			HandlePageView()
		} else {
			ActivePageView = undefined
		}
	}

	// Handle DOM tracking
	{
		// Create our observer
		const observer = ViewMaid.Give(
			new MutationObserver(
				() => {
					DetectSideBarChanges()

					// Determine if we have our main-page yet
					if (mainPage === undefined) {
						const potentialMainPage = document.querySelector<HTMLDivElement>(".main-view-container .os-content")

						if (potentialMainPage !== null) {
							mainPage = potentialMainPage
							ViewMaid.Give(SpotifyHistory.listen(HandleSpotifyLocation))
							HandleSpotifyLocation(SpotifyHistory.location)
						}
					}
				}
			)
		)

		// Start observing
		observer.observe(document.body, { childList: true, subtree: true })
	}
}