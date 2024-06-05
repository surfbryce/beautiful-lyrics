// Imported Types
import type { RomanizedLanguage } from "@socali/Spices/Player"

// NPM Packages
import seedrandom from "npm:seedrandom"

// Web-Modules
import { Signal } from "jsr:@socali/modules/Signal"
import type { Maid } from "jsr:@socali/modules/Maid"

// Spices
import { GetInstantStore } from "jsr:@socali/spices/Spicetify/Services/Cache"
import {
	Song, SongChanged,
	SongContext, SongContextChanged
} from "@socali/Spices/Player"

// Our store
export const Store = GetInstantStore<
	{
		CardLyricsVisible: boolean;
		PlaybarDetailsHidden: boolean;
		RomanizedLanguages: {[key in RomanizedLanguage]: boolean};
	}
>(
	"BeautifulLyrics/LyricViews", 1,
	{
		CardLyricsVisible: false,
		PlaybarDetailsHidden: false,
		RomanizedLanguages: {
			Chinese: false,
			Japanese: false,
			Korean: false,
		}
	}
)

// Shared Signals
const LanguageRomanizationChangedSignal = new Signal<(language: string, isRomanized: boolean) => void>()
export const LanguageRomanizationChanged = LanguageRomanizationChangedSignal.GetEvent()

// Shared Methods
export const CreateElement = <E = HTMLElement>(text: string) => {
	const element = document.createElement("div")
	element.innerHTML = text
	return element.firstElementChild as E
}

export const ToggleLanguageRomanization = (language: RomanizedLanguage, isRomanized: boolean) => {
	// Determine whether or not we've even changed in state
	if (Store.Items.RomanizedLanguages[language] !== isRomanized) {
		// Update ourselves
		Store.Items.RomanizedLanguages[language] = isRomanized

		// Save our changes
		Store.SaveChanges()

		// Now fire that we've changed
		LanguageRomanizationChangedSignal.Fire(language, isRomanized)
	}
}

export const IsLanguageRomanized = (language: RomanizedLanguage): boolean => {
	return (Store.Items.RomanizedLanguages[language] === true)
}

/* FUTURE PRE-BLUR SUPPORT
// Behavior Constants
const BlurSizeIncrease = 1.25
const BlurSize = 40

const CoverArtContainerFilters: Map<(CoverArtContainer | "Default"), string> = new Map()
CoverArtContainerFilters.set("Default", "brightness(0.5) saturate(2.5)")
CoverArtContainerFilters.set("SidePanel", "brightness(1) saturate(2.25)")

// Store our Blurred-CoverArt
const BlurredCoverArts: Map<string, Map<CoverArtContainer, Map<number, string>>> = new Map()

// Handle generating blurred-images
const GetCoverArtURLToBlur = (coverArt: CoverArtMetadata) => {
	return coverArt.Default
}
export const GenerateBlurredCoverArt = (
	coverArt: CoverArtMetadata, coverArtContainer: CoverArtContainer,
	sizes: number[]
) => { // Images are square so size is width/height
	// Determine which cover-art we want to use
	const desiredCoverArt = GetCoverArtURLToBlur(coverArt)

	// Load our image
	return (
		new Promise<HTMLImageElement>(
			(resolve, reject) => {
				const img = new Image();
				img.onload = () => resolve(img)
				img.onerror = reject
				img.src = desiredCoverArt
			}
		)
	)
		.then(
			(image) => {
				// Generate all our images
				const blobPromises = []

				for (const size of sizes) {
					// Determine our images actual width/height
					const imageWidth = size, imageHeight = size

					// Create our canvas
					const canvas = new OffscreenCanvas(imageWidth, imageHeight)
					const context = canvas.getContext("2d")!

					// Handle rendering our main-canvas
					{
						// Determine the center where we draw things at
						const centerX = (canvas.width / 2), centerY = (canvas.height / 2)

						// Create our crop
						{
							context.beginPath()
							context.arc(centerX, centerY, centerX, 0, Math.PI * 2)
							context.clip()
						}

						// Draw our image
						context.drawImage(image, 0, 0, imageWidth, imageHeight)
					}

					// Create our blur-canvas
					const blurCanvas = new OffscreenCanvas(
						Math.round(imageWidth * BlurSizeIncrease),
						Math.round(imageHeight * BlurSizeIncrease)
					)
					const blurContext = blurCanvas.getContext("2d")!

					// Handle rendering our blur-canvas
					{
						// Determine the center where we draw things at
						const centerX = (blurCanvas.width / 2), centerY = (blurCanvas.height / 2)

						// Grab our other filters
						const filters = (
							CoverArtContainerFilters.get(coverArtContainer)
							?? CoverArtContainerFilters.get("Default")!
						)

						// Apply our blur
						blurContext.filter = `${filters} blur(${BlurSize}px)`
						// blurContext.filter = filters

						// Draw our main image onto our blur-canvas
						blurContext.drawImage(canvas, (centerX - (canvas.width / 2)), (centerY - (canvas.height / 2)))
					}

					// Now store our blob
					blobPromises.push(
						blurCanvas.convertToBlob(
							{
								type: "image/webp",
								quality: 1
							}
						)
					)
				}

				// Generate our buffer
				return Promise.all(blobPromises)
			}
		)
		.then(
			blobs => {
				// Check if we have to create our main container
				let storage = BlurredCoverArts.get(desiredCoverArt)
				if (storage === undefined) {
					storage = new Map()
					BlurredCoverArts.set(desiredCoverArt, storage)
				}

				// Go through our old cover-art if we have any
				const oldCoverArts = storage.get(coverArtContainer)
				if (oldCoverArts !== undefined) {
					for (const oldURL of oldCoverArts.values()) {
						URL.revokeObjectURL(oldURL)
					}
				}

				// Store our blurred image
				const urls = new Map<number, string>()
				for (let index = 0; index < blobs.length; index++) {
					urls.set(sizes[index], URL.createObjectURL(blobs[index]))
				}

				// Return our url
				return urls
			}
		)
}
export const GetBlurredCoverArt = (
	coverArt: CoverArtMetadata, coverArtContainer: CoverArtContainer,
	sizes: number[]
) => {
	// Determine which cover-art we want to use
	const desiredCoverArt = GetCoverArtURLToBlur(coverArt)

	// Determine if we already have a blurred version of this cover-art
	const blurredCoversStorage = BlurredCoverArts.get(desiredCoverArt)
	if (blurredCoversStorage !== undefined) {
		const blurredCoverArt = blurredCoversStorage.get(coverArtContainer)

		if (blurredCoverArt !== undefined) {
			// Make sure that all our sizes exist
			for (const size of sizes) {
				if (blurredCoverArt.has(size) === false) {
					return undefined
				}
			}

			// Now return our blurred cover-art
			return blurredCoverArt
		}
	}

	return undefined
}
*/

