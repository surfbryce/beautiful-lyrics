// NPM
import "../../Simplebar/style.css"
// @deno-types="npm:@types/simplebar"
import SimpleBar from "npm:simplebar"

// Packages
import { Maid, Giveable } from "jsr:@socali/modules/Maid"
import { Timeout, Defer } from "jsr:@socali/modules/Scheduler"

// Imported Types
import { BaseVocals, SyncedVocals } from "./Types.d.ts"

// Types
type VocalGroup<V extends (BaseVocals | SyncedVocals)> = {
	GroupContainer: (HTMLDivElement | HTMLButtonElement),
	Vocals: V[] 
}
export type VocalGroups<V extends (BaseVocals | SyncedVocals)> = VocalGroup<V>[]

// Visual Constants
const DistanceToMaximumBlur = 4 // Any vocals beyond this unit of distance away will be at full-blur
const BlurScale = 1.25 // How much we scale the blur by

// Behavior Constants
const UserScrollingStopsAfter = 0.75 // Determines how long after the user stops scrolling that we allow auto-scrolling
const AutoScrollingStopsAfter = (1 / 30) // Determines how long after the last auto-scroll that we mark that aren't anymore

// Helper Method
const GetTotalElementHeight = (element: HTMLElement): number => {
	const style = globalThis.getComputedStyle(element)
	const marginTop = parseFloat(style.marginTop)
	const marginBottom = parseFloat(style.marginBottom)

	return (element.offsetHeight + marginTop + marginBottom)
}

// Class
export class LyricsScroller<V extends (BaseVocals | SyncedVocals)> implements Giveable {
	// Private Properties
	private readonly Maid: Maid

	private readonly ScrollContainer: HTMLDivElement
	private readonly LyricsContainer: HTMLDivElement
	private readonly VocalGroups: VocalGroups<V>

	private readonly LyricsAreSynced: boolean

	private readonly Scroller: SimpleBar
	private readonly ScrollerObject: HTMLElement
	private GroupDimensions: {
		Height: number;
		Center: number;
	}[] = []
	private AutoScrollBlocked: boolean = false
	private AutoScrolling: boolean = false
	private LastActiveVocalIndex: number = 0
	private LyricsEnded: boolean = false

	// Constructor
	public constructor(
		scrollContainer: HTMLDivElement, lyricsContainer: HTMLDivElement,
		vocalGroups: VocalGroups<V>, lyricsAreSynced: boolean
	) {
		// Mark our synced-state
		this.LyricsAreSynced = lyricsAreSynced

		// Create our maid
		this.Maid = new Maid()

		// Create our scroller
		this.Scroller = new SimpleBar(scrollContainer)
		this.ScrollerObject	= this.Scroller.getScrollElement()!
		this.Maid.Give(this.Scroller.unMount.bind(this.Scroller))

		// Store our arguments
		this.ScrollContainer = scrollContainer, this.LyricsContainer = lyricsContainer
		this.VocalGroups = vocalGroups

		// On scroll, block auto-scrolling
		this.WatchAutoScrollBlocking()

		// Watch for size changes
		const resizeObserver = this.Maid.Give(
			new ResizeObserver(
				() => {
					this.UpdateLyricHeights()

					if (lyricsAreSynced) {
						this.MoveToActiveLyrics()
					}
				}
			)
		)
		resizeObserver.observe(this.ScrollContainer)

		// Immediately update our heights
		this.UpdateLyricHeights()

		// Synced lyrics have more complex interactions so we don't need to apply these to Static lyrics
		if (lyricsAreSynced) {
			// Handle our lyric active state changes since this affects scrolling/sizing
			this.HandleLyricActiveStateChanges()

			// Handle moving ourselves to the active lyrics
			this.MoveToActiveLyrics(true)
		}
	}

	// Private Methods
	private ToggleAutoScrollBlock(blocked: boolean) {
		if (this.AutoScrollBlocked !== blocked) {
			if (blocked) {
				this.AutoScrollBlocked = true
				this.ScrollContainer.classList.add("UserScrolling")
			} else {
				this.AutoScrollBlocked = false
				this.ScrollContainer.classList.remove("UserScrolling")
			}
		}
	}

	private WatchAutoScrollBlocking() {
		const callback = () => {
			if (this.AutoScrolling === false) {
				this.ToggleAutoScrollBlock(true)

				this.Maid.Give(
					Timeout(
						UserScrollingStopsAfter,
						() => this.MoveToActiveLyrics()
					),
					"WaitForUserToStopScrolling"
				)
			} else {
				this.Maid.Give(
					Timeout(
						AutoScrollingStopsAfter,
						() => this.AutoScrolling = false
					),
					"WaitForAutoScroll"
				)
			}
		}

		this.ScrollerObject.addEventListener("scroll", callback)
		this.Maid.Give(() => this.ScrollerObject.removeEventListener("scroll", callback))
	}

	private HandleLyricActiveStateChanges() {
		for(const vocalGroup of this.VocalGroups as VocalGroups<SyncedVocals>) {
			for(const vocal of vocalGroup.Vocals) {
				this.Maid.Give(
					vocal.ActivityChanged.Connect(() => this.MoveToActiveLyrics(true))
				)
			}
		}
	}

	private UpdateLyricHeights() {
		// Clear our heights
		this.GroupDimensions = []

		// Now update our heights
		let totalHeight = 0
		for (const vocalGroup of this.VocalGroups) {
			const groupHeight = GetTotalElementHeight(vocalGroup.GroupContainer)

			this.GroupDimensions.push(
				{
					Height: (groupHeight / 2),
					Center: (totalHeight + (groupHeight / 2))
				}
			)
			totalHeight += groupHeight
		}

		// Update our container height
		this.LyricsContainer.style.height = `${totalHeight}px`
		this.Scroller.recalculate()
	}

