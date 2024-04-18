// Packages
import {GetUniqueId} from './UniqueId'

// Class
class FreeArray<I> {
	// Private Properties
	private Items: Map<string, I>
	private DestroyedState: boolean

	// Constructor
	constructor() {
		// Create our list of items
		this.Items = new Map()

		// Store our initial destroyed state
		this.DestroyedState = false
	}

	// Public Methods
	public Push(item: any): string {
		// Generate our key
		const key = GetUniqueId()

		// Store our item
		this.Items.set(key, item)

		// Return our key
		return key
	}

	public Get(key: string): any {
		return this.Items.get(key)
	}

	public Remove(key: string): any {
		// Make sure we have an item
		const item = this.Items.get(key)

		if (item !== undefined) {
			// Remove the item
			this.Items.delete(key)

			// Return our item
			return item
		}
	}

	public GetIterator() {
		return this.Items.entries()
	}

	public IsDestroyed() {
		return this.DestroyedState
	}

	// Deconstructor
	public Destroy() {
		// Make sure we aren't already destroyed
		if (this.DestroyedState) {
			return
		}

		// Mark that we are destroyed
		this.DestroyedState = true

		// Delete our items map
		delete (this as any).Items
	}
}

// Export
export {FreeArray}