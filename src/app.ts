// Packages
import { Maid } from '../../../Packages/Maid'
import { Timeout } from '../../../Packages/Scheduler'

// Initial Services
import { GlobalMaid, IsSpicetifyLoaded, SpicetifyLoaded } from './Services/Session'
import {
	CoverArtContainer,
	CoverArtUpdated, Start as StartCoverArt, GetCoverArt,
	GetBlurredCoverArt, GenerateBlurredCoverArt
} from './Services/CoverArt'
import { Start as StartAutoUpdater } from './Services/AutoUpdater'
import { Cache } from './Services/Cache'
import Player from './Services/Player'
import StartLyricsView from "./Modules/LyricsViews"

// Stylings
import './Stylings/main.scss'

// Live Background Management
let CheckForLiveBackgrounds: (() => void)

{
	// Version Switching
	const UsePreBlurredApproach = false

	// Define our queries for each background-container
	const BackgroundQuerys: Map<CoverArtContainer, string> = new Map()
	BackgroundQuerys.set('Page', '.BeautifulLyricsPage')
	BackgroundQuerys.set('SidePanel', '.Root__right-sidebar:has(.main-nowPlayingView-section) .os-padding')

	// Define our images to create
	const BackgroundSizeScales = [2, 3]
	const BackgroundElements = ["lyrics-background-color", "lyrics-background-back", "lyrics-background-back-center"]
	const ElementSizeScaleIndices = [0, 0, 1]
	const BackgroundContainerResizeStabilizationTime = 0.25

	// Create our maid to manage our background-containers
	const BackgroundMaids = GlobalMaid.Give(new Maid(), "LiveBackgrounds")

	// Handle managing our background-containers
	const ManageLiveBackground = (containerType: CoverArtContainer, container: HTMLDivElement) => {
		// Create our maid
		const backgroundMaid = BackgroundMaids.Give(new Maid(), containerType)

		// Create our container and child-images
		const backgroundContainer = backgroundMaid.Give(document.createElement('div'))
		backgroundContainer.classList.add('lyrics-background-container')

		// Create all our elements
		const elements: HTMLImageElement[] = []
		for (const elementClass of BackgroundElements) {
			// Create our image
			const image = backgroundMaid.Give(document.createElement('img'))
			image.classList.add(elementClass)
			backgroundContainer.appendChild(image)

			// Now store our element
			elements.push(image)
		}

		// Handle version-switching
		let UpdateCoverArt: (() => void)

		if (UsePreBlurredApproach) {
			// Store our current sizes
			let currentSizes: number[] = []

			// Now handle updating our cover-art
			const SetCoverArt = (blurredCoverArt?: Map<number, string>) => {
				for (const [index, element] of elements.entries()) {
					element.src = (
						blurredCoverArt
							? (blurredCoverArt.get(currentSizes[ElementSizeScaleIndices[index]]) ?? 'MISSING')
							: ''
					)
				}
			}

			UpdateCoverArt = () => {
				// Grab our cover-art
				const coverArt = GetCoverArt()
				if (coverArt === undefined) {
					return SetCoverArt()
				}

				for(const element of elements) {
					element.src = coverArt.Default
				}

				// Now determine if we already have this or not
				const cachedCoverArtSizes = GetBlurredCoverArt(coverArt, containerType, currentSizes)

				// If we have it we can then update immediately, otherwise we need to generate it
				if (cachedCoverArtSizes === undefined) {
					GenerateBlurredCoverArt(coverArt, containerType, currentSizes)
						.then(
							(coverArtSizes) => {
								// Make sure we are seeing the same cover-art
								if (coverArt === GetCoverArt()) {
									SetCoverArt(coverArtSizes)
								}
							}
						)
				} else {
					SetCoverArt(cachedCoverArtSizes)
				}
			}

			// Now handle updating our sizes
			{
				const UpdateSizes = () => {
					// Calculate our existing width
					const backgroundContainerWidth = backgroundContainer.offsetWidth
					
					// Calculate our new sizes
					const newSizes = []
					for(const scale of BackgroundSizeScales) {
						newSizes.push(Math.floor(backgroundContainerWidth * scale))
					}

					// Now set our sizes
					currentSizes = newSizes

					// Trigger cover-art update
					UpdateCoverArt()
				}

				// Watch for size-updates
				const observer = backgroundMaid.Give(
					new ResizeObserver(
						() => {
							// Set a timeout to update our sizes (once we stabilize it will properly run)
							backgroundMaid.Give(
								Timeout(BackgroundContainerResizeStabilizationTime, UpdateSizes),
								"ContainerResize"
							)
						}
					)
				)
				observer.observe(backgroundContainer)

				// Immediately update our sizes
				UpdateSizes()
			}
		} else {
			UpdateCoverArt = () => {
				const coverArt = GetCoverArt()?.Default ?? ''

				for (const element of elements) {
					element.src = coverArt
				}
			}
		}

		// Immediately update ourselves and handle updating automatically
		backgroundMaid.Give(CoverArtUpdated.Connect(UpdateCoverArt))
		UpdateCoverArt()

		// Handle applying our background-class (sometimes it can be removed so we need to readd it again)
		{
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
				{ attributes: true, attributeFilter: ['class'], childList: false, subtree: false }
			)
		}

		// Add our container to the background
		container.prepend(backgroundContainer)

		// Handle removing our class
		backgroundMaid.Give(() => container.classList.remove('lyrics-background'))
	}

	// Handle checking for background existence updates
	const ExistingContainers: Map<CoverArtContainer, Element> = new Map()
	CheckForLiveBackgrounds = () => {
		// Go through each background-container and check if it exists
		for (const [containerType, query] of BackgroundQuerys) {
			// Grab our container
			const container = document.body.querySelector(query)

			// Make sure our container has changed existence state
			if (ExistingContainers.get(containerType) === container) {
				continue
			}

			// If it exists then manage it - otherwise - just clean out our Maid item
			if (container === null) {
				ExistingContainers.delete(containerType)
				BackgroundMaids.Clean(containerType)
			} else {
				ExistingContainers.set(containerType, container)
				ManageLiveBackground(containerType, (container as HTMLDivElement))
			}
		}
	}
}

