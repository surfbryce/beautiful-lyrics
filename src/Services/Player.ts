// Packages
import { Signal } from "../../../../Packages/Signal"
import { Maid } from "../../../../Packages/Maid"

// Modules
import { GlobalMaid, SpotifyPlayer } from "./Session"
import { Song, ProvidedMetadata } from "./Player/Song"

// Behavior Constants
const SpicetifyTrackId = /^spotify:track:([\w\d]+)$/

// Class
class Player {
	// Private Properties
	private Maid: Maid = GlobalMaid.Give(new Maid())

	private Song?: Song
	private SongJustChanged?: true // Used to determine when we initially fire our SongChanged event

	private Started?: true

	// Signals
	private readonly SongChangedSignal = this.Maid.Give(new Signal<(Song?: Song) => void>())
	
	public readonly SongChanged = this.SongChangedSignal.GetEvent()

	// Private Methods

	// Public Methods
	public GetSong(): (Song | undefined) {
		if (this.SongJustChanged) { // We don't want to give away a Song that isn't ready yet
			return undefined
		}

		return this.Song
	}

	public Start() {
		if (this.Started === undefined) {
			// Flip our state preventing this method from being called again
			this.Started = true

			// Handle when our song changes
			{
				const callback = (event?: Event & { data: Spicetify.PlayerState }) => {
					if ((event === undefined) || (event.data.track === undefined)) {
						// Make sure we don't have our information any longer
						this.Maid.Clean("Song")
						this.Song = undefined
						this.SongJustChanged = undefined

						// Now fire our event
						this.SongChangedSignal.Fire()
					} else {
						// Store our track for ease-of-access
						const track = event.data.track

						// Grab track details
						const trackId = track.uri.match(SpicetifyTrackId)![1]
						const metadata = track.metadata as ProvidedMetadata
						const duration = (event.data.duration / 1000)

						// Load our information
						this.Song = this.Maid.Give(
							new Song(
								duration, !event.data.is_paused,
								trackId, metadata,
								(song: Song) => this.SongChangedSignal.Fire(song)
							),
							"Song"
						)
					}
				}

				SpotifyPlayer.addEventListener("songchange", callback)
				this.Maid.Give(() => SpotifyPlayer.removeEventListener("songchange", callback as any))
			}
		}
	}
}

export default new Player()