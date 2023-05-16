import './stylings/main.scss'

/*
	Classes to focus on:
	.lyrics-lyrics-background - This is the background for the big lyrics. It's just a single div no children.
	.main-nowPlayingView-section - This is the parent container for the tiny lyrics. Contains header/lyrics.
	.main-image-loaded - This is the cover-art image that we'll use

	.lyrics-lyricsContent-unsynced - Lyric that can't be synced - if we have this ignore the following classes
	.lyrics-lyricsContent-lyric - Lyric that hasn't been sung (IF the following classes don't exist)
	.lyrics-lyricsContent-highlight - Lyric that has been sung
	.lyrics-lyricsContent-active - Current lyric being sung
*/

// Covert-Art
const CoverArtClass = 'FqmFsMhuF4D0s35Z62Js'//'cover-art-image'
const CoverArtLoadedClass = 'main-image-loaded'

type Callback = (() => void)
let CleanCoverArt: (Callback | undefined)
let CurrentCoverArtElement: (HTMLImageElement | undefined)
let CurrentCovertArtImage: (string | undefined)
const CoverArtUpdates: Map<HTMLElement, Callback> = new Map()

const TryToCleanCoverArt = () => {
	CleanCoverArt?.()
	CleanCoverArt = undefined
}

const CheckIfCoverArtLoaded = (element: HTMLImageElement) => {
	let currentImage: (string | undefined)

	if (element.classList.contains(CoverArtLoadedClass)) {
		currentImage = element.src
	}

	if (currentImage !== CurrentCovertArtImage) {
		CurrentCovertArtImage = currentImage

		for (const update of CoverArtUpdates.values()) {
			update()
		}
	}
}

const WaitForLoadedCoverArt = (element: HTMLImageElement) => {
	// Clear anything we were running beforehand
	TryToCleanCoverArt()

	// Check immediately if we are loaded
	CheckIfCoverArtLoaded(element)

	// Watch for changes
	const observer = new MutationObserver(
		() => {
			CheckIfCoverArtLoaded(element)
		}
	)

	observer.observe(element, {attributes: true, attributeFilter: ['class', 'src'], childList: false, subtree: false})

	// Setup our cleaner
	CleanCoverArt = () => {
		observer.disconnect()
	}
}

const CheckCoverArtElements = () => {
	// Grab our elements
	const elements = (Array.from(document.body.querySelectorAll(`.${CoverArtClass}`)) as [HTMLImageElement])

	// Grab our largest image (physical size will determine this)
	let targetElement: HTMLImageElement | undefined
	let largestArea = 0

	for(const element of elements) { 
		const imageArea = (element.naturalWidth * element.naturalHeight)

		if(imageArea > largestArea) {
			largestArea = imageArea
			targetElement = element
		}
	}

	// Make sure that we actually have cover-art
	if (targetElement === undefined) {
		CurrentCoverArtElement = undefined, CurrentCovertArtImage = undefined
		TryToCleanCoverArt()

		return
	}

	// Now wait for our image to load
	if (targetElement !== CurrentCoverArtElement) {
		CurrentCoverArtElement = targetElement, CurrentCovertArtImage = undefined
		WaitForLoadedCoverArt(targetElement)
	}
}

// Lyric Types
type LyricObject = HTMLElement
type ActiveLyricObjects = {
	NowPlaying: (LyricObject | undefined),
	FullScreen: (LyricObject | undefined)
}
type ActiveLyricCleaners = {
	NowPlaying: (Callback | undefined),
	FullScreen: (Callback | undefined)
}
type LyricContainerType = ("NowPlaying" | "FullScreen")

// Lyric Backgrounds
const FullScreenLyricsBackgroundClass = 'os-viewport .lyrics-lyrics-container'
const NowPlayingLyricsBackgroundClass = 'main-nowPlayingView-sectionHeaderSpacing'

const ActiveLyricsBackgrounds: ActiveLyricObjects = {
	NowPlaying: undefined,
	FullScreen: undefined
}
const ActiveLyricsBackgroundCleaners: ActiveLyricCleaners = {
	NowPlaying: undefined,
	FullScreen: undefined
}

