// Packages
import {Maid} from '../../../../Packages/Maid'
import { Signal } from '../../../../Packages/Signal'
import { Timeout } from '../../../../Packages/Scheduler'

// Create our Global-Maid (this is used so we can clean-up everything prior to updating)
const GlobalMaid = new Maid()

// Store our current-script/style and handle other-scripts not existing
let Script: HTMLScriptElement
let IsDevelopment = false
{
	let productionScript: (HTMLScriptElement | undefined)
	let developmentScript: (HTMLScriptElement | undefined)

	for(const script of document.getElementsByTagName("script")) {
		if (script.src.includes('beautiful-lyrics.js')) {
			if (script.src.includes("https://xpui.app.spotify.com/")) {
				if (developmentScript === undefined) {
					developmentScript = script
				} else {
					script.remove()
				}
			} else {
				if (productionScript === undefined) {
					productionScript = script
				} else {
					script.remove()
				}
			}
		}
	}

	if (developmentScript === undefined) {
		Script = productionScript!
	} else {
		IsDevelopment = true

		if (productionScript !== undefined) {
			productionScript.remove()
		}

		Script = developmentScript
	}
}

// Spotify Types
type HistoryLocation = {
	pathname: string;
	search: string;
	hash: string;
	state: Record<string, any>;
}

// Store our Spicetify-Classes
const SpicetifyLoadedSignal = new Signal<() => void>()
let AllSpicetifyLoaded = false
let SpotifyPlayer = Spicetify.Player
let SpotifyShowNotification = Spicetify.showNotification
let SpotifyPlatform = Spicetify.Platform
let SpotifyHistory: {
	push: ((path: HistoryLocation | string) => void);
    replace: ((path: HistoryLocation | string) => void);
    goBack: (() => void);
    goForward: (() => void);
    listen: ((listener: (location: HistoryLocation) => void) => () => void);
    location: HistoryLocation;
	entries: HistoryLocation[];
} = SpotifyPlatform?.History
let SpotifyPlaybar = Spicetify.Playbar
let SpotifySession = ((SpotifyPlatform !== undefined) ? Spicetify.Platform.Session : undefined)
{
	const WaitForSpicetify = () => {
		// Update our variables
		SpotifyPlayer = Spicetify.Player
		SpotifyShowNotification = Spicetify.showNotification
		SpotifyPlatform = Spicetify.Platform
		SpotifyHistory = SpotifyPlatform?.History
		SpotifyPlaybar = Spicetify.Playbar
		SpotifySession = ((SpotifyPlatform !== undefined) ? Spicetify.Platform.Session : undefined)

		// Check if we have them all yet
		if (
			(SpotifyPlayer === undefined)
			|| (SpotifySession === undefined)
			|| (SpotifyShowNotification === undefined)
			|| (SpotifyPlatform === undefined)
			|| (SpotifyHistory === undefined)
			|| (SpotifyPlaybar === undefined)
		) {
			GlobalMaid.Give(Timeout(0, WaitForSpicetify), "WaitForSpicetify")
		} else {
			// Set/Fire that we loaded
			AllSpicetifyLoaded = true
			SpicetifyLoadedSignal.Fire()
		}
	}
	
	WaitForSpicetify()
}

// Custom fetch function
export const SpotifyFetch = (url: string) => {
	return fetch(
		url,
		{
			headers: {
				"Authorization": `Bearer ${SpotifySession.accessToken}`,
				"Spotify-App-Version": SpotifyPlatform.version,
				"App-Platform": SpotifyPlatform.PlatformData.app_platform
			}
		}
	)
}

// Exports
export const SpicetifyLoaded = SpicetifyLoadedSignal.GetEvent()
export const IsSpicetifyLoaded = () => AllSpicetifyLoaded
export {GlobalMaid, SpotifyPlayer, SpotifyHistory, SpotifyPlaybar, Script, IsDevelopment, HistoryLocation}