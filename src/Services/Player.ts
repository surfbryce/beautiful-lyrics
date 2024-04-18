// Packages
import { Signal } from "$spicetify-packages/Signal"
import { Maid } from "$spicetify-packages/Maid"

// Modules
import { GlobalMaid, SpotifyPlayer } from "./Session"
import { Song, ProvidedMetadata } from "./Player/Song"

// Behavior Constants
const SpicetifyTrackId = /^spotify:track:([\w\d]+)$/
const SpicetifyLocalTrackId = /^spotify:local:(.+)$/

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
				const callback = () => {
					// Remove our previous song
					this.Maid.Clean("Song")

					// Determine if we even have a song
					const track = SpotifyPlayer.data?.item
					if ((track === undefined) || (track.type !== "track")) {
						// Make sure we don't have our information any longer
						this.Song = undefined
						this.SongJustChanged = undefined

						// Now fire our event
						this.SongChangedSignal.Fire()
					} else {
						// Grab track details
						const metadata: ProvidedMetadata = track.metadata as any
						const isLocal = (metadata.is_local === "true")
						const trackId = (
							track.uri.match(
								isLocal ? SpicetifyLocalTrackId
								: SpicetifyTrackId
							)![1]
						)
						const duration = (SpotifyPlayer.data.duration / 1000)

						// Load our information
						this.Song = this.Maid.Give(
							new Song(
								duration, !SpotifyPlayer.data.isPaused,
								trackId, metadata, isLocal,
								(song: Song) => this.SongChangedSignal.Fire(song)
							),
							"Song"
						)
					}
				}

				SpotifyPlayer.addEventListener("songchange", callback)
				this.Maid.Give(() => SpotifyPlayer.removeEventListener("songchange", callback as any))

				if (SpotifyPlayer.data !== undefined) {
					callback()
				}
			}
		}
	}
}

export default new Player()