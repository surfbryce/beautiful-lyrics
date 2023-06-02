// Packages
import {Maid} from '../../Packages/Maid'

// Initial Services
import {GlobalMaid, IsSpicetifyLoaded, SpicetifyLoaded} from './Services/Session'
import {GetCoverArt, CoverArtUpdated, Start as StartCoverArt} from './Services/CoverArt'
import {Start as StartAutoUpdater} from './Services/AutoUpdater'
import {Start as StartSongs} from './Services/Songs'

// Stylings
import './Stylings/main.scss'

// Live Background Management
let CheckForLiveBackgrounds: (() => void)

{
	// Types
	type BackgroundContainer = ("VanillaFullScreen" | "VanillaSideCard" | "LyricsPlusFullScreen")

	// Define our queries for each background-container
	const BackgroundQuerys: Map<BackgroundContainer, string> = new Map()
	BackgroundQuerys.set('VanillaFullScreen', '#main:has(.os-content .lyrics-lyrics-container) .under-main-view')
	BackgroundQuerys.set('VanillaSideCard', 'aside:has(.main-nowPlayingView-section) .os-padding')
	BackgroundQuerys.set(
		'LyricsPlusFullScreen',
		'#main:has(.os-content .lyrics-lyricsContainer-LyricsContainer) .under-main-view'
	)

	// Create our maid to manage our background-containers
	const BackgroundMaids = GlobalMaid.Give(new Maid(), "LiveBackgrounds")

	// Handle managing our background-containers
	const ManageLiveBackground = (containerType: BackgroundContainer, container: HTMLDivElement) => {
		// Create our maid
		const backgroundMaid = BackgroundMaids.Give(new Maid(), containerType)

		// Create our container and child-images
		const backgroundContainer = backgroundMaid.Give(document.createElement('div'))
		backgroundContainer.classList.add('lyrics-background-container')

		const [
			colorImage,
			backImage,
			backCenterImage
		] = backgroundMaid.GiveItems(
			document.createElement('img'), document.createElement('img'), document.createElement('img')
		)
		colorImage.classList.add('lyrics-background-color'),
		backImage.classList.add('lyrics-background-back'),
		backCenterImage.classList.add('lyrics-background-back-center')
		backgroundContainer.appendChild(colorImage),
		backgroundContainer.appendChild(backImage),
		backgroundContainer.appendChild(backCenterImage)

		// Now handle updating the images themselves
		const Update = () => {
			const source = (GetCoverArt()?.Default ?? '')

			colorImage.src = source
			backImage.src = source
			backCenterImage.src = source
		}

		// Immediately update ourselves and handle updating automatically
		backgroundMaid.Give(CoverArtUpdated.Connect(Update))
		Update()

		// Handle applying our background-class
		const CheckClass = () => {
			if (container.classList.contains('lyrics-background')) {
				return
			}

			container.classList.add('lyrics-background')
		}

		// Immediately check our class and watch for changes
		CheckClass()

		const observer = backgroundMaid.Give(new MutationObserver(CheckClass))
		observer.observe(
			container,
			{attributes: true, attributeFilter: ['class'], childList: false, subtree: false}
		)

		// Add our container to the background
		container.prepend(backgroundContainer)

		// Handle removing our class
		backgroundMaid.Give(() => container.classList.remove('lyrics-background'))
	}

	// Handle checking for background existence updates
	CheckForLiveBackgrounds = () => {
		// Go through each background-container and check if it exists
		for(const [containerType, query] of BackgroundQuerys) {
			// Grab our container
			const container = document.body.querySelector(query)

			// Make sure our container has changed existence state
			const exists = BackgroundMaids.Has(containerType)
			if (exists ? (container !== null) : (container === null)) {
				continue
			}

			// If it exists then manage it - otherwise - just clean out our Maid item
			if (container === null) {
				BackgroundMaids.Clean(containerType)
			} else {
				ManageLiveBackground(containerType, (container as HTMLDivElement))
			}
		}
	}
}