// Main watcher
{
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
	StartCoverArt()
	Player.Start()
	StartLyricsView()

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
				//CheckForLyricContainers()
			}
		)
	)

	observer.observe(
		document.body,
		{ attributes: false, childList: true, subtree: true }
	)

	// Check for any initial elements
	CheckForLiveBackgrounds()
	//CheckForLyricContainers()

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
		const UpdateAnalytics = () => {
			// Remove our existing analytics (always called after we register ourselves analytically)
			GlobalMaid.Clean("Analytics")

			// Grab our current-date and when we last visited
			const cachedAnalytics = Cache.GetItem("Analytics")
			const lastVisitedAt = cachedAnalytics.LastVisitedAt
			const lastVisitedAtDate = ((lastVisitedAt !== undefined) ? new Date(lastVisitedAt) : undefined)
			const currentDate = new Date()

			// Set our date to the beginning of the day
			currentDate.setHours(0, 0, 0, 0)

			// Check if we're on a different day or not
			const dateStartTime = currentDate.getTime()
			if (lastVisitedAtDate?.getTime() !== dateStartTime) {
				// Update our cache
				cachedAnalytics.LastVisitedAt = dateStartTime
				Cache.SaveItemChanges("Analytics")

				// Now insert our analytics
				const tracker = GlobalMaid.Give(document.createElement('iframe'), "Analytics")
				tracker.src = "https://track.beautiful-lyrics.socalifornian.live/"
				tracker.style.display = 'none'
				document.body.appendChild(tracker)
			}

			// Now check again soon
			GlobalMaid.Give(Timeout(60, UpdateAnalytics))
		}

		UpdateAnalytics()
	}
}