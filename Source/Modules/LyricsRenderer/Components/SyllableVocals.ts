// NPM
import { easeSinOut } from 'npm:d3-ease';

// Packages
import { Maid, Giveable } from 'jsr:@socali/modules/Maid'
import { Signal } from 'jsr:@socali/modules/Signal'
import Spring from 'jsr:@socali/modules@1.1.0/Spring'

// Modules
import { GetSpline, Clamp } from '../SharedMethods.ts';

// Imported Types
import { LiveText, LyricState, SyncedVocals } from '../Types.d.ts'
import { SyllableList, SyllableMetadata } from "jsr:@socali/beautiful-lyrics/Types/Lyrics"

// Types
type AnimatedLetter = { // Time is relative to the Syllable
	Start: number;
	Duration: number;
	GlowDuration: number;

	LiveText: LiveText;
}
type AnimatedSyllable = ( // Time is relative to the entire vocal-set
	{
		Start: number;
		Duration: number;

		StartScale: number;
		DurationScale: number;

		LiveText: LiveText;
	}
	& (
		{
			Type: "Syllable";
		}
		| {
			Type: "Letters";
			Letters: AnimatedLetter[];
		}
	)
)

// Visual Constants
const ScaleRange = [
	{
		Time: 0,
		Value: 0.95
	}, // Lowest
	{
		Time: 0.7,
		Value: 1.025
	}, // Highest
	{
		Time: 1,
		Value: 1
	} // Rest
]
const YOffsetRange = [ // This is relative to the font-size
	{
		Time: 0,
		Value: (1 / 100)
	}, // Lowest
	{
		Time: 0.9,
		Value: -(1 / 60)
	}, // Highest
	{
		Time: 1,
		Value: 0
	} // Rest
]
const GlowRange = [
	{
		Time: 0,
		Value: 0
	}, // Lowest
	{
		Time: 0.15,
		Value: 1
	}, // Highest
	{
		Time: 0.6,
		Value: 1
	}, // Sustain
	{
		Time: 1,
		Value: 0
	} // Rest
]
const ScaleSpline = GetSpline(ScaleRange)
const YOffsetSpline = GetSpline(YOffsetRange)
const GlowSpline = GetSpline(GlowRange)

const YOffsetDamping = 0.4
const YOffsetFrequency = 1.25
const ScaleDamping = 0.6
const ScaleFrequency = 0.7
const GlowDamping = 0.5
const GlowFrequency = 1

const CreateSprings = () => {
	return {
		Scale: new Spring(0, ScaleDamping, ScaleFrequency),
		YOffset: new Spring(0, YOffsetDamping, YOffsetFrequency),
		Glow: new Spring(0, GlowDamping, GlowFrequency)
	}
}

// Emphasis Evaluation Constants
const MinimumEmphasizedDuration = 1
const MaximumEmphasizedCharacters = 12
const IsEmphasized = (metadata: SyllableMetadata, isRomanized: boolean) => {
	return (
		((metadata.EndTime - metadata.StartTime) >= MinimumEmphasizedDuration)
		&& ((isRomanized && metadata.RomanizedText || metadata.Text).length <= MaximumEmphasizedCharacters)
	)
}

// Class
export default class SyllableVocals implements SyncedVocals, Giveable {
	// Private Properties
	private readonly Maid: Maid = new Maid()

	private readonly Container: HTMLDivElement

	private readonly StartTime: number
	private readonly Duration: number
	private readonly Syllables: AnimatedSyllable[] = []

	private State: LyricState = "Idle"
	private IsSleeping: boolean = true

	private readonly ActivityChangedSignal = this.Maid.Give(new Signal<(isActive: boolean) => void>())
	private readonly RequestedTimeSkipSignal = this.Maid.Give(new Signal<() => void>())

	// Public Properties
	public readonly ActivityChanged = this.ActivityChangedSignal.GetEvent()
	public readonly RequestedTimeSkip = this.RequestedTimeSkipSignal.GetEvent()

