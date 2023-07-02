// Types
import { SpotifyTrackInformation } from "./Player/Song"
import { ParsedLyrics } from "./Player/LyricsParser"

// Cache Types
type ExpirationSettings = {
	Duration: number;
	Unit: ("Weeks" | "Months");
}

type ExpireItem<C> = {
	ExpiresAt: number;
	Content: C;
}

type ExpireCache<C> = Record<string, ExpireItem<C>>

type ExpireCacheStoreContents = {
    TrackInformation: SpotifyTrackInformation;
    ISRCLyrics: (ParsedLyrics | false);
}
type ExpireCacheStore = {[K in keyof ExpireCacheStoreContents]: ExpireCache<ExpireCacheStoreContents[K]>}
type ExpireCacheStoreItemName = (keyof ExpireCacheStore)
type Store = {
	Analytics: {
		LastVisitedAt?: number;
	},

	LyricViews: {
		CardLyricsVisible: boolean;
	};
}
type StoreItemName = (keyof Store)
type StoreType = ("General" | "ExpireCache")
type AnyStoreItemName = (StoreItemName | ExpireCacheStoreItemName)

// Define our store-templates
const ExpireCacheStoreTemplates: ExpireCacheStore = {
	TrackInformation: {},
	ISRCLyrics: {}
}
const StoreTemplates: Store = {
	Analytics: {},

	LyricViews: {
		CardLyricsVisible: false
	}
}

// Define StoreItem Versions
const ExpireCacheStoreItemVersions: Map<ExpireCacheStoreItemName, number> = new Map()
ExpireCacheStoreItemVersions.set("TrackInformation", 1)
ExpireCacheStoreItemVersions.set("ISRCLyrics", 5)

const GeneralStoreItemVersions: Map<StoreItemName, number> = new Map()
GeneralStoreItemVersions.set("Analytics", 1)
GeneralStoreItemVersions.set("LyricViews", 1)

// Cache-Control Class
class CacheManager {
	// Private Properties
	private readonly ExpireCacheStore: ExpireCacheStore
	private readonly Store: Store

	// Constructor
	constructor() {
		// Load our stores
		const generalStore = this.LoadStore("General")
		const expireCacheStore = this.LoadStore("ExpireCache")

		// Go through and see if anything expire
		for(const itemName of ["ISRCLyrics", "TrackInformation"]) {
			const controlRecord = expireCacheStore[itemName as ExpireCacheStoreItemName]
			let changesMade = false

			for(const key in controlRecord) {
				const cacheControl = controlRecord[key]

				if (cacheControl.ExpiresAt < Date.now()) {
					delete controlRecord[key]
					changesMade = true
				}
			}

			if (changesMade) {
				this.SaveChanges(
					"ExpireCache",
					(itemName as ExpireCacheStoreItemName), JSON.stringify(controlRecord)
				)
			}
		}

		// Define our stores
		this.Store = generalStore
		this.ExpireCacheStore = expireCacheStore

		// Remove our old store (if it exists)
		localStorage.removeItem("BeautifulLyrics")

		// Remove our old ExpireCache store items (if it exists)
		for(const [itemName, version] of ExpireCacheStoreItemVersions) {
			// Remove our mistake entries from the first release
			localStorage.removeItem(this.GetItemLocation("General", itemName, false))

			// Now remove our old-entries
			localStorage.removeItem(this.GetItemLocation("ExpireCache", itemName, false))
			for(let oldVersion = 1; oldVersion < version; oldVersion += 1) {
				localStorage.removeItem(this.GetItemLocation("ExpireCache", itemName, oldVersion))
			}
		}

		// Remove our old General store items (if it exists)
		for(const [itemName, version] of GeneralStoreItemVersions) {
			// Now remove our old-entries
			localStorage.removeItem(this.GetItemLocation("General", itemName, false))
			for(let oldVersion = 1; oldVersion < version; oldVersion += 1) {
				localStorage.removeItem(this.GetItemLocation("General", itemName, oldVersion))
			}
		}
	}

	// Private methods
	private LoadStore(storeName: StoreType) {
		// Grab our templates
		const templates: Record<string, any> = (
			(storeName === "General") ? StoreTemplates
			: ExpireCacheStoreTemplates
		)

		// Attempt to grab our whole store
		const temporaryStore: any = {}
		const missingItems: Record<string, any> = {}
		for(const key in templates) {
			const serializedValue = localStorage.getItem(this.GetItemLocation(storeName, (key as StoreItemName)))

			if (serializedValue === null) {
				missingItems[key] = templates[key]
			} else {
				temporaryStore[key] = JSON.parse(serializedValue)
			}
		}

		// Return our stores
		return {
			...temporaryStore,

			// Deep-clone and ensures we are JSON-serializable
			...(JSON.parse(JSON.stringify(missingItems)))
		}
	}

	private GetItemLocation(storeType: StoreType, itemName: AnyStoreItemName, versionOverride?: (number | false)) {
		const versionNumber = (
			(versionOverride === undefined) ? (
				(storeType === "ExpireCache") ? ExpireCacheStoreItemVersions.get(itemName as ExpireCacheStoreItemName)
				: (storeType === "General") ? GeneralStoreItemVersions.get(itemName as StoreItemName)
				: undefined
			)
			: (versionOverride === false) ? undefined
			: versionOverride
		)

		return `BeautifulLyrics:${storeType}_${itemName}${versionNumber ? `_V${versionNumber}` : ""}`
	}

	private SaveChanges(storeType: StoreType, itemName: AnyStoreItemName, item: string) {
		localStorage.setItem(this.GetItemLocation(storeType, itemName), item)
	}

	private GetExpireCache<N extends ExpireCacheStoreItemName>(expireCacheName: N): ExpireCache<ExpireCacheStoreContents[N]> {
		return this.ExpireCacheStore[expireCacheName]
	}

	// Public Methods
	public GetDynamicItem<I>(itemName: string): (I | undefined) {
		return ((localStorage.getItem(itemName) as unknown as I) ?? undefined)
	}

	public SetDynamicItem(itemName: string, item: string) {
		localStorage.setItem(
			`BeautifulLyrics:Dynamic_${itemName}`,
			item
		)
	}

	public GetItem<K extends StoreItemName>(itemName: K): Store[K] {
		return this.Store[itemName]
	}

	public SaveItemChanges<K extends StoreItemName>(itemName: K) {
		this.SaveChanges("General", itemName, JSON.stringify(this.Store[itemName]))
	}

	public GetFromExpireCache<N extends ExpireCacheStoreItemName>(
		expireCacheName: N,
		key: string
	): (ExpireCacheStoreContents[N] | undefined) {
		// Attempt to get our cache-control
		const controlRecord = this.GetExpireCache(expireCacheName)
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

	public SetExpireCacheItem<N extends ExpireCacheStoreItemName>(
		expireCacheName: N,
		key: string, content: ExpireCacheStoreContents[N],
		expiration: ExpirationSettings
	) {
		// Grab our control-record
		const controlRecord = this.GetExpireCache(expireCacheName)

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
		this.SaveChanges("ExpireCache", expireCacheName, JSON.stringify(controlRecord))
	}
}

export const Cache = new CacheManager()
export type {ExpirationSettings}