	private DetermineLyricBlur() {
		// Grab our start/end incides for our active vocals (we go by vocal not by group in this instance)
		let startIndex: (number | undefined), endIndex: (number | undefined)
		const vocals = []
		for (const vocalGroup of (this.VocalGroups as VocalGroups<SyncedVocals>)) {
			for(const vocal of vocalGroup.Vocals) {
				if (vocal.IsActive()) {
					const vocalIndex = vocals.length

					if (startIndex === undefined) {
						startIndex = vocalIndex
					}

					endIndex = vocalIndex
				}

				vocals.push(vocal)
			}
		}

		// If we don't have a start-index then set it to the end vocal
		if ((startIndex === undefined) || (endIndex === undefined)) {
			startIndex = this.LastActiveVocalIndex
			endIndex = startIndex
		} else {
			this.LastActiveVocalIndex = startIndex
		}

		// Now go through our vocals and apply the blur
		for (const [index, vocal] of vocals.entries()) {
			// Grab our distance
			const distance = Math.min(
				(
					(index < startIndex) ? (startIndex - index)
					: (index > endIndex) ? (index - endIndex)
					: 0
				),
				DistanceToMaximumBlur
			)

			// Update our blur now
			vocal.SetBlur(distance * BlurScale)
		}
	}

	private MoveToActiveLyrics(redetermineBlur?: true) {
		// We can't move to any active-lyrics if we aren't synced
		if (this.LyricsAreSynced === false) {
			return
		}

		// We need to redetermine our blur
		if (redetermineBlur) {
			this.DetermineLyricBlur()
		}

		// If we're still scrolling then don't do anything
		if (this.AutoScrollBlocked && this.Scroller.isScrolling) {
			return
		}

		// Grab the margin that the lyrics-container adds at the top (this affects our scroll-position)
		const lyricsContainerStyle = globalThis.getComputedStyle(this.LyricsContainer)
		const lyricsContainerMarginTop = parseInt(lyricsContainerStyle.marginTop!)
		
		// Check if we have an offset defined
		const offset = (
			(lyricsContainerStyle.getPropertyValue("--use-offset") === "1")
			? parseInt(lyricsContainerStyle.lineHeight!)
			: 0
		)

		// Determine our minimum distance away from the top
		const scrollViewportHeight = this.ScrollContainer.offsetHeight
		const viewportCenter = ((scrollViewportHeight / 2) - offset)
		const minimumDistanceToAutoScroll = (viewportCenter - lyricsContainerMarginTop)
		const currentScrollTop = this.ScrollerObject.scrollTop
		const maximumScrollTop = (this.ScrollerObject.scrollHeight - scrollViewportHeight)

		// Grab our active vocal-groups
		const activeVocalGroups = []
		for (const [index, vocalGroup] of (this.VocalGroups as VocalGroups<SyncedVocals>).entries()) {
			if (vocalGroup.Vocals.some(vocal => vocal.IsActive())) {
				activeVocalGroups.push(
					{
						Dimensions: this.GroupDimensions[index],
						Group: vocalGroup
					}
				)
			}
		}

		// If we have no active vocal-groups don't even bother
		if (activeVocalGroups.length === 0) {
			if ((this.AutoScrollBlocked === false) && this.LyricsEnded) {
				if (currentScrollTop < maximumScrollTop) {
					this.ScrollTo(maximumScrollTop)
				}
			}

			return
		}

		// Now determine our center
		let center = 0, totalHalfHeight = 0
		for(const activeVocalGroup of activeVocalGroups) {
			totalHalfHeight += activeVocalGroup.Dimensions.Height
			center += activeVocalGroup.Dimensions.Center
		}
		center /= activeVocalGroups.length

		// First determine if we're even past our minimum distance yet
		let scrollY: (number | undefined)
		if (
			this.AutoScrollBlocked
			|| (center > minimumDistanceToAutoScroll)
		) {
			// Now handle potentially unblocking auto-scrolling
			if (this.AutoScrollBlocked) {
				// Check if our center is on-screen
				if (
					(center >= (currentScrollTop - totalHalfHeight))
					&& (center <= (currentScrollTop + scrollViewportHeight))
				) {
					this.ToggleAutoScrollBlock(false)
					this.DetermineLyricBlur()
				}
			}

			// Now if we are not blocked we can proceed
			if (this.AutoScrollBlocked === false) {
				// Set our scroll to the distance from the minimum
				scrollY = ((center - viewportCenter) + lyricsContainerMarginTop + offset)
			}
		} else if (currentScrollTop > 0) {
			scrollY = 0
		}

		// Now set our scroll position (hopefully)
		if (scrollY !== undefined) {
			this.ScrollTo(scrollY)
		}
	}

	private ScrollTo(yPosition: number) {
		this.AutoScrolling = true
		this.ScrollerObject.scrollTop = yPosition
		this.Scroller.scrollY()
	}

	// Public Methods
	public SetLyricsEnded(ended: boolean) {
		this.LyricsEnded = ended
	}

	public ForceToActive(skippedByVocal?: true) {
		if (this.LyricsAreSynced === false) {
			return
		}

		this.ToggleAutoScrollBlock(false)

		if (skippedByVocal) {
			this.Maid.Clean("ForceToActiveCSS")
		} else {
			this.ScrollContainer.classList.add("InstantScroll")
			this.Maid.Give(
				Defer(() => this.ScrollContainer.classList.remove("InstantScroll")),
				"ForceToActiveCSS"
			)
		}

		this.MoveToActiveLyrics()
	}

	public ForceToTop() {
		this.ToggleAutoScrollBlock(false)
		this.ScrollTo(0)
	}

	public Destroy() {
		this.Maid.Destroy()
	}
}