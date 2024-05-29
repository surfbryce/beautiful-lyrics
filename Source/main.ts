// Stylings
import './Stylings/main.scss'

// NPM Packages
import { bindKeyCombo, unbindKeyCombo } from "npm:@rwh/keystrokes"

// Build Spices
import { UpdateNoticeConfiguration } from "jsr:@socali/spices/AutoUpdate/UpdateNotice"

// Spices
import {
	GlobalMaid,
	OnSpotifyReady, Spotify,
	SpotifyPlatform, SpotifyInternalFetch,
	ShowNotification
} from "@socali/Spices/Session"
import { GetInstantStore } from "jsr:@socali/spices/Spicetify/Services/Cache"

// Web-Modules
import { Timeout } from 'jsr:@socali/modules/Scheduler'

// Singletons
import "./LyricViews/mod.ts"

// Shared Methods
import { CreateElement } from "./LyricViews/Shared.ts"

// Wait for Spotify THEN start our services
OnSpotifyReady
.then( // Handle our Debugging (gives Linux an opportunity to get this information)
	_ => {
		const OnGetSpotifyAndSpicetifyInformation = () => {
			SpotifyInternalFetch.get("sp://desktop/v1/version")
			.catch(
				(error) => ShowNotification(`Failed to Copy Spotify/Spicetify Information (${error})`, "error", 10)
			)
			.then(
				(
					response: {
						buildSystemID: string;
						buildType: string;
						cefRuntime: string;
						cefVersion: string;
						platform: string;
						version: string;
					}
				) => {
					const informationFormat = `
						Spotify Version: ${response.version}
						Spotify Runtime: ${response.cefVersion}
						Spicetify Version: ${Spotify.Config.version}
						Spicetify Theme: ${Spotify.Config.current_theme}${
							(Spotify.Config.color_scheme.length === 0) ? "" : ` / ${Spotify.Config.color_scheme}`
						}
						Spicetify Extensions: [${Spotify.Config.extensions.join(", ")}]
						Spicetify Custom Apps: [${Spotify.Config.custom_apps.join(", ")}]
					`.trim().replace(/\t/g, "")
					{
						navigator.clipboard.writeText(informationFormat)
						.catch(
							(error) => ShowNotification(`Failed to Copy Spotify/Spicetify Information (${error})`, "error", 10)
						)
						.then(
							() => ShowNotification("Copied Spotify/Spicetify Information", "success", 5)
						)
					}
				}
			)
			
		}
		bindKeyCombo("shift+b+l>i", OnGetSpotifyAndSpicetifyInformation)
		GlobalMaid.Give(() => unbindKeyCombo("shift+b+l>i", OnGetSpotifyAndSpicetifyInformation))
	
		// Create our reusable link element (for saving)
		const linkElement = CreateElement<HTMLLinkElement & { download: string }>(`<a></a>`)
		const SaveContentToFile = (downloadName: string, content: string, contentType: string) => {
			const jsonBlob = new Blob([content], { type: contentType })
			const url = URL.createObjectURL(jsonBlob)
			linkElement.download = downloadName
			linkElement.href = url
			linkElement.click()
			URL.revokeObjectURL(url)
		}

		// Handle file-saving
		const OnSaveSpotifyHTML = () => SaveContentToFile("Spotify.html", document.documentElement.innerHTML, "text/html")
		const OnSaveSpotifyCSS = () => (
			fetch("xpui.css")
			.then((response) => response.text())
			.then(text => SaveContentToFile("Spotify.css", text, "text/css"))
			.catch((error) => ShowNotification(`Failed to Save Spotify CSS (${error})`, "error", 10))
		)
		bindKeyCombo("shift+b+l>h", OnSaveSpotifyHTML)
		bindKeyCombo("shift+b+l>c", OnSaveSpotifyCSS)
		GlobalMaid.GiveItems(
			() => unbindKeyCombo("shift+b+l>h", OnSaveSpotifyHTML),
			() => unbindKeyCombo("shift+b+l>c", OnSaveSpotifyCSS)
		)
	}
)
.then(
	_ => {
		/*
			For anybody coming across this - I will always be clear and incredibly transparent about what I do
			with this information.

			First off - in the release this comes out in I am flat out stating that I implemented this feature.
			I'm not going to hide anything.
			
			Additionally, I am using CloudFlare - which has an analytics services that doesn't do any
			fingerprinting, cookie tracking, or anything nasty. It is purely based off the request made
			to their analytics-api.

			I am purely using this to determine how many people are actually using my extension. My reasoning
			for this is because when I first published the 2.5.0 stepping-stone release with the lyrics backend
			I thought I had about maybe 100 people using the extension (since I had 44 stars). However, I was
			gravely mistaken. I was recieving almost 2-3 requests a second - which is fine, I can handle that -
			but I had no idea I had that many users. So, it's important to know how many people are actively
			using my extension (as in actively, I mean general figure).

			I apologize to anyone who may think this is invasive - but I am not doing anything with this data
			and never plan to. I can't even store it. If you have an issue please contact me through the
			Spicetify discord - my username is @socalifornian.
		*/
		const AnalyticsStore = GetInstantStore<
			{
				LastVisitedAt?: number;
			}
		>(
			"BeautifulLyrics/Analytics", 1,
			{}
		)

		const UpdateAnalytics = () => {
			// Remove our existing analytics (always called after we register ourselves analytically)
			GlobalMaid.Clean("Analytics")

			// Grab our current-date and when we last visited
			const lastVisitedAt = AnalyticsStore.Items.LastVisitedAt
			const lastVisitedAtDate = ((lastVisitedAt !== undefined) ? new Date(lastVisitedAt) : undefined)
			const currentDate = new Date()

			// Set our date to the beginning of the day
			currentDate.setHours(0, 0, 0, 0)

			// Check if we're on a different day or not
			const dateStartTime = currentDate.getTime()
			if (lastVisitedAtDate?.getTime() !== dateStartTime) {
				// Update our cache
				AnalyticsStore.Items.LastVisitedAt = dateStartTime
				AnalyticsStore.SaveChanges()

				// Now insert our analytics
				const tracker = GlobalMaid.Give(document.createElement('iframe'), "Analytics")
				tracker.src = "https://track.beautiful-lyrics.socalifornian.live/"
				tracker.style.display = 'none'
				document.body.appendChild(tracker)
			}

			// Now check again soon
			GlobalMaid.Give(Timeout(60, UpdateAnalytics))
		}

		UpdateAnalytics()
	}
)

// Finally, return our maid and also return our UpdateNotificationDetailer
export const UpdateNotice: UpdateNoticeConfiguration = {
	Type: "Notification",
	Name: "Beautiful Lyrics"
}
export default GlobalMaid