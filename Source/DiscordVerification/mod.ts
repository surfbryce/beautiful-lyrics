// Spices
import {
	GlobalMaid,
	OnSpotifyReady,
	HistoryLocation, SpotifyHistory,
	ShowNotification, SpotifyFetch
} from "@socali/Spices/Session"
import { Timeout } from "jsr:@socali/modules/Scheduler"

// Module
OnSpotifyReady
.then(
	() => {
		const CheckForVerifySignal = async (location: HistoryLocation) => {
			const rawDiscordId = location.search.match(/&DiscordId=(\d+)/)?.[1]
			if (rawDiscordId === undefined) {
				return
			}

			const goBackTo = SpotifyHistory.entries[SpotifyHistory.entries.length - 2]
			GlobalMaid.Give(
				Timeout(
					0.05,
					() => SpotifyHistory.push(goBackTo)
				)
			)

			let discordId: bigint
			try {
				discordId = BigInt(rawDiscordId)
			} catch (_) {
				ShowNotification(
					`Cannot Verify Your Discord Account (Invalid Discord Id, ${rawDiscordId})`,
					"error",
					5
				)
				return
			}

			ShowNotification(
				`Verifying your Discord Account with <b>Beautiful Lyrics</b>...`,
				"warning",
				10
			)

			const result = await SpotifyFetch(
				`https://beautiful-lyrics.socalifornian.live/Discord/Spotify/Verify?DiscordId=${discordId}`
			)
			if (result.status !== 200) {
				ShowNotification(
					`Failed to Verify Your Discord Account :( </br> Status Code: ${
						result.status
					} </br> Error Message: ${await result.text()}`,
					"error",
					10
				)
				return
			}

			ShowNotification(
				`Successfully Verified Your Discord Account with <b>Beautiful Lyrics</b>! <br> Check the Discord!`,
				"success",
				10
			)
		}
		CheckForVerifySignal(SpotifyHistory.location)
		GlobalMaid.Give(SpotifyHistory.listen(CheckForVerifySignal))
	}
)