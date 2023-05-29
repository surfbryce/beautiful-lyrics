// Project Details
import {version as ExtensionVersion} from '../../package.json'

// Services
import {GlobalMaid} from './Session'

{
	let versionAtNotification: (string | undefined)

	const CheckForUpdate = async () => {
		fetch(
			'https://github.com/surfbryce/beautiful-lyrics/blob/main/dist/beautiful-lyrics.js',
			{
				cache: 'no-cache'
			}
		)
		.then(response => response.text())
		.then(data => {
			// Grab our cached version
			const cachedVersion = data.match(/\d+\.\d+\.\d+/)?.[0]
			let nextUpdateCheck = NextSuccessfulUpdateCheck // Always measured in minutes

			// Make sure that we aren't the same version AND that we haven't already notified the user
			if (
				(cachedVersion !== undefined)
				&& ((cachedVersion !== ExtensionVersion) && (cachedVersion !== versionAtNotification))
			) {
				// Update the version we notified them for
				versionAtNotification = cachedVersion

				// Now send out the notifcation
				Spicetify.showNotification(
					`<h3>Beautiful Lyrics has Updated!</h3>
					<h4 style = 'margin-top: 4px; margin-bottom: 4px; font-weight: normal;'>Reinstall the Extension to get it.</h4>
					<span style = 'opacity: 0.75;'>Version ${ExtensionVersion} -> ${cachedVersion}</span>`,
					(
						((parseFloat(cachedVersion) - parseFloat(ExtensionVersion)) < 0)
						|| (Math.abs(parseInt(cachedVersion) - parseInt(ExtensionVersion)) >= 1)
					),
					7500
				)

				// Now that we have notified the user we can wait a little to notify them again
				nextUpdateCheck = NextDidUpdateCheck
			}

			// Check for an update again in a little bit
			setTimeout(CheckForUpdate, ((nextUpdateCheck * 60) * 1000))
		})
		.catch(() => {
			// Check for an update again in a little bit
			setTimeout(CheckForUpdate, ((NextFailedUpdateCheck * 60) * 1000))
		})
	}

	const WaitForSpicetifyNotification = () => {
		if (Spicetify.showNotification === undefined) {
			setTimeout(WaitForSpicetifyNotification, 0)
		} else {
			// Check for an update immediately
			CheckForUpdate()
		}
	}

	WaitForSpicetifyNotification()
}