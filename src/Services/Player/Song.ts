// Packages
import { Signal } from "../../../../../Packages/Signal"
import { Maid, Giveable } from "../../../../../Packages/Maid"
import { OnNextFrame } from "../../../../../Packages/Scheduler"

// Modules
import { SpotifyPlayer, SpotifyFetch } from "../Session"
import { Cache, ExpirationSettings } from '../Cache'
import { ParseLyrics, ParsedLyrics, LyricsResult } from "./LyricsParser"
import Spotify from "./Spotify"

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

type SpotifyLyric = {
	Type: Spotify.LyricSyncType;
	Content: Spotify.LyricLines;
}
type SpotifyLyrics = Map<string, SpotifyLyric>

type BackendLyric = (
	{
		Source: "AppleMusis";
		IsSynced: boolean;
		Content: string;
	}
)

// Behavior Constants
const MinimumTimeSkipDifferenceOffset = (1 / 120) // Difference extender (based off DeltaTime)

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

// Helper Methods
const RetryGetRequest = (url: string, retryCount: number, retryCooldown: number): Promise<Spicetify.CosmosAsync.Response> => {
	return (
		new Promise(
			async (resolve, reject) => {
				// Attempt to load our request
				for (let index = 0; index < retryCount; index += 1) {
					try {
						resolve(await SpotifyFetch.request("GET", url))
					} catch (error) {
						console.warn(`Failed to load Request (${url}) on Retry (${index + 1}), Error Below:`)
						console.warn(error)

						await new Promise(resolve => setTimeout(resolve, (retryCooldown * 1000)))
					}
				}

				// Failed completely
				reject(`Failed to load Request (${url}) after ${retryCount} retries`)
			}
		)
	)
}

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

	// Private Detail methods
	private GetLyricsFromSpotify(recordCode: string, ourPopularity: number) {
		return (
			SpotifyFetch.request(
				"GET",
				`https://api.spotify.com/v1/search?q=isrc:${recordCode}&type=track`
			)
			.catch(error => {console.warn(error); throw error})
			.then(
				(response) => {
					if ((response.status < 200) || (response.status > 299)) {
						throw `Failed to get Requests for RecordCode (${recordCode})`
					}
	
					return response.body as Spotify.RecordReleases
				}
			)
			.then(
				async (releases) => {
					// Store our ids/attributes for sorting later
					const releaseIds: string[] = []
					const releaseAttributeScores: Record<string, number> = {}
	
					for(const release of releases.tracks.items) {
						// Now store ourselves
						releaseIds.push(release.id)
						releaseAttributeScores[release.id] = (
							release.popularity
						)
					}

					// Add ourselves to the release-ids
					if (releaseIds.includes(this.Id) === false) {
						releaseIds.push(this.Id)
						releaseAttributeScores[this.Id] = ourPopularity
					}
	
					// Now sort our releases
					releaseIds.sort(
						(a, b) => {
							return (releaseAttributeScores[b] - releaseAttributeScores[a])
						}
					)
	
					// Now grab our releases for all the songs
					const lyrics: SpotifyLyrics = new Map()
					const lyricsPromises: Promise<void>[] = []
	
					for(const releaseId of releaseIds) {
						lyricsPromises.push(
							SpotifyFetch.request(
								"GET",
								`https://spclient.wg.spotify.com/color-lyrics/v2/track/${releaseId}?format=json&vocalRemoval=false`
							)
							.catch(error => {console.warn(error); return undefined})
							.then(
								(response?: Spicetify.CosmosAsync.Response) => {
									if (response === undefined) {
										return // Also means no lyrics
									}

									if ((response.status < 200) || (response.status > 299)) { // This means no lyrics
										return
									}

									const retrievedLyrics = response.body as Spotify.RetrievedLyrics
	
									lyrics.set(
										releaseId,
										{
											Type: retrievedLyrics.lyrics.syncType,
											Content: retrievedLyrics.lyrics.lines
										}
									)
								}
							)
						)
					}
	
					return (
						Promise.all(lyricsPromises)
						.then(() => lyrics)
					)
				}
			)
			.then(
				(lyrics) => {
					// Find our best-lyric (only line-synced no static since static lyrics are often wrong)
					for(const lyric of lyrics.values()) {
						if (lyric.Type === "LINE_SYNCED") {
							return lyric
						}
					}

					return undefined
				}
			)
		)
	}
	
	private GetLyricsFromBackendProvider(recordCode: string) {
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
						return (JSON.parse(text) as BackendLyric)
					}
				}
			)
		)
	}

	private LoadDetails() {
		(
			Cache.GetFromExpireCache("TrackInformation", this.Id)
			.then(
				trackInformation => {
					if (trackInformation === undefined) {
						return (
							RetryGetRequest(
								`https://api.spotify.com/v1/tracks/${this.Id}`,
								10, 0.25
							)
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
									return trackInformation
								}
							)
						)
					} else {
						return trackInformation
					}
				}
			)
			.then(
				(trackInformation): Promise<[SpotifyTrackInformation, (ParsedLyrics | false | undefined)]> => {
					return (
						Cache.GetFromExpireCache(
							"ISRCLyrics",
							trackInformation.external_ids.isrc
						)
						.then(storedParsedLyrics => [trackInformation, storedParsedLyrics])
					)
				}
			)
			.then(
				([trackInformation, storedParsedLyrics]): Promise<[SpotifyTrackInformation, (ParsedLyrics | undefined)]> => {
					// Now determine if we have our lyrics at all
					const recordCode = trackInformation.external_ids.isrc
	
					if (storedParsedLyrics === undefined) {
						return (
							this.GetLyricsFromBackendProvider(recordCode)
							.then(
								(backendLyric): Promise<[(BackendLyric | SpotifyLyric | undefined), boolean]> => {
									if ((backendLyric === undefined) || (backendLyric.IsSynced === false)) {
										return (
											this.GetLyricsFromSpotify(recordCode, trackInformation.popularity)
											.then(
												(spotifyLyric) => {
													if (spotifyLyric === undefined) {
														return [backendLyric, false]
													} else {
														return [spotifyLyric, true]
													}
												}
											)
										)
									} else {
										return Promise.resolve([backendLyric, false])
									}
								}
							).then(
								([lyric, isSpotifyLyric]) => {
									// If we don't have either lyric then we clearly dont have any
									if ((lyric === undefined)) {
										return undefined
									}

									// Determine our format
									return (
										(isSpotifyLyric)
										? {
											Source: "Spotify",
											Content: (lyric as SpotifyLyric).Content
										}
										: {
											Source: "AppleMusic",
											Content: (lyric as BackendLyric).Content
										}
									) as LyricsResult
								}
							)
							.then(
								(lyricsResult) => {
									// Determine what our parsed-lyrics are
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
	
									// Now return our parsed-lyrics
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

		// Start natural-timestepping if this is our first timestamp
		if (fireChangedSignal !== undefined) {
			this.StartNaturalTimestepping()
		}
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