const ManageLyricsBackground = (background: LyricObject): Callback => {
	// Create our container and child-images
	const container = document.createElement('div')
	container.classList.add('lyrics-background-container')

	const colorImage = document.createElement('img'), backImage = document.createElement('img')
	colorImage.classList.add('lyrics-background-color'), backImage.classList.add('lyrics-background-back')
	container.appendChild(colorImage), container.appendChild(backImage)

	// Now handle updating the images themselves
	const Update = () => {
		colorImage.src = CurrentCovertArtImage ?? ''
		backImage.src = CurrentCovertArtImage ?? ''
	}

	// Immediately update ourselves and handle updating automatically
	CoverArtUpdates.set(background, Update)
	Update()

	// Handle applying our background-class
	const CheckClass = () => {
		if (background.classList.contains('lyrics-background')) {
			return
		}

		background.classList.add('lyrics-background')
	}

	// Immediately check our class and watch for changes
	CheckClass()

	const observer = new MutationObserver(CheckClass)
	observer.observe(background, {attributes: true, attributeFilter: ['class'], childList: false, subtree: false})

	// Add our container to the background
	background.prepend(container)
	
	// Return our cleaner for external management
	return () => {
		// Stop observing for class-changes
		observer.disconnect()

		// Destroy our container
		container.remove()

		// Remove our styling
		background.classList.remove('lyrics-background')

		// Remove our update-callback
		CoverArtUpdates.delete(background)
	}
}

const CheckLyricsBackground = (
	background: (LyricObject | null), backgroundType: LyricContainerType
) => {
	// First determine if we need to update our background at all
	if (background === ActiveLyricsBackgrounds[backgroundType]) {
		return
	}

	// Clear our previous background
	ActiveLyricsBackgroundCleaners[backgroundType]?.()
	ActiveLyricsBackgroundCleaners[backgroundType] = undefined

	// Now manage the background
	if (background) {
		ActiveLyricsBackgroundCleaners[backgroundType] = ManageLyricsBackground(background)
	}

	// Update our active
	ActiveLyricsBackgrounds[backgroundType] = (background ?? undefined)
}

const CheckForLyricsBackgrounds = () => {
	// Grab our now-playing and full-screen containers if possible
	const nowPlaying = document.body.querySelector(`.${NowPlayingLyricsBackgroundClass}`) as (HTMLElement | null)
	let fullScreen = document.body.querySelector(`.${FullScreenLyricsBackgroundClass}`) as (HTMLElement | null)
	fullScreen = (fullScreen?.parentElement ?? null) // This gets us to os-content
	fullScreen = (fullScreen?.parentElement ?? null) // Thos gets us to os-viewport

	// Now check them
	CheckLyricsBackground(nowPlaying, "NowPlaying")
	CheckLyricsBackground(fullScreen, "FullScreen")
}

// Lyrics
type LyricState = ("Unsynced" | "Unsung" | "Active" | "Sung")

const FullScreenLyricsContainerClass = 'lyrics-lyrics-contentWrapper'
const NowPlayingLyricsContainerClass = 'main-nowPlayingView-lyricsContent'
const LyricClass = 'lyrics-lyricsContent-lyric'
const UnsyncedLyricClass = 'lyrics-lyricsContent-unsynced'
const HighlightedLyricClass = 'lyrics-lyricsContent-highlight'
const ActiveLyricClass = 'lyrics-lyricsContent-active'

const DistanceToMaximumBlur = 4 // Any lyrics beyond this unit of distance away will be at full-blur
const ActiveLyricSizeIncrease = 0.5 // This is measured in rem Units as all Spotify fonts are rendered with them

const ActiveLyricsContainers: ActiveLyricObjects = {
	NowPlaying: undefined,
	FullScreen: undefined
}
const ActiveLyricsContainerCleaners: ActiveLyricCleaners = {
	NowPlaying: undefined,
	FullScreen: undefined
}

