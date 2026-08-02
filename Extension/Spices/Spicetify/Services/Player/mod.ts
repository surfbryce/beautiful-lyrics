// Spotify Types
import type { TrackInformationResponse, TrackInformation, TrackReleaseDate } from "../../Types/API/InternalTrackInformation.ts"
import type TrackMetadata from "../../Types/App/TrackMetadata.ts"

// Web-Modules
import { Signal, type Event } from "@Universal/Modules/Signal.ts"
import { Maid } from "@Universal/Modules/Maid.ts"
import { Defer, Timeout } from "@Universal/Modules/Scheduler.ts"

// Spicetify Services
import {
	GlobalMaid,
	OnSpotifyReady,
	SpotifyPlayer, SpotifyPlatform, SpotifyURI, SpotifyRequestBuilder,
	SpotifyInternalFetch
} from "../Session.ts"
import { GetExpireStore } from '../Cache.ts'

// Our Modules
import {
	TransformProviderLyrics,
	type ProviderLyrics, type TransformedLyrics, type RomanizedLanguage
} from "./LyricUtilities.ts"

// Re-export some useful types
export type { RomanizedLanguage, TransformedLyrics }

// Create our maid for the Player
const PlayerMaid = GlobalMaid.Give(new Maid())

// Create our signals/expose events
type TimeStepped = (deltaTime: number, skipped?: true) => void
const [
	SongChangedSignal, SongContextChangedSignal,
	SongDetailsLoadedSignal, SongLyricsLoadedSignal,
	IsPlayingChangedSignal, TimeSteppedSignal,
	IsShufflingChangedSignal, LoopModeChangedSignal,
	IsLikedChangedSignal
] = PlayerMaid.GiveItems(
	new Signal(), new Signal(),
	new Signal(), new Signal(),
	new Signal(), new Signal<TimeStepped>(),
	new Signal(), new Signal(),
	new Signal()
)
export const SongChanged: Event = SongChangedSignal.GetEvent()
export const SongContextChanged: Event = SongContextChangedSignal.GetEvent()
export const SongDetailsLoaded: Event = SongDetailsLoadedSignal.GetEvent()
export const SongLyricsLoaded: Event = SongLyricsLoadedSignal.GetEvent()
export const IsPlayingChanged: Event = IsPlayingChangedSignal.GetEvent()
export const TimeStepped: Event<TimeStepped> = TimeSteppedSignal.GetEvent()
export const IsShufflingChanged: Event = IsShufflingChangedSignal.GetEvent()
export const LoopModeChanged: Event = LoopModeChangedSignal.GetEvent()
export const IsLikedChanged: Event = IsLikedChangedSignal.GetEvent()

// Store our song state
export type DJMetadata = {
	Type: "DJ";

	Uri: string;
	Action: string;
	CoverArt: {
		Large: string;
		Big: string;
		Default: string;
		Small: string;
	};
}
export type LocalSongMetadata = {
	Type: "Local";

	Uri: string;
	Duration: number;
	CoverArt?: string;
}
export type StreamedSongMetadata = {
	Type: "Streamed";

	Uri: string;
	Id: string;
	InternalId: string;
	Duration: number;
	CoverArt: {
		Large: string;
		Big: string;
		Default: string;
		Small: string;
	};
}
export type SongMetadata = (StreamedSongMetadata | LocalSongMetadata | DJMetadata)
export let Song: (SongMetadata | undefined) = undefined

export type SongContextDetails = (
	{
		Uri: string;
		Description: string;
		CoverArt?: string;
	}
	& (
		{
			Type: "Album",
			Id: string
		}
		| {
			Type: "Playlist",
			Id: string
		}
		| {
			Type: "LocalFiles"
		}
		| {
			Type: "Other"
		}
	)
)
export let SongContext: (SongContextDetails | undefined) = undefined

export let IsLiked = false
export let HasIsLikedLoaded = false

