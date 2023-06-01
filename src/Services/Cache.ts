// Types
import { SongLyricsData, SpotifyTrackInformation } from "../Types/Backend"

// Cache Types
type CacheExpiration = {
	Duration: number;
	Unit: ("Weeks" | "Months");
}

type CacheControl<C> = {
	ExpiresAt: number;
	Content: C;
}

type CacheControlRecord<C> = Record<string, CacheControl<C>>

type CacheStore = {
	TrackInformation: CacheControlRecord<SpotifyTrackInformation>;
	ISRCLyrics: CacheControlRecord<SongLyricsData | false>;
}

// Cache-Control Class
class CacheManager {
	// Private Properties
	private readonly Store: CacheStore

	// Constructor
	constructor() {
		// Attempt to load our cache
		const cachedStore = localStorage.getItem("BeautifulLyrics")

		if (cachedStore === null) {
			this.Store = {
				TrackInformation: {},
				ISRCLyrics: {}
			}
		} else {
			this.Store = JSON.parse(cachedStore)

			// Go through our control-records and remove any expired items
			let changeMade = false
			for(const controlRecord of [this.Store.ISRCLyrics, this.Store.TrackInformation]) {
				for(const key in controlRecord) {
					const cacheControl = controlRecord[key]

					if (cacheControl.ExpiresAt < Date.now()) {
						changeMade = true
						delete controlRecord[key]
					}
				}
			}

			// Update ourselves
			if (changeMade) {
				this.Save()
			}
		}
	}

	// Public Methods
	public Get() {
		return this.Store
	}

	public Save() {
		localStorage.setItem("BeautifulLyrics", JSON.stringify(this.Store))
	}

	public GetFromControlRecord<C>(controlRecord: CacheControlRecord<C>, key: string): (C | undefined) {
		// Attempt to get our cache-control
		const cacheControl = controlRecord[key]

		// Determine if we have a cache-control
		if (cacheControl === undefined) {
			return undefined
		}

		// Determine if our cache-control has expired
		if (cacheControl.ExpiresAt < Date.now()) {
			// Delete our entry
			delete controlRecord[key]

			// Return undefined now that it doesn't exist
			return undefined
		}

		// Return our cache-control's content
		return cacheControl.Content
	}

	public SetControlRecord<C>(
		controlRecord: CacheControlRecord<C>,
		key: string, content: C,
		expiration: CacheExpiration
	) {
		// Determine when we expire
		const expireAtDate = new Date()
		expireAtDate.setHours(0, 0, 0, 0)
		if (expiration.Unit == "Weeks") {
			expireAtDate.setDate(expireAtDate.getDate() + (expiration.Duration * 7))
		} else {
			expireAtDate.setMonth(expireAtDate.getMonth() + expiration.Duration)
			expireAtDate.setDate(0)
		}
		const expireAt = expireAtDate.getTime()

		// Store ourselves
		controlRecord[key] = {
			ExpiresAt: expireAt,
			Content: content
		}

		// Update our cache
		this.Save()
	}
}

export const Cache = new CacheManager()
export type {CacheExpiration}