const ManageLyricsContainer = (container: LyricObject): Callback => {
	// Create our storage for each lyric
	const lyrics: Map<
		HTMLDivElement,
		{
			Observer: MutationObserver,
			LayoutOrder: number,
			State: LyricState
		}
	> = new Map()

	// Handle updating our lyrics
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
			if (isActive) {
				/*
					The idea here is that we can get the font-size of our text in pixels.

					We know that the font-size in CSS is in rem-units. We also know that the documents
					font-size is equievelant to 1rem. So what we can then do is get the computed styles
					for both elements and divide their font-sizes to get the font-size in rem-units.
				*/
				const style = getComputedStyle(lyric), rootStyle = getComputedStyle(document.documentElement)
				const lyricFontSizeInPixels = parseFloat(style.fontSize), rootFontSizeInPixels = parseFloat(rootStyle.fontSize)
				const fontSizeInRem = (lyricFontSizeInPixels / rootFontSizeInPixels)

				// Now we can set our font-size in rem-units
				lyric.style.fontSize = `${fontSizeInRem + ActiveLyricSizeIncrease}rem`
			} else {
				lyric.style.fontSize = ''
			}

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
			// Find our layout-order
			const layoutOrder = Array.from(container.children).indexOf(lyric)

			// Create our observer to watch for class-changes
			const observer = new MutationObserver(Update)
			observer.observe(lyric, {attributes: true, attributeFilter: ['class'], childList: false, subtree: false})

			// Store our lyric
			lyrics.set(
				lyric, {
					Observer: observer,
					LayoutOrder: layoutOrder,
					State: "Unsung"
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
		observer = new MutationObserver(
			(mutationRecords) => {
				for(const mutationRecord of mutationRecords) {
					if (mutationRecord.type !== 'childList') {
						continue
					}

					for(const node of mutationRecord.addedNodes) {
						CheckNode(node)
					}

					for(const node of mutationRecord.removedNodes) {
						if (node instanceof HTMLDivElement) {
							lyrics.delete(node)
						}
					}
				}
			}
		)
		observer.observe(container, {attributes: false, childList: true, subtree: false})

		// Grab our initial lyrics
		for(const node of container.childNodes) {
			CheckNode(node)
		}
	}

	// Return our cleaner for external management
	return () => {
		// Disconnect our primary observer
		observer.disconnect()

		// Go through and disconnect all of our lyric-observers
		for(const lyric of lyrics.values()) {
			lyric.Observer.disconnect()
		}
	}
}

const CheckLyricsContainer = (
	container: (LyricObject | null), containerType: LyricContainerType
) => {
	// First determine if we need to update our container at all
	if (container === ActiveLyricsContainers[containerType]) {
		return
	}

	// Clear our previous container
	ActiveLyricsContainerCleaners[containerType]?.()
	ActiveLyricsContainerCleaners[containerType] = undefined

	// Now manage the container
	if (container) {
		ActiveLyricsContainerCleaners[containerType] = ManageLyricsContainer(container)
	}

	// Update our active
	ActiveLyricsContainers[containerType] = (container ?? undefined)
}

const CheckForLyricsContainers = () => {
	// Grab our now-playing and full-screen containers if possible
	const nowPlaying = document.body.querySelector(`.${NowPlayingLyricsContainerClass}`) as (HTMLElement | null)
	let fullScreen = document.body.querySelector(`.${FullScreenLyricsContainerClass}`) as (HTMLElement | null)

	// Now check them
	CheckLyricsContainer(nowPlaying, "NowPlaying")
	CheckLyricsContainer(fullScreen, "FullScreen")
}

// Main watcher
async function main() {
  	// Check for any initial elements
	CheckCoverArtElements()
	CheckForLyricsBackgrounds()
	CheckForLyricsContainers()

	/*
		Now watch for DOM changes to determine if we need to update.

		We don't store a reference to the observer because we expect it to run for the entire duration that
		Spotify is open for. The reason is because any of these elements can be removed/added dynamically
		and we could have larger cover-art elements come in at any time as well. We want to use those
		larger cover-art versions since they have higher-resolution image. It also comes with the benefit
		that hot-reloading what elements we are using is easier.
	*/
	new MutationObserver(
		() => {
			CheckCoverArtElements()
			CheckForLyricsBackgrounds()
			CheckForLyricsContainers()
		}
	).observe(
		document.body,
		{attributes: false, childList: true, subtree: true}
	)
}

export default main;