// Static Song Helpers
export const SetIsLiked = (isLiked: boolean): (false | void) => ((isLiked !== IsLiked) && SpotifyPlayer.setHeart(isLiked))
export const GetDurationString = (): string => {
	if (Song?.Type === "DJ") {
		throw new Error("Cannot get duration of a DJ track")
	}

	const duration = (Song?.Duration ?? 0)
	const minutes = Math.floor(duration / 60)
	const seconds = Math.floor(duration % 60)
	return `${(duration >= 600) ? minutes.toString().padStart(2, "0") : minutes}:${seconds.toString().padStart(2, "0")}`
}

// Store our Playback state
export let Timestamp: number = -1
export let IsPlaying: boolean = false
export let IsShuffling: boolean = false
type LoopModeOption = ("Off" | "Song" | "Context")
export let LoopMode: LoopModeOption = "Off"

// Static Playback Helpers
export const SetLoopMode = (loopMode: LoopModeOption): void => (
	SpotifyPlayer.setRepeat(
		(loopMode === "Off") ? 0
		: (loopMode === "Context") ? 1 : 2
	)
)
export const SetIsShuffling = (isShuffling: boolean): void => SpotifyPlayer.setShuffle(isShuffling)
export const SetIsPlaying = (isPlaying: boolean): (false | void) => (
	(isPlaying !== IsPlaying)
	&& (isPlaying ? SpotifyPlayer.play() : SpotifyPlayer.pause())
)
export const SeekTo = (timestamp: number): void => SpotifyPlayer.seek(timestamp * 1000)
export const GetTimestampString = (): string => {
	if (Song?.Type === "DJ") {
		throw new Error("Cannot get Timestamp of a DJ track")
	}

	const duration = (Song?.Duration ?? 0)
	const minutes = Math.floor(Timestamp / 60)
	const seconds = Math.floor(Timestamp % 60)
	return `${(duration >= 600) ? minutes.toString().padStart(2, "0") : minutes}:${seconds.toString().padStart(2, "0")}`
}

// Handle our Details
export type LocalSongDetails = {
	IsLocal: true;

	Name: string;
	Album: string;
	Artists?: string[];
}
type StreamedArtistsDetails = {
	InternalId: string;
	Id: string;
	Name: string;
}
export type StreamedSongDetails = {
	IsLocal: false;

	ISRC: string;
	Name: string;
	Artists: StreamedArtistsDetails[];
	Album: {
		InternalId: string;
		Id: string;
		Artists: StreamedArtistsDetails[];
		ReleaseDate: TrackReleaseDate;
	};

	Raw: TrackInformation;
}
export type LoadedSongDetails = (LocalSongDetails | StreamedSongDetails)
export let SongDetails: (LoadedSongDetails | undefined) = undefined
export let HaveSongDetailsLoaded: boolean = false

