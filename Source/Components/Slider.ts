// Web-Modules
import { Maid, Giveable } from "jsr:@socali/modules/Maid"
import { Signal } from "jsr:@socali/modules/Signal"
import { Defer } from "jsr:@socali/modules/Scheduler"

// Components
import Button from "./Button.ts"

// Progress Calculation Helper
const CalculateProgressFromMouse = (bar: HTMLDivElement, mouseEvent: MouseEvent) => {
	const barBounds = bar.getBoundingClientRect()
	return Math.min(1, Math.max(0, (mouseEvent.clientX - barBounds.left) / barBounds.width))
}

// Class
export default class Slider implements Giveable {
	// Create our maid
	private Maid = new Maid()

	// Signal Definitions
	public readonly IsActiveChanged
	public readonly ProgressChanged

	// State Method Definitions
	public readonly GetHitBox
	public readonly IsActive
	public readonly GetProgress
	public readonly SetProgress

	// Constructor
	constructor(
		bar: HTMLDivElement,
		maximumValue: number = 1,
		userValueChangeStep?: number,
		minimumValue: number = 0
	) {
		// Determine what we should use as our Hitbox
		const hitbox = (bar.querySelector<HTMLDivElement>(".Hitbox") ?? bar)
		this.GetHitBox = () => hitbox

		// Create our signals
		const [isActiveChanged, progressChanged] = this.Maid.GiveItems(
			new Signal<(isActive: boolean, mouseEvent: MouseEvent, currentProgress?: number) => void>(),
			new Signal<(progress: number, changedByUser?: true) => void>()
		)
		this.IsActiveChanged = isActiveChanged.GetEvent(), this.ProgressChanged = progressChanged.GetEvent()

		// Store our active/mouse-event state and handle cancelling it
		let lastActiveMouseEvent: (MouseEvent | undefined)
		let active = false
		const CancelActiveState = (mouseEvent: MouseEvent = lastActiveMouseEvent!, dontSendProgress?: true) => {
			// Don't do anything IF we're already NOT active
			if (active === false) {
				return
			}

			// Immediately stop our MouseDrag
			this.Maid.Clean("MouseDrag")

			// Remove our class
			bar.classList.toggle("Active", false)

			// Set the inactive state
			active = false
			lastActiveMouseEvent = undefined
			isActiveChanged.Fire(false, mouseEvent, (dontSendProgress ? undefined : progress))
		}

		// Store our progress and state methods
		let progress = 0
		const SetProgress = (newProgress: number, changedByUser?: true) => {
			progress = (
				((userValueChangeStep === undefined) || (changedByUser === undefined)) ? newProgress
				: (Math.floor(newProgress / userValueChangeStep) * userValueChangeStep)
			)
			bar.style.setProperty("--SliderProgress", ((progress - minimumValue) / (maximumValue - minimumValue)).toString())
			progressChanged.Fire(progress, changedByUser)
		}
		this.IsActive = () => active
		this.GetProgress = () => progress
		this.SetProgress = (desiredProgress: number, newMaximumValue?: number) => {
			if (active) {
				CancelActiveState(undefined, true)
			}

			if (newMaximumValue !== undefined) {
				maximumValue = newMaximumValue
			}

			SetProgress(Math.max(minimumValue, Math.min(desiredProgress, maximumValue)))
		}

		// Handle bar interactions (only need the bar since most of the handle is on it)
		{
			const UpdateProgressToMouse = (mouseEvent: MouseEvent) => {
				lastActiveMouseEvent = mouseEvent
				SetProgress(
					(minimumValue + (CalculateProgressFromMouse(bar, mouseEvent) * (maximumValue - minimumValue))),
					true
				)
			}
			const StartListeningForMouseDrag = () => {
				globalThis.addEventListener("mousemove", UpdateProgressToMouse)
				this.Maid.Give(() => globalThis.removeEventListener("mousemove", UpdateProgressToMouse), "MouseDrag")
			}

			const barButton = this.Maid.Give(new Button(hitbox, false, true))
			barButton.Pressed.Connect(
				(mouseEvent) => {
					// Set the active state
					active = true
					isActiveChanged.Fire(true, mouseEvent, progress)

					// Update our class-list
					bar.classList.toggle("Active", true)

					// Immediately set our progress
					UpdateProgressToMouse(mouseEvent)

					// Wait until the next process to start looking for mouse movements (prevents accidental micro-adjusting)
					this.Maid.Give(
						Defer(StartListeningForMouseDrag),
						"MouseDrag"
					)
				}
			)
			barButton.Released.Connect(CancelActiveState)
		}
	}

	// Deconstructor
	public Destroy() {
		this.Maid.Destroy()
	}
}