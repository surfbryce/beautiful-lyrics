// Web-Modules
import { Signal } from 'jsr:@socali/modules/Signal'

// Spices
import { GlobalMaid } from "jsr:@socali/spices/Spicetify/Services/Session"
import {
	Song, SongChanged,
	type CoverArtMetadata
} from "jsr:@socali/spices/Spicetify/Services/Player"

// Types
export type CoverArtContainer = ("Page" | "SidePanel" | "LyricsPlusFullScreen")

// Create our signals/events
const CoverArtUpdatedSignal = GlobalMaid.Give(new Signal<(coverArt?: CoverArtMetadata) => void>())
export const CoverArtUpdated = CoverArtUpdatedSignal.GetEvent()
// const CoverArtBlurredSignal = new Signal<(blurredCoverArt?: string) => void>()

// Store our cover-art
export let CurrentCoverArt: (CoverArtMetadata | undefined)

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

// Handle update requests
{
	const Update = () => {
		if (Song?.CoverArt.Default !== CurrentCoverArt?.Default) {
			CurrentCoverArt = Song?.CoverArt
			CoverArtUpdatedSignal.Fire(CurrentCoverArt)
		}
	}
	Update()
	SongChanged.Connect(Update)
}