// Lyrics Management (Soon to be phased out for custom lyric system)
let CheckForLyricContainers: (() => void)
{
	// Types
	type LyricState = ("Unsynced" | "Unsung" | "Active" | "Sung")
	type LyricContainer = ("VanillaFullScreen" | "VanillaSideCard")
	type LyricsData = {
		LayoutOrder: number,
		State: LyricState,
		IsFontSizeObserver: boolean
	}

	// Behavior Constants
	const DistanceToMaximumBlur = 4 // Any lyrics beyond this unit of distance away will be at full-blur
	const ActiveLyricSizeIncrease = 0.5 // This is measured in rem Units as all Spotify fonts are rendered with them

	// Create our maid
	const LyricMaids = GlobalMaid.Give(new Maid(), "Lyrics")

	// Define our queries for container
	const ContainerQuerys: Map<LyricContainer, string> = new Map()
	ContainerQuerys.set('VanillaFullScreen', '.lyrics-lyrics-contentWrapper')
	ContainerQuerys.set('VanillaSideCard', '.main-nowPlayingView-lyricsContent')

	// Lyric-State Classes
	const LyricClass = 'lyrics-lyricsContent-lyric'
	const UnsyncedLyricClass = 'lyrics-lyricsContent-unsynced'
	const HighlightedLyricClass = 'lyrics-lyricsContent-highlight'
	const ActiveLyricClass = 'lyrics-lyricsContent-active'

	// Font Method
	const GetLyricFontSizeInRem = (lyric: HTMLDivElement): number => {
		/*
			The idea here is that we can get the font-size of our text in pixels.
	
			We know that the font-size in CSS is in rem-units. We also know that the documents
			font-size is equievelant to 1rem. So what we can then do is get the computed styles
			for both elements and divide their font-sizes to get the font-size in rem-units.
		*/
		const style = getComputedStyle(lyric), rootStyle = getComputedStyle(document.documentElement)
		const lyricFontSizeInPixels = parseFloat(style.fontSize), rootFontSizeInPixels = parseFloat(rootStyle.fontSize)
	
		return(lyricFontSizeInPixels / rootFontSizeInPixels)
	}

	// Now manage our lyric-containers
	const ManageLyricContainer = (containerType: LyricContainer, container: HTMLDivElement) => {
		// Create our maid
		const containerMaid = LyricMaids.Give(new Maid(), containerType)

		// Create our storage for each lyric
		const lyrics: Map<
			HTMLDivElement,
			LyricsData
		> = new Map()

		// Handle updating our lyrics
		let fontSizeInRem: number = 0

		const UpdateFontSize = (lyric: HTMLDivElement, data: LyricsData) => {
			lyric.style.fontSize = (
				(data.State == "Active") ? `${fontSizeInRem + ActiveLyricSizeIncrease}rem`
				: ''
			)
		}

		const Update = () => {
			// Go through our lyrics and update their states (and also gather our active layout-order)
			let activeLayoutOrder: (number | undefined)
			for(const [lyric, data] of lyrics) {
				const classes = lyric.classList

				if (classes.contains(ActiveLyricClass)) {
					data.State = "Active"
					activeLayoutOrder = data.LayoutOrder
				} else if (classes.contains(UnsyncedLyricClass)) {
					data.State = "Unsynced"
				} else if (classes.contains(HighlightedLyricClass)) {
					data.State = "Sung"
				} else {
					data.State = "Unsung"
				}
			}

			// Go through our lyrics and handle updating their appearance
			for(const [lyric, data] of lyrics) {
				// Determine if we should be considered active
				const isActive = (data.State === "Active")
				const isFocused = (isActive || (data.State === "Unsynced"))

				// Determine our blur
				let blur: number
				if (isFocused) {
					blur = 0
				} else if (activeLayoutOrder === undefined) { // Means that all lyrics have been passed
					blur = DistanceToMaximumBlur
				} else {
					const distance = Math.min(Math.abs(data.LayoutOrder - activeLayoutOrder), DistanceToMaximumBlur)

					blur = distance
				}

				// Determine our text-color
				let textColor = (
					isFocused ? "var(--lyrics-color-active)"
					: (data.State === "Sung") ? "var(--lyrics-color-passed)"
					: "var(--lyrics-color-inactive)"
				)

				// Give ourselves the lyric class
				if (lyric.classList.contains('lyric') === false) {
					lyric.classList.add('lyric')
				}

				// Update our font-size
				UpdateFontSize(lyric, data)

				// Update our lyric appearance according to our blur
				lyric.style.color = "transparent"
				lyric.style.textShadow = `0 0 ${blur}px ${textColor}`
			}
		}

		// Handle finding our lyrics
		let observer: MutationObserver

		{
			// Helper-Method to store Lyrics
			const StoreLyric = (lyric: HTMLDivElement) => {
				// Create our maid
				const lyricMaid = containerMaid.Give(new Maid(), lyric)

				// Find our layout-order
				const layoutOrder = Array.from(container.children).indexOf(lyric)

				// Create our observer to watch for class-changes
				const mutationObserver = lyricMaid.Give(new MutationObserver(Update))
				mutationObserver.observe(lyric, {attributes: true, attributeFilter: ['class'], childList: false, subtree: false})

				// Create our observer to watch for size-changes
				let isFontSizeObserver = false

				if ((containerMaid.Has("FontResizeObserver") === false) && (lyric.innerText.length === 0)) {
					// Create our resize-observer
					const resizeObserver = containerMaid.Give(
						new ResizeObserver(
							_ => {
								fontSizeInRem = GetLyricFontSizeInRem(lyric)
								
								for(const [lyricToUpdate, data] of lyrics) {
									UpdateFontSize(lyricToUpdate, data)
								}
							}
						),
						"FontResizeObserver"
					)
					resizeObserver.observe(lyric)

					// When we are destroyed handle disconnecting our observer (so we can make a new one)
					lyricMaid.Give(() => containerMaid.Clean("FontResizeObserver"))

					// Mark that we are a font-size observer
					isFontSizeObserver = true
				}

				// Store our lyric
				lyrics.set(
					lyric, {
						LayoutOrder: layoutOrder,
						State: "Unsung",
						IsFontSizeObserver: isFontSizeObserver
					}
				)

				// Force-update
				Update()
			}

			const CheckNode = (node: Node) => {
				if (
					(node instanceof HTMLDivElement)
					&& node.classList.contains(LyricClass)
				) {
					StoreLyric(node)
				}
			}

			// Handle lyric-child changes
			observer = containerMaid.Give(
				new MutationObserver(
					(mutationRecords) => {
						for(const mutationRecord of mutationRecords) {
							if (mutationRecord.type !== 'childList') {
								continue
							}
	
							for(const node of mutationRecord.removedNodes) {
								if (node instanceof HTMLDivElement) {
									lyrics.delete(node)
									containerMaid.Clean(node)
								}
							}

							for(const node of mutationRecord.addedNodes) {
								CheckNode(node)
							}
						}
					}
				)
			)
			observer.observe(container, {attributes: false, childList: true, subtree: false})

			// Grab our initial lyrics
			for(const node of container.childNodes) {
				CheckNode(node)
			}
		}
	}

	// Handle checking for existence changes in our lyric-containers
	CheckForLyricContainers = () => {
		// Go through each background-container and check if it exists
		for(const [containerType, query] of ContainerQuerys) {
			// Grab our container
			const container = document.body.querySelector(query)

			// Make sure our container has changed existence state
			const exists = LyricMaids.Has(containerType)
			if (exists ? (container !== null) : (container === null)) {
				continue
			}

			// If it exists then manage it - otherwise - just clean out our Maid item
			if (container === null) {
				LyricMaids.Clean(containerType)
			} else {
				ManageLyricContainer(containerType, (container as HTMLDivElement))
			}
		}
	}
}

