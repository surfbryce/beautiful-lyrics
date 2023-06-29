// Packages
import { Signal } from "../../../../../Packages/Signal"
import { Maid, Giveable } from "../../../../../Packages/Maid"
import { OnNextFrame } from "../../../../../Packages/Scheduler"

// Modules
import { SpotifyPlayer, SpotifyFetch } from "../Session"
import { Cache, ExpirationSettings } from '../Cache'
import { ParseLyrics, ParsedLyrics, LyricsResult } from "./LyricsParser"

// Types
namespace SpotifyTrackInformationSpace {
	type ExternalUrls = {
		spotify: string;
	}
	
	type ExternalIds = {
		isrc: string;
	}
	
	type Image = {
		height: number;
		url: string;
		width: number;
	}

	type Artist = {
		external_urls: ExternalUrls;
		href: string;
		id: string;
		name: string;
		type: string;
		uri: string;
	}

	type Album = {
		album_type: string;
		artists: Artist[];
		available_markets: string[];
		external_urls: ExternalUrls;
		href: string;
		id: string;
		images: Image[];
		name: string;
		release_date: string;
		release_date_precision: string;
		total_tracks: number;
		type: string;
		uri: string;
	}

	type TrackInformation = {
		album: Album;
		artists: Artist[];
		available_markets: string[];
		disc_number: number;
		duration_ms: number;
		explicit: boolean;
		external_ids: ExternalIds;
		external_urls: ExternalUrls;
		href: string;
		id: string;
		is_local: boolean;
		name: string;
		popularity: number;
		preview_url: string;
		track_number: number;
		type: string;
		uri: string;
	}

	export type Self = TrackInformation
}
type SpotifyTrackInformation = SpotifyTrackInformationSpace.Self

type ProvidedMetadata = {
	album_artist_name: string;
	album_disc_count: string;
	album_disc_number: string;
	album_title: string;
	album_track_count: string;
	album_track_number: string;
	album_uri: string;

	artist_name: string;
	artist_uri: string;

	'canvas.artist.avatar': string;
	'canvas.artist.name': string;
	'canvas.artist.uri': string;
	'canvas.canvasUri': string;
	'canvas.entityUri': string;
	'canvas.explicit': string;
	'canvas.fileId': string;
	'canvas.id': string;
	'canvas.type': string;
	'canvas.uploadedBy': string;
	'canvas.url': string;

	'collection.can_add': string;
	'collection.can_ban': string;
	'collection.in_collection': string;
	'collection.is_banned': string;

	context_uri: string;
	duration: string;
	entity_uri: string;
	has_lyrics: string;

	image_large_url: string;
	image_small_url: string;
	image_url: string;
	image_xlarge_url: string;

	interaction_id: string;
	iteration: string;
	marked_for_download: string;
	page_instance_id: string;
	popularity: string;
	title: string;
	track_player: string;
}
type CoverArt = {
	Large: string;
	Big: string;
	Default: string;
	Small: string;
}
type Details = {
	// Metadata
	ISRC: string;

	// Dynamic
	Lyrics?: ParsedLyrics;
}

// Behavior Constants
const MinimumTimeSkipDifferenceOffset = (3 / 240) // Difference extender (based off DeltaTime)

const TrackInformationExpiration: ExpirationSettings = {
	Duration: 2,
	Unit: "Weeks"
}
const SongLyricsExpiration: ExpirationSettings = {
	Duration: 1,
	Unit: "Months"
}

// Dynamic Flags
let LastSpotifyTimestamp: number

// Class
class Song implements Giveable {
	// Private Properties
	private Maid: Maid = new Maid()

	private FireChangedSignal?: ((song: Song) => void)

	// Private Song Metadata
	private readonly Id: string
	private readonly Duration: number
	private readonly CoverArt: CoverArt
	private Details?: Details

	// Private Song State
	private Playing: boolean
	private Timestamp: number = 0
	private DeltaTime: number = (1 / 60)

	private LoadedDetails?: true