const TrackInformationStore = GetExpireStore<TrackInformation>(
	"Player_TrackInformation", 2,
	{
		Duration: 2,
		Unit: "Weeks"
	},
	true
)
const SongNameFilters = [
	/\s*(?:\-|\/)\s*(?:(?:Stereo|Mono)\s*)?Remastered(?:\s*\d+)?/,
	/\s*\-\s*(?:Stereo|Mono)(?:\s*Version|\s*Mix)?/,
	/\s*\(\s*(?:Stereo|Mono)(?:\s*Mix)?\)?/
]
const LoadSongDetails = () => {
	// Remove our prior details state
	SongDetails = undefined, HaveSongDetailsLoaded = false

	// If we have no song then we have no details
	const songAtUpdate = Song
	if ((songAtUpdate === undefined) || (songAtUpdate.Type === "DJ")) {
		HaveSongDetailsLoaded = true
		SongDetailsLoadedSignal.Fire()
		return
	}

	// If we're a local song, as of now, there will be no details stored
	if (songAtUpdate.Type === "Local") {
		SongDetails = {
			IsLocal: true,

			Name: SpotifyPlayer.data.item.name,
			Album: SpotifyPlayer.data.item.album.name,
			Artists: SpotifyPlayer.data.item.artists?.map(artist => artist.name)
		}, HaveSongDetailsLoaded = true
		SongDetailsLoadedSignal.Fire()

		return
	}

	// Otherwise, fetch our details
	{
		TrackInformationStore.GetItem(songAtUpdate.Id)
		.then(
			trackInformation => {
				if (trackInformation === undefined) {
					// Create our base-build
					const requestBuilder = (
						SpotifyRequestBuilder.build()
						.withHost("https://spclient.wg.spotify.com/metadata/4")
						.withPath(`/track/${songAtUpdate.InternalId}`)
						.withEndpointIdentifier(`/track/${songAtUpdate.InternalId}`)
					)

					// Mark our request-builder to default to existing promise
					requestBuilder.UseExistingPromise = true

					// Now send our request
					return (
						// SpotifyFetch(`https://api.spotify.com/v1/tracks/${songAtUpdate.Id}`)
						(requestBuilder.send() as Promise<TrackInformationResponse>)
						// Uncaught on purpose - it should rarely ever fail
						.catch(error => {console.warn(error); throw error})
						.then(
							response => {
								if (response.ok === false) {
									throw `Failed to load Track (${songAtUpdate.Id}) Information`
								}
								return response.body
							}
						)
						.then(
							(trackInformation) => {
								TrackInformationStore.SetItem(songAtUpdate.Id, trackInformation)
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
			trackInformation => {
				// Make sure we still have the same song active
				if (Song !== songAtUpdate) {
					return
				}

				// Filter our name of any gunk we may not want
				let transformedName = trackInformation.name
				for (const filter of SongNameFilters) {
					transformedName = transformedName.replace(filter, "")
				}

				// Update our details
				SongDetails = {
					IsLocal: false,

					ISRC: trackInformation.external_id.find(entry => entry.type === "isrc")!.id,
					Name: transformedName,
					Artists: trackInformation.artist.map(
						artist => (
							{
								InternalId: artist.gid,
								Id: SpotifyURI.hexToId(artist.gid),
								Name: artist.name
							}
						)
					),
					Album: {
						InternalId: trackInformation.album.gid,
						Id: SpotifyURI.hexToId(trackInformation.album.gid),
						Artists: trackInformation.album.artist.map(
							artist => (
								{
									InternalId: artist.gid,
									Id: SpotifyURI.hexToId(artist.gid),
									Name: artist.name
								}
							)
						),
						ReleaseDate: trackInformation.album.date
					},

					Raw: trackInformation
				}, HaveSongDetailsLoaded = true
				SongDetailsLoadedSignal.Fire()
			}
		)
	}
}

// Handle our Lyrics
const ProviderLyricsStore = GetExpireStore<ProviderLyrics | false>(
	"Player_ProviderLyricsSpotifyEs", 1,
	{
		Duration: 1,
		Unit: "Months"
	},
	true
)
const TransformedLyricsStore = GetExpireStore<TransformedLyrics | false>(
	"Player_TransformedLyricsSpotifyEs", 1,
	{
		Duration: 1,
		Unit: "Months"
	},
	true
)

export let SongLyrics: (TransformedLyrics | undefined) = undefined
export let HaveSongLyricsLoaded: boolean = false
const LoadSongLyrics = () => {
	// Remove our prior lyric state
	HaveSongLyricsLoaded = false, SongLyrics = undefined

	// Check if we can even possibly have lyrics
	const songAtUpdate = Song
	if ((songAtUpdate === undefined) || (songAtUpdate.Type !== "Streamed")) {
		HaveSongLyricsLoaded = true
		SongLyricsLoadedSignal.Fire()
		return
	}

	// Now go through the process of loading our lyrics
	{
		// First determine if we have our lyrics stored already
		ProviderLyricsStore.GetItem(songAtUpdate.Id)
		.then(
			providerLyrics => {
				if (providerLyrics === undefined) { // Otherwise, get our lyrics
					return (
						SpotifyInternalFetch.get(
							`https://spclient.wg.spotify.com/color-lyrics/v2/track/${encodeURIComponent(songAtUpdate.Id)}?format=json&vocalRemoval=false&market=from_token`
						)
						.then(response => {
							const spotifyLyrics = response?.lyrics
							const lines = spotifyLyrics?.lines
							if (!Array.isArray(lines) || lines.length === 0) return undefined

							if (spotifyLyrics.syncType !== "LINE_SYNCED") {
								return {
									Type: "Static",
									Lines: lines.map((line: { words?: string }) => ({ Text: line.words ?? "" }))
								} as ProviderLyrics
							}

							const timedLines = lines
								.map((line: { startTimeMs?: string | number, words?: string }) => ({
									StartTime: Number(line.startTimeMs ?? 0) / 1000,
									Text: line.words ?? ""
								}))
								.filter((line: { Text: string }) => line.Text.trim().length > 0)

							return {
								Type: "Line",
								StartTime: timedLines[0]?.StartTime ?? 0,
								EndTime: songAtUpdate.Duration,
								Content: timedLines.map((line: { StartTime: number, Text: string }, index: number) => ({
									Type: "Vocal",
									StartTime: line.StartTime,
									EndTime: timedLines[index + 1]?.StartTime ?? songAtUpdate.Duration,
									Text: line.Text,
									OppositeAligned: false
								}))
							} as ProviderLyrics
						})
						.then(
							(providerLyrics) => {
								const lyrics = (providerLyrics ?? false)
								ProviderLyricsStore.SetItem(songAtUpdate.Id, lyrics)
								return lyrics
							}
						)
					)
				} else {
					return providerLyrics
				}
			}
		)
		.then(
			(storedProviderLyrics): Promise<[(ProviderLyrics | false), (TransformedLyrics | false | undefined)]> => {
				return (
					TransformedLyricsStore.GetItem(songAtUpdate.Id)
					.then(storedTransformedLyrics => [storedProviderLyrics, storedTransformedLyrics])
				)
			}
		)
		.then(
			([storedProviderLyrics, storedTransformedLyrics]): Promise<TransformedLyrics | undefined> => {
				// If we do not have anything stored for our transformed-lyrics then we need to generate it
				if (storedTransformedLyrics === undefined) {
					return (
						(
							(storedProviderLyrics === false) ? Promise.resolve<false>(false)
							: TransformProviderLyrics(storedProviderLyrics)
						)
						.then(
							transformedLyrics => {
								// Save our information
								TransformedLyricsStore.SetItem(songAtUpdate.Id, transformedLyrics)

								// Now return our information
								return (transformedLyrics || undefined)
							}
						)
					)
				} else {
					return Promise.resolve(storedTransformedLyrics || undefined)
				}
			}
		)
		.catch(error => {
			console.warn("Beautiful Lyrics: failed to load lyrics", error)
			return undefined
		})
		.then(
			transformedLyrics => {
				// Make sure we still have the same song active
				if (Song !== songAtUpdate) {
					return
				}

				// Update our lyrics
				SongLyrics = transformedLyrics, HaveSongLyricsLoaded = true
				SongLyricsLoadedSignal.Fire()
			}
		)
	}
}

// Wait for Spotify to be ready
OnSpotifyReady.then(
	() => {
		/*
			We override the RequestBuilder so we can store
			Send promises for track information requests.

			This is so we don't pollute the console with faulty errors/warnings
			about duplicate requests being sent around the same time.
		*/
		{
			// Reset any pending requests
			SpotifyRequestBuilder.resetPendingRequests()

			// Create our override
			const originalBuildMethod = SpotifyRequestBuilder.build

			const trackPromises = new Map<string, Promise<unknown>>()
			SpotifyRequestBuilder.build = (...buildArguments: unknown[]) => {
				const builder = originalBuildMethod.call(SpotifyRequestBuilder, ...buildArguments)
				
				const originalOnAfterSendMethod = builder.onAfterSend
				let removeTrackPromiseId: (string | undefined)
				builder.onAfterSend = (...onAfterSendArguments: unknown[]) => {
					if (removeTrackPromiseId !== undefined) {
						trackPromises.delete(removeTrackPromiseId)
					}
					return originalOnAfterSendMethod.call(builder, ...onAfterSendArguments)
				}

				const originalSendMethod = builder.send
				builder.send = (...sendArguments: unknown[]) => {
					const isTrackInformationRequest = (
						(builder.host === "https://spclient.wg.spotify.com/metadata/4")
						&& builder.path.startsWith("/track/")
						&& builder.endpointIdentifier?.startsWith("/track/")
					)

					if (isTrackInformationRequest) {
						const existingPromise = trackPromises.get(`${builder.host}${builder.path}`)
						if (existingPromise !== undefined) {
							return existingPromise
						}
					}

					const sendPromise = originalSendMethod.call(builder, ...sendArguments)
					if (isTrackInformationRequest) {
						const trackPromiseId = `${builder.host}${builder.path}`
						trackPromises.set(trackPromiseId, sendPromise)
						removeTrackPromiseId = trackPromiseId
					}

					return sendPromise
				}

				return builder
			}

			PlayerMaid.Give(
				() => SpotifyRequestBuilder.build = originalBuildMethod,
				"RequestBuilderOverride"
			)
		}

		// Handle song updates
		{
			const OnSongChange = () => {
				// Wait until we have our SpotifyPlayer data
				if (SpotifyPlayer.data?.context === undefined) {
					return PlayerMaid.Give(Defer(OnSongChange), "SongChangeUpdate")
				} else if (SpotifyPlayer.data === null) {
					if (Song !== undefined) {
						Song = undefined
						SongChangedSignal.Fire()
					}

					if (SongContext !== undefined) {
						SongContext = undefined
						SongContextChangedSignal.Fire()
					}

					return
				}

				// Make sure that this is a Song and not any other type of track
				const track = SpotifyPlayer.data.item
				const isASong = (track.type === "track")
				const isDJ = ((track.type === "unknown") && (track.provider.startsWith("narration")))
				if ((track === undefined) || ((isASong === false) && (isDJ === false))) {
					Song = undefined
				} else {
					// Set our Timestamp to 0 immediately
					Timestamp = 0

					// Create our song-information
					const metadata = track.metadata as unknown as TrackMetadata
					const uri = SpotifyURI.from(track.uri)
					Song = Object.freeze(
						isDJ ? {
							Type: "DJ",

							Uri: track.uri,
							Action: track.name,
							CoverArt: {
								Large: metadata.image_xlarge_url,
								Big: metadata.image_large_url,
								Default: metadata.image_url,
								Small: metadata.image_small_url
							}
						}
						: (metadata.is_local === "true") ? {
							Type: "Local",

							Uri: track.uri,
							Duration: (SpotifyPlayer.data.duration / 1000),
							CoverArt: SpotifyPlayer.data.item.images?.[0]?.url
						}
						: {
							Type: "Streamed",

							Uri: track.uri,
							Id: uri!.id!,
							InternalId: SpotifyURI.idToHex(uri!.id!),
							Duration: (SpotifyPlayer.data.duration / 1000),
							CoverArt: {
								Large: metadata.image_xlarge_url,
								Big: metadata.image_large_url,
								Default: metadata.image_url,
								Small: metadata.image_small_url
							}
						}
					)
				}

				// Load our song details AND lyrics
				HasIsLikedLoaded = false
				LoadSongDetails()
				LoadSongLyrics()

				// Fire our events
				SongChangedSignal.Fire()

				// Determine if our context changed
				if ((SpotifyPlayer.data.hasContext === false) && (SongContext !== undefined)) {
					SongContext = undefined
					SongContextChangedSignal.Fire()
				} else if (
					(SongContext === undefined)
					|| (SongContext.Uri !== SpotifyPlayer.data.context.uri)
				) {
					const contextMetadata = SpotifyPlayer.data.context.metadata as unknown as {
						context_description: string;
						image_url: string;
					}
					const baseSongContext = {
						Uri: SpotifyPlayer.data.context.uri,
						CoverArt: ((contextMetadata.image_url === "") ? undefined : contextMetadata.image_url),
						Description: contextMetadata.context_description
					}

					if (baseSongContext.Uri === "spotify:internal:local-files") {
						SongContext = {
							Type: "LocalFiles",
							...baseSongContext
						}
					} else {
						const uri = SpotifyURI.from(SpotifyPlayer.data.context.uri)
						if (uri?.type?.startsWith("playlist")) {
							SongContext = {
								Type: "Playlist",
								Id: uri.id!,
								...baseSongContext
							}
						} else if (uri?.type === "album") {
							SongContext = {
								Type: "Album",
								Id: uri.id!,
								...baseSongContext
							}
						} else {
							SongContext = {
								Type: "Other",
								...baseSongContext
							}
						}
					}

					SongContextChangedSignal.Fire()
				}
			}
			OnSongChange()
			SpotifyPlayer.addEventListener("songchange", OnSongChange)
			PlayerMaid.Give(() => SpotifyPlayer.removeEventListener("songchange", OnSongChange))
		}
		
		// Hande loop/shuffle updates
		{
			const OnUpdate = () => {
				const newIsLiked = ((Song === undefined) ? false : SpotifyPlayer.getHeart())
				if ((HasIsLikedLoaded === false) || (IsLiked !== newIsLiked)) {
					IsLiked = newIsLiked
					HasIsLikedLoaded = true
					IsLikedChangedSignal.Fire()
				}

				const newShuffleState = SpotifyPlayer.getShuffle()
				if (IsShuffling !== newShuffleState) {
					IsShuffling = newShuffleState
					IsShufflingChangedSignal.Fire()
				}

				const loopSetting = SpotifyPlayer.getRepeat()
				const newLoopMode = ((loopSetting === 0) ? "Off" : (loopSetting === 1) ? "Context" : "Song")
				if (LoopMode !== newLoopMode) {
					LoopMode = newLoopMode
					LoopModeChangedSignal.Fire()
				}
			}
			OnUpdate()
			SpotifyPlatform.PlayerAPI._events.addListener("update", OnUpdate)
			PlayerMaid.Give(() => SpotifyPlatform.PlayerAPI._events.removeListener("update", OnUpdate))
		}

		// Handle playing updates
		{
			const Update = () => {
				// If we have no data, then wait until we do
				if ((SpotifyPlayer.data === undefined) || (SpotifyPlayer.data === null)) {
					return PlayerMaid.Give(Defer(Update), "PlayingUpdate")
				}

				// Now fire our event
				const isPaused = SpotifyPlayer.data.isPaused
				if (IsPlaying === isPaused) {
					// Trigger an update and reflect our new state
					IsPlaying = !isPaused
					IsPlayingChangedSignal.Fire()

					// If we pause then stop our automatic-sync since we are guaranteed to be synced on play
					if (IsPlaying === false) {
						PlayerMaid.Clean("AutomaticSync")
					}
				}
			}
			Update()
			SpotifyPlayer.addEventListener("onplaypause", Update)
			PlayerMaid.Give(() => SpotifyPlayer.removeEventListener("onplaypause", Update))
		}

		// Handle timestamp updates
		{
			// Handle position syncing
			type SyncedPostiion = ({ StartedSyncAt?: number; Position: number; })
			let syncedPosition: (SyncedPostiion | undefined)

			const syncTimings = [0.05, 0.1, 0.15, 0.75]
			let canSyncNonLocalTimestamp = (IsPlaying ? syncTimings.length : 0)
			SongChangedSignal.Connect(() => canSyncNonLocalTimestamp = syncTimings.length)
			IsPlayingChangedSignal.Connect(() => canSyncNonLocalTimestamp = (IsPlaying ? syncTimings.length : 0))

			const RequestPositionSync = () => {
				const startedAt = performance.now()
				const isLocallyPlaying = SpotifyPlatform.PlaybackAPI._isLocal
				return (
					/*
						IsLocal determines whether or not we are playing on the current device
						OR if we are playing on a different device (device switching).

						For local playback, we can use the Clients C++ Transport to get the current position.
						Otherwise, we have to request for a timestamp resync to get the current position.
					*/
					isLocallyPlaying
					? (
						(SpotifyPlatform.PlayerAPI._contextPlayer.getPositionState({}) as Promise<{position: bigint}>)
						.then(({ position }) => ({ StartedSyncAt: startedAt, Position: Number(position) }))
					)
					: (
						(
							(canSyncNonLocalTimestamp > 0) ? SpotifyPlatform.PlayerAPI._contextPlayer.resume({})
							: Promise.resolve()
						)
						.then(
							() => {
								canSyncNonLocalTimestamp = Math.max(0, (canSyncNonLocalTimestamp - 1))
								return (
									IsPlaying ? {
										StartedSyncAt: startedAt,
										Position: (
											SpotifyPlatform.PlayerAPI._state.positionAsOfTimestamp
											+ (Date.now() - SpotifyPlatform.PlayerAPI._state.timestamp)
										)
									}
									: { Position: SpotifyPlatform.PlayerAPI._state.positionAsOfTimestamp }
								)
							}
						)
					)
				)
				.then((position: SyncedPostiion) => syncedPosition = position )
				.then(
					() => PlayerMaid.Give(
						Timeout(
							(
								isLocallyPlaying ? (1 / 30)
								: (
									(canSyncNonLocalTimestamp === 0) ? (1 / 30)
									: syncTimings[syncTimings.length - canSyncNonLocalTimestamp]
								)
							), RequestPositionSync
						),
						"TimestampPositionSync"
					)
				)
			}

			// Handle frame updating
			let lastUpdatedAt = performance.now()
			const Update = () => {
				// Make sure we have an update
				if (lastUpdatedAt === undefined) {
					lastUpdatedAt = performance.now()
					return PlayerMaid.Give(Defer(Update), "Timestep")
				}

				// Determine our frame variables
				const updatedAt = performance.now()
				const deltaTime = ((updatedAt - lastUpdatedAt) / 1000)

				// Determine if we can update our timestamp at all
				if (Song !== undefined) {
					// Store our state for determination later
					let newTimestamp: (number | undefined), fireDeltaTime = deltaTime

					// Determine if we have a synced timestamp or not
					const syncedTimestamp = (
						(syncedPosition === undefined) ? undefined
						: (
							(syncedPosition.Position / 1000)
							+ (
								(syncedPosition.StartedSyncAt === undefined) ? 0
								: ((updatedAt - syncedPosition.StartedSyncAt) / 1000)
							)
						)
					)
					syncedPosition = undefined

					// Determine how we update our newTimestamp
					if (IsPlaying) {
						if (
							(syncedTimestamp === undefined)
							|| (Math.abs(syncedTimestamp - Timestamp) < 0.075)
						) {
							newTimestamp = (Timestamp + deltaTime), fireDeltaTime = deltaTime
						} else {
							newTimestamp = syncedTimestamp
						}
					} else if (
						(syncedTimestamp !== undefined)
						&& (Math.abs(syncedTimestamp - Timestamp) > 0.05)
					) {
						newTimestamp = syncedTimestamp, fireDeltaTime = 0
					}

					// Determine if we should even fire
					if (newTimestamp !== undefined) {
						Timestamp = newTimestamp
						TimeSteppedSignal.Fire(fireDeltaTime, ((fireDeltaTime === 0) || undefined))
					}
				}

				// Update our monitor state
				lastUpdatedAt = updatedAt

				// Schedule us for another update
				PlayerMaid.Give(Defer(Update), "Timestep")
			}
			
			// Finally, sync our position THEN update
			RequestPositionSync().then(Update)
		}
	}
)
