// Styles
import "./style.scss"

// Spices
import { GlobalMaid } from "@socali/Spices/Session"
import { GetInstantStore } from "jsr:@socali/spices/Spicetify/Services/Cache"

// Web-Modules
import { Maid } from "jsr:@socali/modules/Maid"

// Shared Modules
import { CreateElement } from "../LyricViews/Shared.ts"

// Components
import Button from "../Components/Button.ts"

// Element Sources
const PopupElement = `
<div id="BeautifulLyrics_UpdatePopup">
	<span class="UpdateTitle">NEW Update!</span>
	<span class="ExtensionTitle">Beautiful Lyrics</span>
	<div class="BackgroundRenderingImprovements">
		<span class="Title">Improved Performance!</span>
		<span class="SubTitle">Drastically less GPU/CPU Usage and Bug Fixes!</span>
		<a class="TechnicalExplanation">Check out the Technical Explanation</a>
		<div class="VideoGradient"></div>
		<video
			autoplay loop muted playsinline
			class="BackgroundRenderingImprovements"
			src="https://images.socalifornian.live/BetterBackgroundRenderingPerformance.webm"
		></video>
	</div>
	<div class="PopupButtons">
		<button class="DiscordButton">
			<img src="https://cdn.prod.website-files.com/6257adef93867e50d84d30e2/66e3d7f4ef6498ac018f2c55_Symbol.svg">
			<span>Discord</span>
		</button>
		<button class="CloseButton">
			<span>Close</span>
		</button>
	</div>
</div>
`

// Constructor
export default function() {
	const seenUpdatesStore = GetInstantStore<Record<string, true>>(
		"BeautifulLyrics/SeenUpdates", 1,
		{}
	)
	if (seenUpdatesStore.Items.BackgroundRenderingImprovements === true) {
		return
	}
	seenUpdatesStore.Items.BackgroundRenderingImprovements = true
	seenUpdatesStore.SaveChanges()

	const popupMaid = GlobalMaid.Give(new Maid(), "UpdatePopup")
	const popupElement = popupMaid.Give(CreateElement(PopupElement))

	// Background Rendering Improvements
	{
		const technicalExplanationLabel = popupElement.querySelector<HTMLLinkElement>(".TechnicalExplanation")!
		const technicalExplanationButton = popupMaid.Give(new Button(technicalExplanationLabel))
		technicalExplanationButton.Clicked.Connect(
			() => {
				globalThis.open("", "_blank")
			}
		)
	}

	// Popup Buttons
	{
		const discordButtonLabel = popupElement.querySelector<HTMLButtonElement>(".DiscordButton")!
		const closeButtonLabel = popupElement.querySelector<HTMLButtonElement>(".CloseButton")!
	
		const discordButton = popupMaid.Give(new Button(discordButtonLabel))
		discordButton.Clicked.Connect(
			() => {
				globalThis.open("https://discord.com/invite/884XC8Fsfa", "_blank")
			}
		)

		const closeButton = popupMaid.Give(new Button(closeButtonLabel))
		closeButton.Clicked.Connect(
			() => {
				GlobalMaid.Clean("UpdatePopup")
			}
		)
	}

	document.body.appendChild(popupElement)
}