	// Signals
	private readonly TimeSteppedSignal = this.Maid.Give(
		new Signal<(timestamp: number, deltaTime: number, skipped?: true) => void>()
	)
	private readonly IsPlayingChangedSignal = this.Maid.Give(new Signal<(isPlaying: boolean) => void>())
	private readonly DetailsLoadedSignal = this.Maid.Give(new Signal<() => void>())

	public readonly TimeStepped = this.TimeSteppedSignal.GetEvent()
	public readonly IsPlayingChanged = this.IsPlayingChangedSignal.GetEvent()

	// Constructor
	constructor(
		duration: number, isPlaying: boolean,
		trackId: string, metadata: ProvidedMetadata,
		fireChangedSignal: ((song: Song) => void)
	) {
		// Set our properties
		{
			// Set our changed signal
			this.FireChangedSignal = fireChangedSignal

			// Define our metadata
			{
				// Set our given properties
				this.Id = trackId
				this.Duration = duration

				// Define our cover art
				this.CoverArt = {
					Large: metadata.image_xlarge_url,
					Big: metadata.image_large_url,
					Default: metadata.image_url,
					Small: metadata.image_small_url
				}
			}

			// Now set our state
			this.Playing = isPlaying
		}

		// Handle our events
		this.HandleEvents()

		// Now load our details
		this.LoadDetails()

		// Handle naturaly timestepping
		this.StartNaturalTimestepping()
	}

	// Private Setup Methods
	private HandleEvents() {
		// Handle when our progress changes (used for skip detection)
		{
			const callback = (event?: Event & { data: number }) => {
				// Make sure we even have our event
				if (event === undefined) {
					return
				}

				/*
					So now we need to make sure we're not using the timestamp from a previous song.

					This should be impossible but how Spotify works is that it keeps yelling out the
					timestamp no matter what and only changes the timestamp once the song has loaded.

					So by determining whether or not our timestamp is the same as the previous we can
					avoid running any updates whilst also avoiding any issues with the timestamp.
				*/
				if (event.data === LastSpotifyTimestamp) {
					return
				}
				LastSpotifyTimestamp = event.data
	
				// Grab our timestamp from Spotify
				const spotifyTimestamp = (event.data / 1000)
	
				// Now determine if we skipped
				const deltaTime = Math.abs(spotifyTimestamp - this.Timestamp)

				if (deltaTime >= (this.DeltaTime + MinimumTimeSkipDifferenceOffset)) {
					this.UpdateTimestamp(spotifyTimestamp, (1 / 60), true)
				}
			}
	
			SpotifyPlayer.addEventListener("onprogress", callback)
			this.Maid.Give(() => SpotifyPlayer.removeEventListener("onprogress", callback as any))
		}

		// Watch for IsPlaying changes
		{
			const callback = (event?: Event & { data: Spicetify.PlayerState }) => {
				// Make sure we even have our event
				if (event === undefined) {
					return
				}

				// Now fire our event
				if (this.Playing === event.data.is_paused) {
					this.Playing = !this.Playing

					this.IsPlayingChangedSignal.Fire(this.Playing)
				}
			}

			SpotifyPlayer.addEventListener("onplaypause", callback)
			this.Maid.Give(() => SpotifyPlayer.removeEventListener("onplaypause", callback as any))
		}
	}