// Main watcher
async function main() {
	// Wait until we're loaded
	await new Promise<void>(
		resolve => {
			if (IsSpicetifyLoaded()) {
				resolve()
			} else {
				SpicetifyLoaded.Connect(resolve)
			}
		}
	)

	// Start our services
	StartAutoUpdater()
	StartSongs()
	StartCoverArt()

	/*
		Now watch for DOM changes to determine if we need to update.

		We don't store a reference to the observer because we expect it to run for the entire duration that
		Spotify is open for. The reason is because any of these elements can be removed/added dynamically
		and we could have larger cover-art elements come in at any time as well. We want to use those
		larger cover-art versions since they have higher-resolution image. It also comes with the benefit
		that hot-reloading what elements we are using is easier.
	*/
	const observer = GlobalMaid.Give(
		new MutationObserver(
			() => {
				CheckForLiveBackgrounds()
				CheckForLyricContainers()
			}
		)
	)
	
	observer.observe(
		document.body,
		{attributes: false, childList: true, subtree: true}
	)

	// Check for any initial elements
	CheckForLiveBackgrounds()
	CheckForLyricContainers()

	/*
		For anybody coming across this - I will always be clear and incredibly transparent about what I do
		with this information.

		First off - in the release this comes out in I am flat out stating that I implemented this feature.
		I'm not going to hide anything.
		
		Additionally, I am using CloudFlare - which has an analytics services that doesn't do any
		fingerprinting, cookie tracking, or anything nasty. It is purely based off the request made
		to their analytics-api.

		I am purely using this to determine how many people are actually using my extension. My reasoning
		for this is because when I first published the 2.5.0 stepping-stone release with the lyrics backend
		I thought I had about maybe 100 people using the extension (since I had 44 stars). However, I was
		gravely mistaken. I was recieving almost 2-3 requests a second - which is fine, I can handle that -
		but I had no idea I had that many users. So, it's important to know how many people are actively
		using my extension (as in actively, I mean general figure).

		I apologize to anyone who may think this is invasive - but I am not doing anything with this data
		and never plan to. I can't even store it. If you have an issue please contact me through the
		Spicetify discord - my username is @socalifornian.
	*/
	{
		const tracker = document.createElement('iframe')
		tracker.src = "https://track.beautiful-lyrics.socalifornian.live/"
		tracker.style.display = 'none'
		document.body.appendChild(tracker)
	}
}

export default main;