	// Constructor
	public constructor(
		lineContainer: HTMLElement,
		syllablesMetadata: SyllableList, isBackground: boolean,
		isRomanized: boolean
	) {
		// First create our container
		const container = this.Maid.Give(document.createElement('div'))
		container.classList.add('Vocals')
		container.classList.add(isBackground ? 'Background' : 'Lead')
		this.Container = container

		// Handle our request time-skip signal
		container.addEventListener(
			'click',
			() => this.RequestedTimeSkipSignal.Fire()
		)

		// Define our start/end times
		this.StartTime = syllablesMetadata[0].StartTime
		this.Duration = (
			syllablesMetadata[syllablesMetadata.length - 1].EndTime
			- this.StartTime
		)

		// Go through and create our syllable-groups
		const syllableGroups: SyllableList[] = []
		{
			let currentSyllableGroup: SyllableList = []

			for (const syllableMetadata of syllablesMetadata) {
				// Store ourselves
				currentSyllableGroup.push(syllableMetadata)

				// If we aren't part of a word than this means this is either the end of the group or isolated
				if (syllableMetadata.IsPartOfWord === false) {
					syllableGroups.push(currentSyllableGroup)
					currentSyllableGroup = []
				}
			}

			if (currentSyllableGroup.length > 0) {
				syllableGroups.push(currentSyllableGroup)
			}
		}

		// Go through our groups and start building our visuals
		for (const syllableGroup of syllableGroups) {
			// Determine what we are parenting to
			let parentElement: HTMLElement = container
			const syllableCount = syllableGroup.length
			const isInWordGroup = (syllableCount > 1)
			if (isInWordGroup) {
				// Create our parent element
				const parent = this.Maid.Give(document.createElement('span'))
				parent.classList.add('Word')
				parentElement = parent

				// Add our parent to our container
				container.appendChild(parent)
			}

			// Now handle all our syllables
			for (const [index, syllableMetadata] of syllableGroup.entries()) {
				// Determine if we are emphasised
				const isEmphasized = IsEmphasized(syllableMetadata, isRomanized)

				// Create our main span element
				const syllableSpan = this.Maid.Give(document.createElement('span'))
				{
					// Add our classes
					syllableSpan.classList.add('Lyric')
					syllableSpan.classList.add('Syllable')
					if (isEmphasized) {
						syllableSpan.classList.add('Emphasis')
					} else {
						syllableSpan.classList.add('Synced')
					}

					const isEndOfWord = (isInWordGroup && (index === (syllableCount - 1)))
					if (syllableMetadata.IsPartOfWord) {
						syllableSpan.classList.add('PartOfWord')

						if (index === 0) {
							syllableSpan.classList.add('StartOfWord')
						} else if(isEndOfWord) {
							syllableSpan.classList.add('EndOfWord')
						}
					} else if (isEndOfWord) {
						syllableSpan.classList.add('EndOfWord')
					}
				}

				// Determine whether or not our content is a set of letters or a single text
				let letters: (AnimatedLetter[] | undefined)
				if (isEmphasized) {
					// Store all our "letters"
					const letterTexts: string[] = []
					for (const letter of (isRomanized && syllableMetadata.RomanizedText || syllableMetadata.Text)) {
						letterTexts.push(letter)
					}

					// Now determine our relative timestep
					const relativeTimestep = (1 / letterTexts.length)

					// Now generate our letters
					letters = []
					let relativeTimestamp = 0
					for (const letter of letterTexts) {
						// Create our letter-span
						const letterSpan = this.Maid.Give(document.createElement('span'))
						letterSpan.classList.add('Letter')
						letterSpan.classList.add('Synced')
						letterSpan.innerText = letter
						syllableSpan.appendChild(letterSpan)

						// Now store our letter
						letters.push(
							{
								Start: relativeTimestamp,
								Duration: relativeTimestep,
								GlowDuration: (1 - relativeTimestamp),

								LiveText: {
									Object: letterSpan,
									Springs: CreateSprings()
								}
							}
						)

						// Now update our relative-timestamp for the next letter
						relativeTimestamp += relativeTimestep
					}
				} else {
					// Update our text
					syllableSpan.innerText = (isRomanized && syllableMetadata.RomanizedText || syllableMetadata.Text)
				}

				// Determine our time information
				const relativeStart = (syllableMetadata.StartTime - this.StartTime)
				const relativeEnd = (syllableMetadata.EndTime - this.StartTime)

				const relativeStartScale = (relativeStart / this.Duration)
				const relativeEndScale = (relativeEnd / this.Duration)

				const duration = (relativeEnd - relativeStart)
				const durationScale = (relativeEndScale - relativeStartScale)

				// Now determine how we store our information
				const syllableLiveText = {
					Object: syllableSpan,
					Springs: CreateSprings()
				}
				if (isEmphasized) {
					this.Syllables.push(
						{
							Type: "Letters",

							Start: relativeStart,
							Duration: duration,

							StartScale: relativeStartScale,
							DurationScale: durationScale,

							LiveText: syllableLiveText,

							Letters: letters!
						}
					)
				} else {
					this.Syllables.push(
						{
							Type: "Syllable",

							Start: relativeStart,
							Duration: duration,

							StartScale: relativeStartScale,
							DurationScale: durationScale,

							LiveText: syllableLiveText
						}
					)
				}

				// Now parent our syllable-span
				parentElement.appendChild(syllableSpan)
			}
		}

		// Now set our state
		this.SetToGeneralState(false)

		// Finally, add our vocals to our line
		lineContainer.appendChild(container)
	}

