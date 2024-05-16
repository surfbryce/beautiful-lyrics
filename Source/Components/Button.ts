// Web Modules
import { Signal } from "jsr:@socali/modules/Signal"
import { Maid, Giveable } from "jsr:@socali/modules/Maid"

// QOL Type
type MouseEventCallback = (mouseEvent: MouseEvent) => void

// Class
export default class Button implements Giveable {
	// Create our maid
	private Maid = new Maid()

	// Store our state
	private IsPressing = false

	// Events
	public readonly Pressed
	public readonly Released
	public readonly Clicked
	public readonly ContextMenuRequested
	
	// Constructor
	constructor(element: HTMLElement, hasCustomContextMenu: boolean = false, allowClickToFireOutsideElement?: true) {
		// Mark ourselves as a button
		element.setAttribute("Button", "")

		// Create our signal
		const [
			pressedSignal, releasedSignal, clickedSignal,
			contextMenuRequestedSignal
		] = this.Maid.GiveItems(
			new Signal<MouseEventCallback>(), new Signal<MouseEventCallback>(), new Signal<MouseEventCallback>(),
			new Signal<MouseEventCallback>()
		)
		this.Pressed = pressedSignal.GetEvent(),
			this.Released = releasedSignal.GetEvent(),
			this.Clicked = clickedSignal.GetEvent(),
			this.ContextMenuRequested = contextMenuRequestedSignal.GetEvent()

		// Handle interactions with our button
		{
			if (hasCustomContextMenu) {
				const OnContextMenu = (event: MouseEvent) => {
					if (
						(event.target !== element)
						&& ((event.target as HTMLElement).hasAttribute("Button"))
					) {
						return
					} else if (
						(element.classList.contains("Selected") === false)
						&& element.classList.contains("NoFunctionality")
					) {
						return
					}

					event.preventDefault()
					contextMenuRequestedSignal.Fire(event)
				}
				element.addEventListener('contextmenu', OnContextMenu)
				this.Maid.Give(() => element.removeEventListener('contextmenu', OnContextMenu))
			}

			const OnMouseDown = (event: MouseEvent) => {
				if (event.button !== 0) {
					return
				} else if (
					(event.target !== element)
					&& ((event.target as HTMLElement).hasAttribute("Button"))
				) {
					return
				} else if (element.classList.contains("NoFunctionality")) {
					return
				}

				this.IsPressing = true
				element.classList.add("Pressed")
				pressedSignal.Fire(event)
			}
			element.addEventListener("mousedown", OnMouseDown)
			this.Maid.Give(() => element.removeEventListener("mousedown", OnMouseDown))

			const OnClick = (event: MouseEvent) => {
				if (this.IsPressing) {
					this.IsPressing = false
					element.classList.remove("Pressed")
					releasedSignal.Fire(event)
					clickedSignal.Fire(event)
				}
			}

			if (allowClickToFireOutsideElement) {
				document.addEventListener("mouseup", OnClick)
				this.Maid.Give(() => document.removeEventListener("mouseup", OnClick))
			} else {
				element.addEventListener("mouseup", OnClick)

				const OnMouseLeave = (mouseEvent: MouseEvent) => {
					if (this.IsPressing) {
						this.IsPressing = false
						element.classList.remove("Pressed")
						releasedSignal.Fire(mouseEvent)
					}
				}
				element.addEventListener("mouseleave", OnMouseLeave)

				this.Maid.Give(
					() => {
						element.removeEventListener("mouseup", OnClick)
						element.removeEventListener("mouseleave", OnMouseLeave)
					}
				)
			}
		}
	}

	// State Methods
	public IsPressed() {
		return this.IsPressing
	}

	// Deconstructor
	public Destroy() {
		this.Maid.Destroy()
	}
}