	private LoadDetails() {
		new Promise(
			(resolve: (trackInformation: SpotifyTrackInformation) => void) => {
				// Determine if we already have our track-information
				const trackInformation = Cache.GetFromExpireCache("TrackInformation", this.Id)

				if (trackInformation === undefined) {
					SpotifyFetch.request(
						"GET",
						`https://api.spotify.com/v1/tracks/${this.Id}`
					) // Uncaught on purpose - it should rarely ever fail
					.catch(error => {console.warn(error); throw error})
					.then(
						(response) => {
							if ((response.status < 200) || (response.status > 299)) {
								throw `Failed to load Track (${this.Id}) Information`
							}

							// Extract our information
							const trackInformation = (response.body as SpotifyTrackInformation)

							// Save our information
							Cache.SetExpireCacheItem(
								"TrackInformation",
								this.Id, trackInformation,
								TrackInformationExpiration
							)

							// Now send our track-information out
							resolve(trackInformation)
						}
					)
				} else {
					resolve(trackInformation)
				}
			}
		)
		.then(
			(trackInformation): Promise<[SpotifyTrackInformation, (ParsedLyrics | undefined)]> => {
				// Now determine if we have our lyrics at all
				const recordCode = trackInformation.external_ids.isrc
				const storedParsedLyrics = Cache.GetFromExpireCache(
					"ISRCLyrics",
					recordCode
				)

				if (storedParsedLyrics === undefined) {
					return (
						fetch(`https://beautiful-lyrics.socalifornian.live/lyrics/${recordCode}`)
						.then(
							(response) => {
								if (response.ok === false) {
									throw `Failed to load Lyrics for Track (${
										this.Id
									}), Error: ${response.status} ${response.statusText}`
								}

								return response.text()
							}
						)
						.then(
							text => {
								if (text.length === 0) {
									return undefined
								} else {
									return (JSON.parse(text) as LyricsResult)
								}
							}
						)
						.then(
							(lyricsResult) => {
								// Determine what our parsed lyrics are
								const parsedLyrics = (
									(lyricsResult === undefined) ? undefined
									: ParseLyrics(lyricsResult)
								)

								// Save our information
								Cache.SetExpireCacheItem(
									"ISRCLyrics",
									recordCode, (parsedLyrics ?? false),
									SongLyricsExpiration
								)

								// Return our data
								return [trackInformation, parsedLyrics]
							}
						)
					)
				} else {
					return Promise.resolve([trackInformation, (storedParsedLyrics || undefined)])
				}
			}
		)
		.then(
			([trackInformation, parsedLyrics]) => {
				// Set our details
				this.Details = {
					ISRC: trackInformation.external_ids.isrc,

					Lyrics: parsedLyrics
				}

				// Now mark that our details are loaded and fire our event
				this.LoadedDetails = true
				this.DetailsLoadedSignal.Fire()
			}
		)
	}

	private StartNaturalTimestepping() {
		// Store our time now
		let lastTime = Date.now()

		// Now create our callback
		const update = () => {
			// Grab our time-now
			const timeNow = Date.now()
			const deltaTime = ((timeNow - lastTime) / 1000)

			// Determine if we can even step
			if (this.Playing) {
				// Now update our timestamp
				this.UpdateTimestamp(Math.min((this.Timestamp + deltaTime), this.Duration), deltaTime)
			}

			// Update our last time/delta-time
			this.DeltaTime = deltaTime
			lastTime = timeNow

			// Schedule us for another update
			this.Maid.Give(OnNextFrame(update), "NaturalTimestepping")
		}

		// Start our update-cycle
		update()
	}

	// Private State Methods
	private UpdateTimestamp(timestamp: number, deltaTime: number, skipped?: true) {
		// Update our timestamp
		this.Timestamp = timestamp

		// If we just changed song then we can fire our event
		const fireChangedSignal = this.FireChangedSignal
		if (fireChangedSignal !== undefined) {
			delete this.FireChangedSignal
			fireChangedSignal(this)
		}

		// Now fire our event
		this.TimeSteppedSignal.Fire(timestamp, deltaTime, skipped)
	}

	// Public Metadata Methods
	public GetId(): string {
		return this.Id
	}

	public GetDuration(): number {
		return this.Duration
	}

	public GetCoverArt(): CoverArt {
		return this.CoverArt
	}

	public GetDetails(): Promise<Details | undefined> {
		if (this.LoadedDetails === true) {
			return Promise.resolve(this.Details)
		} else {
			return new Promise(resolve => this.DetailsLoadedSignal.Connect(() => resolve(this.Details)))
		}
	}

	// Public State Methods
	public IsPlaying(): boolean {
		return this.Playing
	}

	public GetTimestamp(): number {
		return this.Timestamp
	}

	public SetTimestamp(timestamp: number) {
		SpotifyPlayer.seek(timestamp * 1000)
	}

	// Deconstructor
	public Destroy() {
		this.Maid.Destroy()
	}
}

// Exports
export { Song }
export type { CoverArt, ProvidedMetadata, SpotifyTrackInformation }