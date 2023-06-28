// Packages
import { Maid, Giveable } from "../../../../Packages/Maid"

// Modules
import { LyricsScroller, VocalGroups } from "./LyricsRenderer/LyricsScroller"

// Components
import InterludeVisual from "./LyricsRenderer/Components/Interlude"
import StaticVocals from "./LyricsRenderer/Components/StaticVocals"
import LineVocals from "./LyricsRenderer/Components/LineVocals"
import SyllableVocals from "./LyricsRenderer/Components/SyllableVocals"

// Imported Types
import { ParsedLyrics } from "../Services/Player/LyricsParser"
import { BaseVocals, SyncedVocals } from "./LyricsRenderer/Types"
import { Song } from "../Services/Player/Song"

// CSS
import "../Stylings/Lyrics.scss"

// Class
export default class LyricsRenderer implements Giveable {
	// Private Properties
	private Maid: Maid = new Maid()

	// Constructor
	constructor(parentContainer: HTMLDivElement, song: Song, parsedLyrics: ParsedLyrics) {
		// Create our containers
		const scrollContainer = this.Maid.Give(document.createElement("div"))
		scrollContainer.classList.add("LyricsScrollContainer")
		const lyricsContainer = this.Maid.Give(document.createElement("div"))
		lyricsContainer.classList.add("Lyrics")
		scrollContainer.appendChild(lyricsContainer)

		// Now set our natural-alignment
		lyricsContainer.classList.add(`NaturallyAligned${parsedLyrics.NaturalAlignment}`)

		// Now handle creating our vocals
		if (parsedLyrics.Type === "Static") {
			// Populate our lines (not technically VocalGroups since we're static)
			const lines: VocalGroups<BaseVocals> = []
			for (const line of parsedLyrics.Lyrics) {
				// Create our container
				const lineContainer = this.Maid.Give(document.createElement("div"))
				lineContainer.classList.add("VocalsGroup")

				// Now add our static vocals
				lines.push(
					{
						GroupContainer: lineContainer,
						Vocals: [this.Maid.Give(new StaticVocals(lineContainer, line))]
					}
				)

				// Parent our container
				lyricsContainer.appendChild(lineContainer)
			}

			// Create our scroller
			this.Maid.Give(new LyricsScroller(scrollContainer, lyricsContainer, lines, false))
		} else {
			// Store our vocal-groups
			const vocalGroups: VocalGroups<SyncedVocals> = []
			const vocalGroupStartTimes: number[] = []

			// Now populate our vocal-groups based on our type
			if (parsedLyrics.Type === "Line") {
				for (const vocalGroup of parsedLyrics.VocalGroups) {
					// Create our container
					const vocalGroupContainer = this.Maid.Give(document.createElement("button"))
					vocalGroupContainer.classList.add("VocalsGroup")

					// Determine our how we populate/manipulate this container
					if (vocalGroup.Type === "Vocal") {
						// Add our alignment
						if (vocalGroup.OppositeAligned) {
							vocalGroupContainer.classList.add("AlignedOpposite")
						}

						// Now add our lead/background vocals
						vocalGroups.push(
							{
								GroupContainer: vocalGroupContainer,
								Vocals: [this.Maid.Give(new LineVocals(vocalGroupContainer, vocalGroup))]
							}
						)
						vocalGroupStartTimes.push(vocalGroup.StartTime)
					} else {
						vocalGroups.push(
							{
								GroupContainer: vocalGroupContainer,
								Vocals: [this.Maid.Give(new InterludeVisual(vocalGroupContainer, vocalGroup))]
							}
						)
						vocalGroupStartTimes.push(vocalGroup.StartTime)
					}

					// Parent our container
					lyricsContainer.appendChild(vocalGroupContainer)
				}
			} else {
				for (const vocalGroup of parsedLyrics.VocalGroups) {
					// Create our container
					const vocalGroupContainer = this.Maid.Give(document.createElement("button"))
					vocalGroupContainer.classList.add("VocalsGroup")

					// Determine our how we populate/manipulate this container
					if (vocalGroup.Type === "Vocal") {
						// Add our alignment
						if (vocalGroup.OppositeAligned) {
							vocalGroupContainer.classList.add("AlignedOpposite")
						}

						// Now add our lead/background vocals
						const vocals = []
						vocals.push(this.Maid.Give(new SyllableVocals(vocalGroupContainer, vocalGroup.Lead, false)))
						if (vocalGroup.Background !== undefined) {
							vocals.push(
								this.Maid.Give(new SyllableVocals(vocalGroupContainer, vocalGroup.Background, true))
							)
						}
						vocalGroups.push(
							{
								GroupContainer: vocalGroupContainer,
								Vocals: vocals
							}
						)
						vocalGroupStartTimes.push(vocalGroup.StartTime)
					} else {
						vocalGroups.push(
							{
								GroupContainer: vocalGroupContainer,
								Vocals: [this.Maid.Give(new InterludeVisual(vocalGroupContainer, vocalGroup))]
							}
						)
						vocalGroupStartTimes.push(vocalGroup.StartTime)
					}

					// Parent our container
					lyricsContainer.appendChild(vocalGroupContainer)
				}
			}

			// Now create our scroller
			const scroller = this.Maid.Give(
				new LyricsScroller(
					scrollContainer, lyricsContainer,
					vocalGroups, true
				)
			)
			
			// Handle our time-update
			this.Maid.Give(
				song.TimeStepped.Connect(
					(timestamp, deltaTime, skipped) => {
						this.Update(
							scroller, vocalGroups,
							timestamp, deltaTime, skipped
						)
					}
				)
			)

			// Immediately update ourselves
			this.Update(
				scroller, vocalGroups,
				song.GetTimestamp(), (1 / 60)
			)

			// Handle time-skipping
			for (const [index, vocalGroup] of vocalGroups.entries()) {
				const startTime = vocalGroupStartTimes[index]
				
				for (const vocal of vocalGroup.Vocals) {
					vocal.RequestedTimeSkip.Connect(
						() => {
							song.SetTimestamp(startTime)
						}
					)
				}
			}
		}

		// Now parent our container
		parentContainer.appendChild(scrollContainer)
	}

	// Private Methods
	private Update(
		scroller: LyricsScroller<SyncedVocals>, vocalGroups: VocalGroups<SyncedVocals>,
		timestamp: number, deltaTime: number, skipped?: true
	) {
		// Go through and animate everything that we can
		for (const vocalGroup of vocalGroups) {
			for (const vocal of vocalGroup.Vocals) {
				vocal.Animate(timestamp, deltaTime, skipped)
			}
		}

		// If we did skip then we need to tell the scroller that
		if (skipped) {
			scroller.ForceToActive()
		}
	}

	// Deconstructor
	public Destroy() {
		this.Maid.Destroy()
	}
}