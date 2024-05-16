// Styles
import "./style.scss"

// Packages
import { Giveable, Maid } from "jsr:@socali/modules/Maid"

// Behavior Constants
const ScrollHappensEvery = 5
const ScrollPauseDuration = 2.5
const ScrollPixelSpeed = 15
const MinimumScrollDuration = 0.5 // Otherwise, it's too insignificant so we shouldn't bother

// Global Animation Loop
const ActiveAnimations = new Map<HTMLDivElement, () => void>()
{
	const CallAnimations = () => {
		for (const [_, animation] of ActiveAnimations) {
			animation()
		}
		requestAnimationFrame(CallAnimations)
	}
	requestAnimationFrame(CallAnimations)
}

// Class
export default class TextScroller implements Giveable {
	// Create our maid
	private Maid = new Maid()

	// Constructor
	constructor(
		textContainer: HTMLDivElement,
		observeSizeChangesOn: HTMLElement,
		isStaticSizing?: true
	) {
		// Set the base class based on the sizing-type
		const textElement = textContainer.querySelector<HTMLSpanElement>("span")!
		if (isStaticSizing) {
			textContainer.classList.add("TextScrollStaticSizing")
		}

		// Create our extra-shfit element IF needed
		let extraShiftElement: HTMLDivElement | undefined
		if (isStaticSizing === undefined) {
			extraShiftElement = this.Maid.Give(document.createElement("div"))
			extraShiftElement.classList.add("ExtraShift")
			textContainer.appendChild(extraShiftElement)
		}

		// Store our state here
		let containerPixelWidth = 0
		let textPixelWidth = 0
		let extraShift = 0

		// Determine if we should even animate
		const ShouldAnimate = () => {
			// Determine how long it would take for us to scroll the entirety of the text
			const excessWidth = (textPixelWidth - containerPixelWidth)
			const scrollDuration = (excessWidth / ScrollPixelSpeed)

			// Determine if we should animate
			if (scrollDuration >= MinimumScrollDuration) {
				textContainer.classList.add("TextScroll")

				let startTimestamp = (performance.now() + (ScrollHappensEvery * 1000))
				let endTimestamp = (startTimestamp + (scrollDuration * 1000))
				let returnTimestamp = (endTimestamp + (ScrollPauseDuration * 1000))
				let resetTimestamp = (returnTimestamp + (scrollDuration * 1000))

				ActiveAnimations.set(
					textContainer,
					() => {
						const timeNow = performance.now()
						if (timeNow < startTimestamp) {
							return
						}

						let progress: (number | undefined)
						if (timeNow <= endTimestamp) {
							progress = ((timeNow - startTimestamp) / (endTimestamp - startTimestamp))
						} else if (timeNow >= resetTimestamp) {
							textContainer.style.setProperty("--TextScrollShift", null)

							startTimestamp = (performance.now() + (ScrollHappensEvery * 1000))
							endTimestamp = (startTimestamp + (scrollDuration * 1000))
							returnTimestamp = (endTimestamp + (ScrollPauseDuration * 1000))
							resetTimestamp = (returnTimestamp + (scrollDuration * 1000))
						} else if (timeNow > returnTimestamp) {
							progress = (1 - ((timeNow - returnTimestamp) / (resetTimestamp - returnTimestamp)))
						} else {
							return
						}

						if (progress !== undefined) {
							textContainer.style.setProperty(
								"--TextScrollShift",
								`${
									(excessWidth + extraShift)
									* (-(Math.cos(Math.PI * progress) - 1) / 2)
								}px`
							)
						}
					}
				)

				if (this.Maid.Has("Animation") === false) {
					this.Maid.Give(() => ActiveAnimations.delete(textContainer), "Animation")
				}
			} else {
				this.Maid.Clean("Animation")
				textContainer.style.setProperty("--TextScrollShift", null)
				textContainer.classList.remove("TextScroll")
			}
		}

		// Handle size changes
		const UpdatePixelSizes = () => {
			const computedContainerStyle = globalThis.getComputedStyle(textContainer)
			containerPixelWidth = (
				textContainer.offsetWidth
				- parseFloat(computedContainerStyle.paddingLeft)
				- parseFloat(computedContainerStyle.paddingRight)
			)
			textPixelWidth = textElement.offsetWidth

			if (isStaticSizing === undefined) {
				// This is done since margin-left for some reason affects flex sizing
				textContainer.style.setProperty("--TextWidth", `${textPixelWidth}px`)

				// Before ANYBODY asks, YES, this is mandatory, for some reason it's not the right value otherwise
				requestAnimationFrame(() => extraShift = extraShiftElement!.offsetWidth)
			}

			ShouldAnimate()
		}

		// Handle observers
		{
			const sizeObserver = this.Maid.Give(new ResizeObserver(UpdatePixelSizes))
			sizeObserver.observe(observeSizeChangesOn)

			const textObserver = this.Maid.Give(new MutationObserver(UpdatePixelSizes))
			textObserver.observe(textElement, { childList: true, characterData: true, subtree: true })
		}
	}

	// Deconstructor
	public Destroy() {
		this.Maid.Destroy()
	}
}