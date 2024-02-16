// Debug Constant
const DoNotCache = true

// Modules
import { IsDevelopment } from "./Session"

// Types
import { SpotifyTrackInformation } from "./Player/Song"
import { ProviderLyrics, TransformedLyrics, RomanizedLanguage } from "./Player/LyricsUtilities"

// Cache Types
type ExpirationSettings = {
	Duration: number;
	Unit: ("Weeks" | "Months");
}

type ExpireItem<C> = {
	ExpiresAt: number;
	CacheVersion: number;

	Content: C;
}

type ExpireCachesItemTypes = {
	TrackInformation: SpotifyTrackInformation;
	ProviderLyrics: (ProviderLyrics | false); // This is for storing lyrics from the provider
	TransformedLyrics: (TransformedLyrics | false); // This is for storing the transformed lyrics
}
type ExpireCacheName = (keyof ExpireCachesItemTypes)
type Store = {
	Analytics: {
		LastVisitedAt?: number;
	},

	LyricViews: {
		CardLyricsVisible: boolean;
		PlaybarDetailsHidden: boolean;
		RomanizedLanguages: {[key in RomanizedLanguage]: boolean};
	};
}
type StoreItemName = (keyof Store)

// Define our store-templates
const StoreTemplates: Store = {
	Analytics: {},

	LyricViews: {
		CardLyricsVisible: false,
		PlaybarDetailsHidden: false,
		RomanizedLanguages: {
			Chinese: false,
			Japanese: false,
			Korean: false,
		}
	},
}

// Define StoreItem Versions
const ExpireCacheStoreItemVersions: Map<ExpireCacheName, number> = new Map()
ExpireCacheStoreItemVersions.set("TrackInformation", 2)
ExpireCacheStoreItemVersions.set("ProviderLyrics", 2)
ExpireCacheStoreItemVersions.set("TransformedLyrics", 1)

const StoreItemVersions: Map<StoreItemName, number> = new Map()
StoreItemVersions.set("Analytics", 1)
StoreItemVersions.set("LyricViews", 1)

// Cache-Control Class
class CacheManager {
	// Private Properties
	private readonly Store: Store

	// Constructor
	constructor() {
		// Load our stores
		const generalStore = this.LoadStore()

		// Define our stores
		this.Store = generalStore

		// Handle removing our old cache-items
		{
			// Remove our old ExpireCache store items
			const OldExpireCacheStoreItemVersions: Map<string, number> = new Map()
			OldExpireCacheStoreItemVersions.set("TrackInformation", 1)
			OldExpireCacheStoreItemVersions.set("ISRCLyrics", 11)

			for(const [itemName, version] of OldExpireCacheStoreItemVersions) {
				// Now remove our old-entries
				localStorage.removeItem(`BeautifulLyrics:ExpireCache_${itemName}`)
				for(let oldVersion = 1; oldVersion <= version; oldVersion += 1) {
					localStorage.removeItem(`BeautifulLyrics:ExpireCache_${itemName}_V${oldVersion}`)
				}
			}

			// Remove our old General store items (if it exists)
			for(const [itemName, version] of StoreItemVersions) {
				// Now remove our old-entries
				localStorage.removeItem(this.GetItemLocation(itemName, false))
				for(let oldVersion = 1; oldVersion < version; oldVersion += 1) {
					localStorage.removeItem(this.GetItemLocation(itemName, oldVersion))
				}
			}
		}
	}

	// Private methods
	private LoadStore() {
		// Grab our templates
		const templates = StoreTemplates

		// Attempt to grab our whole store
		const temporaryStore: any = {}
		const missingItems: Record<string, any> = {}
		for(const [key, template] of Object.entries(templates)) {
			const serializedValue = localStorage.getItem(this.GetItemLocation(key as StoreItemName))

			if (serializedValue === null) {
				missingItems[key] = template
			} else {
				const value = JSON.parse(serializedValue)
				temporaryStore[key] = value

				for (const [templateKey, templateValue] of Object.entries(template)) {
					if (value[templateKey] === undefined) {
						if (typeof templateValue === "object") {
							value[templateKey] = JSON.parse(JSON.stringify(templateValue))
						} else {
							value[key] = templateValue
						}
					}
				}
			}
		}

		// Return our stores
		return {
			...temporaryStore,

			// Deep-clone and ensures we are JSON-serializable
			...(JSON.parse(JSON.stringify(missingItems)))
		}
	}

