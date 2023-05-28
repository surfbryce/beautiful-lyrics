// Packages
import {Signal} from '../../../Packages/Signal'

// Services
import {GlobalMaid, SpotifyPlayer} from './Session'

// Track Types
type TrackMetadata = {
	image_xlarge_url: string;
	image_large_url: string;
	image_url: string;
	image_small_url: string;
}

// Cover-Art Types
type CoverArt = {
	Large: string;
	Big: string;
	Default: string;
	Small: string;
}

// Create our signals/events
const CoverArtUpdatedSignal = new Signal<(coverArt?: CoverArt) => void>()

// Store our cover-art
let CoverArt: (CoverArt | undefined)

// Handle update requests
const Update = () => {
	// Grab the currently displayed cover-art
	const trackMetadata = SpotifyPlayer.data?.track?.metadata as (TrackMetadata | undefined)
	
	// Now evaluate our cover-art
	const newCoverArt = (
		trackMetadata ? {
			Large: trackMetadata.image_xlarge_url,
			Big: trackMetadata.image_large_url,
			Default: trackMetadata.image_url,
			Small: trackMetadata.image_small_url
		}
		: undefined
	)

	// Now determine if there was an update or not
	if (newCoverArt?.Default !== CoverArt?.Default) {
		// Update our cover-art
		CoverArt = newCoverArt

		// Update our cover-art image
		CoverArtUpdatedSignal.Fire(newCoverArt)
	}
}


// Handle manual/automatic updates
SpotifyPlayer.addEventListener("songchange", Update)
GlobalMaid.Give(() => SpotifyPlayer.removeEventListener("songchange", Update))
Update()

// Exports
export const CoverArtUpdated = CoverArtUpdatedSignal.GetEvent()
export const GetCoverArt = () => CoverArt