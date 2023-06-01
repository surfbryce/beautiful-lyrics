// Packages
import {Signal} from '../../../Packages/Signal'

// Services
import {GlobalMaid} from './Session'
import { SongChanged, CoverArt, Song, GetSong } from './Songs'

// Create our signals/events
const CoverArtUpdatedSignal = new Signal<(coverArt?: CoverArt) => void>()

// Store our cover-art
let CoverArt: (CoverArt | undefined)

// Handle update requests
const Update = (song?: Song) => {
	// Now determine if there was an update or not
	if (song?.CoverArt.Default !== CoverArt?.Default) {
		// Update our cover-art
		CoverArt = song?.CoverArt

		// Update our cover-art image
		CoverArtUpdatedSignal.Fire(CoverArt)
	}
}

// Exports
export const CoverArtUpdated = CoverArtUpdatedSignal.GetEvent()
export const GetCoverArt = () => CoverArt
export const Start = () => {
	// Handle manual/automatic updates
	GlobalMaid.Give(SongChanged.Connect(Update))
	Update(GetSong())
}