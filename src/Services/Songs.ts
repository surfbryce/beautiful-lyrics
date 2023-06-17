// Packages
import { Signal } from '../../../../Packages/Signal'
import { Maid } from '../../../../Packages/Maid'

// Services
import { GlobalMaid, SpotifyPlayer, SpotifyFetch } from './Session'
import { Cache, ExpirationSettings } from './Cache'

// Types
import { SpotifyTrackInformation, SongLyricsData } from '../Types/Backend'

// Behavior Constants
const TrackInformationExpiration: ExpirationSettings = {
	Duration: 2,
	Unit: "Weeks"
}
const SongLyricsExpiration: ExpirationSettings = {
	Duration: 1,
	Unit: "Months"
}

// Create our maid
const ServiceMaid = GlobalMaid.Give(new Maid())

// Song Types
type SpicetifyTrack = {
	uri: string;
	uid: string;
	provider: string;
	metadata: {
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
	};
}

type CoverArt = {
	Large: string;
	Big: string;
	Default: string;
	Small: string;
}

// Song Class
class Song {
	// Private Properties

	// Public Properties
	public readonly Id: string
	public readonly CoverArt: CoverArt

	// Constructor
	constructor(id: string, trackData: SpicetifyTrack) {
		// Set our id
		this.Id = id

		// Extract our track-data out
		this.CoverArt = {
			Large: trackData.metadata.image_xlarge_url,
			Big: trackData.metadata.image_large_url,
			Default: trackData.metadata.image_url,
			Small: trackData.metadata.image_small_url
		}
	}
}

class DetailedSong extends Song {
	// Private Properties

	// Public Properties
	public readonly ISRC: string
	public readonly LyricsData: (SongLyricsData | undefined)

	// Constructor
	constructor(
		id: string, trackData: SpicetifyTrack,
		trackInformation: SpotifyTrackInformation,
		lyricsData?: SongLyricsData
	) {
		// Construct our base-class
		super(id, trackData)

		// Extract our track-information
		{
			this.ISRC = trackInformation.external_ids.isrc
		}

		// Store our lyrics
		this.LyricsData = lyricsData
	}
}

// Create our signals/events
const SongChangedSignal = new Signal<(song?: Song) => void>()
const SongDetailsLoadedSignal = new Signal<(song: DetailedSong) => void>()

// Store our current-song
let CurrentSong: (DetailedSong | Song | undefined)

// Handle creating our song-object
const SpicetifyTrackId = /^spotify:track:([\w\d]+)$/

const RegisterSong = (trackId: string, trackData: SpicetifyTrack) => {
	// Create our maid
	const maid = ServiceMaid.Give(new Maid(), "Song")

	// Create our song-object
	CurrentSong = new Song(trackId, trackData)

	// Load our song-details
	{
		new Promise(
			(resolve: (trackInformation: SpotifyTrackInformation) => void) => {
				// Determine if we already have our track-information
				const trackInformation = Cache.GetFromExpireCache("TrackInformation", trackId)

				if (trackInformation === undefined) {
					SpotifyFetch.request(
						"GET",
						`https://api.spotify.com/v1/tracks/${trackId}`
					) // Uncaught on purpose - it should rarely ever fail
					.catch(error => {console.warn(error); throw error})
					.then(
						(response) => {
							if ((response.status < 200) || (response.status > 299)) {
								throw `Failed to load Track (${trackId}) Information`
							}

							// Extract our information
							const trackInformation = (response.body as SpotifyTrackInformation)

							// Save our information
							Cache.SetExpireCacheItem(
								"TrackInformation",
								trackId, trackInformation,
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
			(trackInformation): Promise<[SpotifyTrackInformation, (SongLyricsData | undefined)]> => {
				// Now determine if we have our lyrics at all
				const recordCode = trackInformation.external_ids.isrc
				const lyricsData = Cache.GetFromExpireCache(
					"ISRCLyrics",
					recordCode
				)

				if (lyricsData === undefined) {
					return (
						fetch(`https://beautiful-lyrics.socalifornian.live/lyrics/${recordCode}`)
						.then(
							(response) => {
								if (response.ok === false) {
									throw `Failed to load Lyrics for Track (${trackId}), Error: ${response.status} ${response.statusText}`
								}

								return response.text()
							}
						)
						.then(
							text => {
								if (text.length === 0) {
									return undefined
								} else {
									return (JSON.parse(text) as SongLyricsData)
								}
							}
						)
						.then(
							(lyricsData) => {
								// Save our information
								Cache.SetExpireCacheItem(
									"ISRCLyrics",
									recordCode, (lyricsData ?? false),
									SongLyricsExpiration
								)

								// Return our data
								return [trackInformation, lyricsData]
							}
						)
					)
				} else {
					return Promise.resolve([trackInformation, (lyricsData || undefined)])
				}
			}
		)
		.then(
			([trackInformation, lyricsData]) => {
				// Make sure we don't override when our maid is destroyed
				if (maid.IsDestroyed()) {
					return
				}

				// Update to a DetailedSong object and fire that we loaded our details
				CurrentSong = new DetailedSong(trackId, trackData, trackInformation, lyricsData)
				SongDetailsLoadedSignal.Fire(CurrentSong as DetailedSong)
			}
		)
	}
}

const CheckSong = () => {
	// Grab the current-track
	const trackData = SpotifyPlayer.data?.track as (SpicetifyTrack | undefined)

	// Determine what our current track-id is
	const trackId: (string | undefined) = (trackData?.uri.match(SpicetifyTrackId) ?? [])[1]

	// Check whether or not our trackId changed
	if (trackId !== CurrentSong?.Id) {
		// First remove what we had
		ServiceMaid.Clean("Song")
		CurrentSong = undefined

		// Register our song if we have one
		if (trackId !== undefined) {
			RegisterSong(trackId, (trackData as SpicetifyTrack))
		}

		// Fire our song-changed signal
		SongChangedSignal.Fire(CurrentSong)
	}
}

// Exports
export const SongChanged = SongChangedSignal.GetEvent()
export const SongDetailsLoaded = SongDetailsLoadedSignal.GetEvent()
export const GetSong = () => CurrentSong
export const Start = () => {
	// Handle manual/automatic updates
	SpotifyPlayer.addEventListener("songchange", CheckSong)
	GlobalMaid.Give(() => SpotifyPlayer.removeEventListener("songchange", CheckSong))
	CheckSong()
}
export type {CoverArt, Song, DetailedSong}