	private GetItemLocation(itemName: StoreItemName, versionOverride?: (number | false)) {
		const versionNumber = (
			(versionOverride === undefined) ? StoreItemVersions.get(itemName as StoreItemName)
			: (versionOverride === false) ? undefined
			: versionOverride
		)

		return `BeautifulLyrics:General_${itemName}${versionNumber ? `_V${versionNumber}` : ""}`
	}

	private SaveChanges(itemName: StoreItemName, item: string) {
		localStorage.setItem(this.GetItemLocation(itemName), item)
	}

	private GetFromCacheAPI<C>(cacheName: string, itemName: string): Promise<C | undefined> {
		return (
			caches.open("BeautifulLyrics")
			.then(cache => cache.match(`/${cacheName}/${itemName}`))
			.then(response => response?.json())
		)
	}

	private UpdateCacheAPI(cacheName: string, itemName: string, content: any) {
		return (
			caches.open("BeautifulLyrics")
			.then(
				cache => cache.put(
					`/${cacheName}/${itemName}`,
					new Response(
						JSON.stringify(content),
						{
							headers: {
								'Content-Type': 'application/json'
							}
						}
					)
				)
			)
			.catch(
				error => {
					console.warn(`Failed to Update Cache API (${cacheName}/${itemName})`)
					console.error(error)
				}
			)
		)
	}

	// Public Dynamic Store Methods
	public GetDynamicItem<I>(itemName: string): (I | undefined) {
		return ((localStorage.getItem(itemName) as unknown as I) ?? undefined)
	}

	public SetDynamicItem(itemName: string, item: string) {
		localStorage.setItem(
			`BeautifulLyrics:Dynamic_${itemName}`,
			item
		)
	}

	// Public Store Methods
	public GetItem<K extends StoreItemName>(itemName: K): Store[K] {
		return this.Store[itemName]
	}

	public SaveItemChanges<K extends StoreItemName>(itemName: K) {
		this.SaveChanges(itemName, JSON.stringify(this.Store[itemName]))
	}

	// Public Expire Cache Methods
	public GetFromExpireCache<N extends ExpireCacheName>(
		expireCacheName: N,
		itemName: string
	): Promise<ExpireCachesItemTypes[N] | undefined> {
		if (DoNotCache && IsDevelopment) {
			return Promise.resolve(undefined)
		}

		return (
			this.GetFromCacheAPI<ExpireItem<ExpireCachesItemTypes[N]>>(`ExpireCache/${expireCacheName}`, itemName)
			.then(
				expireItem => {
					// If we don't have an item then just force-return
					if (expireItem === undefined) {
						return undefined
					}

					// Check if we're on the same version
					if (expireItem.CacheVersion !== ExpireCacheStoreItemVersions.get(expireCacheName)) {
						return undefined
					}

					// Check if we're expired
					if (expireItem.ExpiresAt < Date.now()) {
						return undefined
					}

					// Otherwise, return our content
					return expireItem.Content
				}
			)
		)
	}

	public SetExpireCacheItem<N extends ExpireCacheName>(
		expireCacheName: N,
		itemName: string, content: ExpireCachesItemTypes[N],
		expiration: ExpirationSettings
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

		// Create our expire-item
		const expireItem: ExpireItem<ExpireCachesItemTypes[N]> = {
			ExpiresAt: expireAt,
			CacheVersion: ExpireCacheStoreItemVersions.get(expireCacheName)!,

			Content: content
		}

		// Store ourselves
		return this.UpdateCacheAPI(
			`ExpireCache/${expireCacheName}`,
			itemName, expireItem
		)
	}
}

export const Cache = new CacheManager()
export type {ExpirationSettings}