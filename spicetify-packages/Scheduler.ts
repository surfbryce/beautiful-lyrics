class Scheduled {
	private Id: number
	private Cleaner: ((id: number) => void)

	// Constructor
	constructor(cleaner: ((id: number) => void), id: number) {
		// Store our cleaner and id
		this.Cleaner = cleaner
		this.Id = id
	}

	// Public Methods
	public Cancel() {
		// Make sure we aren't already cancelled
		if (this.Id === undefined) {
			return
		}

		// Cancel our id
		this.Cleaner(this.Id)

		// Mark that we are cancelled
		delete (this as any).Id
		delete (this as any).Cleaner
	}
}

export const Timeout = (seconds: number, callback: ((...args: any[]) => any)) => {
	return new Scheduled(window.clearTimeout.bind(window), setTimeout(callback, (seconds * 1000)))
}
export const Interval = (everySeconds: number, callback: ((...args: any[]) => any)) => {
	return new Scheduled(window.clearTimeout.bind(window), setInterval(callback, (everySeconds * 1000)))
}
export const OnNextFrame = (callback: ((...args: any[]) => any)) => {
	return new Scheduled(window.cancelAnimationFrame.bind(window), requestAnimationFrame(callback))
}

export type {Scheduled}
export const IsScheduled = (value: any): value is Scheduled => {
	return (value instanceof Scheduled)
}