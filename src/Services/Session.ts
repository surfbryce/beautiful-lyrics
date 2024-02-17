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
let SpotifySnackbar = (Spicetify as any).Snackbar
{
	const WaitForSpicetify = () => {
		// Update our variables
		SpotifyPlayer = Spicetify.Player
		SpotifyShowNotification = Spicetify.showNotification
		SpotifyPlatform = Spicetify.Platform
		SpotifyHistory = SpotifyPlatform?.History
		SpotifyPlaybar = Spicetify.Playbar
		SpotifySnackbar = (Spicetify as any).Snackbar

		// Check if we have them all yet
		if (
			(SpotifyPlayer === undefined)
			|| (SpotifyShowNotification === undefined)
			|| (SpotifyPlatform === undefined)
			|| (SpotifyHistory === undefined)
			|| (SpotifyPlaybar === undefined)
			|| (SpotifySnackbar === undefined)
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
type TokenProviderResponse = {accessToken: string, accessTokenExpirationTimestampMs: number}
let tokenProviderResponse: (TokenProviderResponse | undefined)
let accessTokenPromise: Promise<string> | undefined
const NeedsToRefresh = (tokenProviderResponse?: TokenProviderResponse): Promise<boolean> => {
	if (tokenProviderResponse === undefined) {
		return Promise.resolve(true)
	}

	// Otherwise, check if we have to wait at all
	const timeUntilRefresh = ((tokenProviderResponse.accessTokenExpirationTimestampMs - Date.now()) / 1000)
	if (timeUntilRefresh > 2) {
		return Promise.resolve(false)
	} else if (timeUntilRefresh > 0) {
		const initialPromise = (
			new Promise(resolve => GlobalMaid.Give(Timeout((timeUntilRefresh + 0.5), resolve)))
			.then(_ => true)
		)
		accessTokenPromise = (initialPromise as any)
		return initialPromise
	}

	// Otherwise, we need to refresh
	return Promise.resolve(true)
}
export const GetAccessToken = (): Promise<string> => {
	if (accessTokenPromise !== undefined) {
		return accessTokenPromise
	}

	return (
		NeedsToRefresh(tokenProviderResponse)
		.then(
			needsToRefresh => {
				if (needsToRefresh) {
					return (
						SpotifyPlatform.AuthorizationAPI._tokenProvider()
						.then(
							(result: TokenProviderResponse) => {
								tokenProviderResponse = result, accessTokenPromise = undefined
								return GetAccessToken() // Re-run this to make sure we don't need to refresh again
							}
						)
					)
				}

				return Promise.resolve(tokenProviderResponse!.accessToken)
			}
		)
	)
}

export const SpotifyFetch = (url: string) => {
	return (
		GetAccessToken()
		.then(
			accessToken => fetch(
				url,
				{
					headers: {
						"Authorization": `Bearer ${accessToken}`,
						"Spotify-App-Version": SpotifyPlatform.version,
						"App-Platform": SpotifyPlatform.PlatformData.app_platform
					}
				}
			)
		)
	)
}

// Custom notification function
export const ShowNotification = (
	html: string, variant: ("info" | "success" | "warning" | "error" | "default"),
	hideAfter: number
) => {
	SpotifySnackbar.enqueueSnackbar(
		Spicetify.React.createElement(
			"div",
			{
				dangerouslySetInnerHTML: {
					__html: html.trim()
				}
			}
		), {
			variant: variant,
			autoHideDuration: (hideAfter * 1000)
		}
	)
}

// Exports
export const SpicetifyLoaded = SpicetifyLoadedSignal.GetEvent()
export const IsSpicetifyLoaded = () => AllSpicetifyLoaded
export {GlobalMaid, SpotifyPlayer, SpotifyHistory, SpotifyPlaybar, Script, IsDevelopment, HistoryLocation}