// Handle applying our dynamic-background
const BackgroundClassName = "BeautifulLyricsBackground"
const BackgroundElements = ["Front", "Back", "BackCenter"]

export const GetCoverArtForSong = (): [string, (number | undefined)] => {
	// DJ is ALWAYS guaranteed to have a cover-art
	if (Song?.Type === "DJ") {
		return [Song.CoverArt.Big, undefined]
	}

	const coverArt = (
		(Song?.Type === "Local")
		? (
			Song?.CoverArt
			?? (
				(SongContext?.CoverArt !== undefined)
				? `spotify:image:${SongContext.CoverArt}`
				: undefined
			)
		)
		: Song?.CoverArt.Big
	)
	if (coverArt === undefined) {
		return [
			"https://images.socalifornian.live/SongPlaceholderFull.png",
			(75 + ((360 - 75) * seedrandom(Song?.Uri)()))
		]
	} else {
		return [coverArt, undefined]
	}
}

export const ApplyDynamicBackground = (element: HTMLElement, maid: Maid) => {
	// Give our element the class
	{
		element.classList.toggle(BackgroundClassName, true)
		maid.Give(() => element.classList.toggle(BackgroundClassName, false))

		// Handle re-adding our class IF we are removed
		const observer = maid.Give(new MutationObserver(() => element.classList.toggle(BackgroundClassName, true)))
		observer.observe(
			element,
			{ attributes: true, attributeFilter: ['class'], childList: false, subtree: false }
		)
	}

	// Create our container and child-images
	const backgroundContainer = maid.Give(document.createElement('div'))
	backgroundContainer.classList.add(`${BackgroundClassName}-Container`)

	// Create all our elements
	const elements: HTMLImageElement[] = []
	for (const elementClass of BackgroundElements) {
		// Create our image
		const image = maid.Give(document.createElement('img'))
		image.classList.add(elementClass)
		backgroundContainer.appendChild(image)

		// Now store our element
		elements.push(image)
	}

	// Update our background-images
	const UpdateBackgroundImages = () => {
		const [coverArt, placeholderHueShift] = GetCoverArtForSong()
		for (const element of elements) {
			element.style.setProperty("--PlaceholderHueShift", `${placeholderHueShift ?? 0}deg`)
			element.src = coverArt
		}
	}
	UpdateBackgroundImages()
	maid.Give(SongChanged.Connect(UpdateBackgroundImages))
	maid.Give(SongContextChanged.Connect(UpdateBackgroundImages))

	// Add our container to the background
	element.prepend(backgroundContainer)
}