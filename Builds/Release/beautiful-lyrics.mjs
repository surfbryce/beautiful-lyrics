// Define our URLs
const BucketURL = "https://extensions-storage.socalifornian.live/beautiful-lyrics" // This is replaced by the build-script
const LatestVersionURL = "https://extensions.socalifornian.live/version/beautiful-lyrics" // This is replaced by the build-script
const ForceToVersion = undefined // This is replaced by the build-script

// Handle getting our version from the version string
const GetVersionInformation = (text) => {
	const versionMatches = text.match(/(\d+)\.(\d+)\.(\d+)/)

	if (versionMatches === null) {
		return undefined
	}

	return {
		Text: versionMatches[0],

		Major: parseInt(versionMatches[1]),
		Minor: parseInt(versionMatches[2]),
		Patch: parseInt(versionMatches[3])
	}
}

// Wait for Spicetify/Snackbar to load
await new Promise(
	resolve => {
		const interval = setInterval(
			() => {
				if ((Spicetify !== undefined) && (Spicetify.Snackbar !== undefined)) {
					clearInterval(interval)
					resolve()
				}
			},
			10
		)
	}
)

// Handle version updating
const QueuedVersionImports = []
let currentVersion, importing = false
let activeMaid, activeStyling
const UpdateVersion = (toVersion) => {
	// First, make sure that we aren't updating to the current version
	if ((toVersion === currentVersion) || QueuedVersionImports.includes(toVersion)) {
		return
	} else if (importing) {
		QueuedVersionImports.push(toVersion)
		return
	}

	// Update our state
	importing = true
	const fromVersion = currentVersion
	currentVersion = toVersion

	// Determine if we are rolling-back an update (if we are, we need to reload due to import caching)
	const fromVersionInformation = ((fromVersion === undefined) ? undefined : GetVersionInformation(fromVersion))
	const toVersionInformation = GetVersionInformation(toVersion)
	const versionDistance = (
		(fromVersionInformation === undefined) ? undefined
		: {
			Major: (toVersionInformation.Major - fromVersionInformation.Major),
			Minor: (toVersionInformation.Minor - fromVersionInformation.Minor),
			Patch: (toVersionInformation.Patch - fromVersionInformation.Patch)
		}
	)

	// Clean-up our previous imports
	{
		if (activeMaid !== undefined) {
			activeMaid.Destroy()
			activeMaid = undefined
		}

		if (activeStyling !== undefined) {
			activeStyling.remove()
			activeStyling = undefined
		}
	}

	// Create our style immediately
	{
		activeStyling = document.createElement("link")
		activeStyling.rel = "stylesheet"
		activeStyling.href = `${BucketURL}${encodeURIComponent(`@${toVersion}.css`)}`
		document.body.appendChild(activeStyling)
	}

	// Handle importing process
	{
		import(`${BucketURL}${encodeURIComponent(`@${toVersion}.mjs`)}`)
		.then(
			module => {
				// Store our maid (and if we are already destroyed, reload the page)
				activeMaid = module.default
				if (activeMaid.IsDestroyed()) {
					localStorage.setItem(BucketURL, fromVersion) // This is so we can show the notification
					return globalThis.location.reload()
				}

				// Handle notifiying that we updated
				if (versionDistance !== undefined) {
					if (module.UpdateNotice.Type === "Notification") {
						Spicetify.Snackbar.enqueueSnackbar(
							Spicetify.React.createElement(
								"div",
								{
									dangerouslySetInnerHTML: {
										__html: `<h3>${module.UpdateNotice.Name} Updated!</h3>
										<span style = 'opacity: 0.75;'>Version ${fromVersion} -> ${toVersion}</span>`.trim()
									}
								}
							), {
								variant: (
									(versionDistance.Major > 0) ? "success"
									: (
										(versionDistance.Major < 0)
										|| (versionDistance.Minor < 0)
										|| (versionDistance.Patch < 0)
									) ? "warning"
									: "info"
								),
								autoHideDuration: 5000
							}
						)
					}
				}

				// Update our state
				importing = false

				// Check if we have any queued imports
				if (QueuedVersionImports.length > 0) {
					UpdateVersion(QueuedVersionImports.shift())
				}
			}
		)
	}
}

// Update our currentVersion IF we have a version stored (coming from reload)
let cameFromReload = false
{
	const storedVersion = localStorage.getItem(BucketURL)
	if (storedVersion !== null) {
		currentVersion = storedVersion, cameFromReload = true
		localStorage.removeItem(BucketURL)
	}
}

// Now handle receiving our version updates
{
	const GetLatestVersion = () => (
		fetch(LatestVersionURL)
		.then(response => response.text())
		.then(version => UpdateVersion(version))
		.catch(() => setTimeout(GetLatestVersion, 1000))
	)
	GetLatestVersion()
	setInterval(GetLatestVersion, (1000 * 60 * 15))

	if ((cameFromReload === false) && (ForceToVersion !== undefined)) {
		setTimeout(() => UpdateVersion(ForceToVersion), (1000 * 10))
	}
}