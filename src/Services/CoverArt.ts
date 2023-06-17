// Packages
import {Signal} from '../../../../Packages/Signal'

// Services
import {GlobalMaid} from './Session'
import {SongChanged, CoverArt, Song, GetSong} from './Songs'

// Create our signals/events
const CoverArtUpdatedSignal = new Signal<(coverArt?: CoverArt) => void>()
// const CoverArtBlurredSignal = new Signal<(blurredCoverArt?: string) => void>()

// Store our cover-art
let CoverArt: (CoverArt | undefined)
// let BlurredCoverArt: (string | undefined)

// Behavior Constants
// const SizeIncrease = 2.5
// const BlurSizeIncrease = 1.25
// const BlurSize = 40

// Handle update requests
const Update = (song?: Song) => {
	// Now determine if there was an update or not
	if (song?.CoverArt.Default !== CoverArt?.Default) {
		// Update our cover-art
		CoverArt = song?.CoverArt

		// Update our cover-art image
		CoverArtUpdatedSignal.Fire(CoverArt)

		/* Save for a later date when we have a better way of doing this that accuarately matches what we have
		// Determine if we have a cover-art to begin with
		if (song !== undefined) {
			// Determine which cover-art we want to use
			const desiredCoverArt = song.CoverArt.Default

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
					// Determine our images actual width/height
					const imageWidth = Math.round(image.width * SizeIncrease),
						imageHeight = Math.round(image.height * SizeIncrease)

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

						// Apply our blur
						blurContext.filter = `blur(${BlurSize}px)`

						// Draw our main image onto our blur-canvas
						blurContext.drawImage(canvas, (centerX - (canvas.width / 2)), (centerY - (canvas.height / 2)))
					}

					// Generate our buffer
					return blurCanvas.convertToBlob(
						{
							type: "image/png"
						}
					)
				}
			)
			.then(
				blob => {
					return new Promise<string>(
						(resolve, reject) => {
							const reader = new FileReader()
							reader.onload = () => resolve(reader.result as string)
							reader.onerror = reject
							reader.readAsDataURL(blob)
						}
					)
				}
			)
			.then(
				(dataUrl) => {
					// Fire our signal (only IF we are the same CoverArt)
					if (CoverArt === song.CoverArt) {
						BlurredCoverArt = dataUrl
						CoverArtBlurredSignal.Fire(dataUrl)
					}
				}
			)
		}*/
	}
}

// Exports
export const CoverArtUpdated = CoverArtUpdatedSignal.GetEvent()
// export const CoverArtBlurred = CoverArtBlurredSignal.GetEvent()
export const GetCoverArt = () => CoverArt
// export const GetBlurredCoverArt = () => BlurredCoverArt
export const Start = () => {
	// Handle manual/automatic updates
	GlobalMaid.Give(SongChanged.Connect(Update))
	Update(GetSong())
}