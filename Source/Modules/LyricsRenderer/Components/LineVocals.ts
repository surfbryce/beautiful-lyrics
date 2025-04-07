// Packages
import { Maid, Giveable } from "jsr:@socali/modules/Maid"
import { Signal } from "jsr:@socali/modules/Signal"
import Spring from "jsr:@socali/modules@1.1.0/Spring"

// Modules
import { GetSpline, Clamp } from "../SharedMethods.ts"

// Imported Types
import { SyncedVocals, LyricState } from "../Types.d.ts"
import { LineVocal } from "jsr:@socali/beautiful-lyrics/Types/Lyrics"

// Visual Constants
const GlowRange = [
	{
		Time: 0,
		Value: 0
	}, // Lowest
	{
		Time: 0.5,
		Value: 1
	}, // Highest
	{
		Time: 0.925,
		Value: 1
	}, // Sustain
	{
		Time: 1,
		Value: 0
	} // Rest
]
const GlowSpline = GetSpline(GlowRange)

const GlowDamping = 0.5
const GlowFrequency = 1

// Class
export default class LineVocals implements SyncedVocals, Giveable {
	// Private Properties
	private readonly Maid: Maid = new Maid()

	private readonly Container: HTMLDivElement

	private readonly StartTime: number
	private readonly Duration: number

	private readonly Span: HTMLSpanElement;
	private readonly GlowSpring: Spring;

	private State: LyricState = "Idle"
	private IsSleeping: boolean = true

	private readonly ActivityChangedSignal = this.Maid.Give(new Signal<(isActive: boolean) => void>())
	private readonly RequestedTimeSkipSignal = this.Maid.Give(new Signal<() => void>())

	// Public Properties
	public readonly ActivityChanged = this.ActivityChangedSignal.GetEvent()
	public readonly RequestedTimeSkip = this.RequestedTimeSkipSignal.GetEvent()

	// Constructor
	public constructor(
		lineContainer: HTMLElement, lineMetadata: LineVocal,
		isRomanized: boolean
	) {
		// First create our container
		const container = this.Maid.Give(document.createElement('div'))
		container.classList.add('Vocals')
		container.classList.add('Lead')
		this.Container = container

		// Handle our request time-skip signal
		container.addEventListener(
			'click',
			() => this.RequestedTimeSkipSignal.Fire()
		)

		// Define our start/end times
		this.StartTime = lineMetadata.StartTime
		this.Duration = (lineMetadata.EndTime - lineMetadata.StartTime)

		// Create our main span element
		const syllableSpan = this.Maid.Give(document.createElement('span'))
		syllableSpan.classList.add('Lyric')
		syllableSpan.classList.add('Synced')
		syllableSpan.classList.add('Line')
		syllableSpan.innerText = (isRomanized && lineMetadata.RomanizedText || lineMetadata.Text)
		container.appendChild(syllableSpan)

		// Now create our live-text element
		this.Span = syllableSpan
		this.GlowSpring = new Spring(0, GlowDamping, GlowFrequency)

		// Now set our state
		this.SetToGeneralState(false)

		// Finally, add our vocals to our line
		lineContainer.appendChild(container)
	}

	// Private Methods
	private UpdateLiveTextState = (timeScale: number, forceTo?: true) => {
		// Grab our values
		const glowAlpha = GlowSpline.at(timeScale)

		// Apply them
		if (forceTo) {
			this.GlowSpring.Set(glowAlpha)
		} else {
			this.GlowSpring.Final = glowAlpha
		}
	}

	private UpdateLiveTextVisuals = (timeScale: number, deltaTime: number): boolean => {
		// Update our springs
		const glowAlpha = this.GlowSpring.Update(deltaTime)

		// Now update our objects
		this.Span.style.setProperty(
			"--text-shadow-blur-radius",
			`${4 + (8 * glowAlpha)}px`
		)
		this.Span.style.setProperty(
			"--text-shadow-opacity",
			`${glowAlpha * 50}%`
		)
		this.Span.style.setProperty(
			"--gradient-progress",
			`${0 + (120 * timeScale)}%`
		)

		// Determine if we are finally asleep or not
		return this.GlowSpring.IsSleeping()
	}

	private EvaluateClassState() {
		const removeClasses = ["Active", "Sung"]
		let classToAdd: (string | undefined)

		if (this.State === "Active") {
			removeClasses.splice(0, 1)
			classToAdd = "Active"
		} else if (this.State == "Sung") {
			removeClasses.splice(1, 1)
			classToAdd = "Sung"
		}

		for (const className of removeClasses) {
			if (this.Container.classList.contains(className)) {
				this.Container.classList.remove(className)
			}
		}

		if (classToAdd !== undefined) {
			this.Container.classList.add(classToAdd)
		}
	}

	private SetToGeneralState(state: boolean) {
		const timeScale = (state ? 1 : 0)

		this.UpdateLiveTextState(timeScale, true)
		this.UpdateLiveTextVisuals(timeScale, 0)

		this.State = (state ? "Sung" : "Idle")
		this.EvaluateClassState()
	}

	// Public Methods
	public Animate(songTimestamp: number, deltaTime: number, isImmediate?: true) {
		// Determine our relative time elements
		const relativeTime = (songTimestamp - this.StartTime)
		const timeScale = Clamp((relativeTime / this.Duration), 0, 1)

		// Determine if we should update our visual-states
		const pastStart = (relativeTime >= 0), beforeEnd = (relativeTime <= this.Duration)
		const isActive = (pastStart && beforeEnd)
		const stateNow = (
			isActive ? "Active"
				: pastStart ? "Sung"
					: "Idle"
		)
		const stateChanged = (stateNow != this.State)
		const shouldUpdateVisualState = (stateChanged || isActive || isImmediate)

		// Update our state
		if (stateChanged) {
			const oldState = this.State

			this.State = stateNow

			if (this.State !== "Sung") { // We evaluate this once we've stabilized our animation
				this.EvaluateClassState()
			}

			if (oldState === "Active") {
				this.ActivityChangedSignal.Fire(false)
			} else if (isActive) {
				this.ActivityChangedSignal.Fire(true)
			}
		}

		// Now determine if we should update anything at all
		if (shouldUpdateVisualState) {
			// Flip the sleeping flag as we just changed something
			this.IsSleeping = false

			// Update our live-text state
			this.UpdateLiveTextState(timeScale, (isImmediate || (relativeTime < 0) || undefined))
		}

		if (this.IsSleeping === false) {
			const isSleeping = this.UpdateLiveTextVisuals(timeScale, deltaTime)

			if (isSleeping) {
				this.IsSleeping = true

				if (isActive === false) {
					this.EvaluateClassState()
				}
			}
		}
	}

	public ForceState(state: boolean) {
		this.SetToGeneralState(state)
	}

	public IsActive() {
		return (this.State === "Active")
	}

	public SetBlur(blurDistance: number) {
		this.Container.style.setProperty('--text-blur', `${blurDistance}px`)
	}

	// Deconstructor
	public Destroy() {
		this.Maid.Destroy()
	}
}