	// Private Methods
	private UpdateLiveTextState = (
		liveText: LiveText,
		timeScale: number, glowTimeScale: number,
		forceTo?: true
	) => {
		// Grab our values
		const scale = ScaleSpline.at(timeScale)
		const yOffset = YOffsetSpline.at(timeScale)
		const glowAlpha = GlowSpline.at(glowTimeScale)

		// Apply them
		if (forceTo) {
			liveText.Springs.Scale.Set(scale)
			liveText.Springs.YOffset.Set(yOffset)
			liveText.Springs.Glow.Set(glowAlpha)
		} else {
			liveText.Springs.Scale.Final = scale
			liveText.Springs.YOffset.Final = yOffset
			liveText.Springs.Glow.Final = glowAlpha
		}
	}

	private UpdateLiveTextVisuals = (
		liveText: LiveText, isEmphasized: boolean,
		timeScale: number, deltaTime: number
	): boolean => {
		// Update our springs
		const scale = liveText.Springs.Scale.Update(deltaTime)
		const yOffset = liveText.Springs.YOffset.Update(deltaTime)
		const glowAlpha = liveText.Springs.Glow.Update(deltaTime)

		// Now update our objects
		liveText.Object.style.setProperty(
			"--gradient-progress",
			`${-20 + (120 * timeScale)}%`
		)
		liveText.Object.style.transform = `translateY(calc(var(--lyrics-size) * ${yOffset * (isEmphasized ? 2 : 1)}))`
		liveText.Object.style.scale = scale.toString()
		liveText.Object.style.setProperty(
			"--text-shadow-blur-radius",
			`${4 + (2 * glowAlpha * (isEmphasized ? 3 : 1))}px`
		)
		liveText.Object.style.setProperty(
			"--text-shadow-opacity",
			`${glowAlpha * (isEmphasized ? 100 : 35)}%`
		)

		// Determine if we are finally asleep or not
		return (
			liveText.Springs.Scale.IsSleeping()
			&& liveText.Springs.YOffset.IsSleeping()
			&& liveText.Springs.Glow.IsSleeping()
		)
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

		for (const syllable of this.Syllables) {
			// Set our state and visuals
			this.UpdateLiveTextState(syllable.LiveText, timeScale, timeScale, true)
			this.UpdateLiveTextVisuals(syllable.LiveText, false, timeScale, 0)

			// Now if we have letters update them as well
			if (syllable.Type === "Letters") {
				for (const letter of syllable.Letters) {
					this.UpdateLiveTextState(letter.LiveText, timeScale, timeScale, true)
					this.UpdateLiveTextVisuals(letter.LiveText, true, timeScale, 0)
				}
			}
		}

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

		// Determine if we should flip the sleeping flag
		if (shouldUpdateVisualState) {
			this.IsSleeping = false
		}

		// Now determine if we should update anything at all
		const isMoving = (this.IsSleeping === false)
		if (shouldUpdateVisualState || isMoving) {
			let isSleeping = true

			for (const syllable of this.Syllables) {
				// Determine our time-scale for the syllable
				const syllableTimeScale = Clamp(
					((timeScale - syllable.StartScale) / syllable.DurationScale),
					0, 1
				)

				// Handle our letters if we are emphasized
				if (syllable.Type == "Letters") {
					// Determine our timeAlpha
					const timeAlpha = easeSinOut(syllableTimeScale)

					// Then update our letters
					for (const letter of syllable.Letters) {
						// Get our time-scales
						const letterTime = (timeAlpha - letter.Start)
						const letterTimeScale = Clamp(
							(letterTime / letter.Duration),
							0, 1
						)
						const glowTimeScale = Clamp(
							(letterTime / letter.GlowDuration),
							0, 1
						)

						// Now handle updating
						if (shouldUpdateVisualState) {
							this.UpdateLiveTextState(
								letter.LiveText,
								letterTimeScale, glowTimeScale,
								isImmediate
							)
						}

						if (isMoving) {
							const letterIsSleeping = this.UpdateLiveTextVisuals(
								letter.LiveText, true,
								letterTimeScale, deltaTime
							)

							if (letterIsSleeping === false) {
								isSleeping = false
							}
						}
					}
				}

				// Handle our main live-text
				{
					if (shouldUpdateVisualState) {
						this.UpdateLiveTextState(
							syllable.LiveText,
							syllableTimeScale, syllableTimeScale,
							isImmediate
						)
					}

					if (isMoving) {
						const syllableIsSleeping = this.UpdateLiveTextVisuals(
							syllable.LiveText, false,
							syllableTimeScale, deltaTime
						)

						if (syllableIsSleeping === false) {
							isSleeping = false
						}
					}
				}
			}

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