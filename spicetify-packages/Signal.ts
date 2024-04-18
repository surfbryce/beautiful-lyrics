// Packages
import {FreeArray} from "./FreeArray";

// Connection Types
type Callback = ((...args: any[]) => void)
type SignalConnectionReferences<P extends Callback> = FreeArray<
	{
		Callback: P;
		Connection: Connection<P>;
	}
>

// Classes
class Connection<P extends Callback> {
	// Private Properties
	private ConnectionReferences: SignalConnectionReferences<P>
	private Location: string
	private Disconnected: boolean

	// Constructor
	constructor(connections: SignalConnectionReferences<P>, callback: P) {
		// Store our signal/callback
		this.ConnectionReferences = connections

		// Store our initial disconnected state
		this.Disconnected = false

		// Now store ourselves
		this.Location = connections.Push(
			{
				Callback: callback,
				Connection: this
			}
		)
	}

	// Public Methods
	public Disconnect() {
		// Make sure we aren't already disconnected
		if (this.Disconnected) {
			return
		}

		// Disconnect ourself
		this.Disconnected = true

		// Remove ourselves from our signal
		this.ConnectionReferences.Remove(this.Location)

		// Delete our references
		delete (this as any).Location
		delete (this as any).Callback
		delete (this as any).SignalConnections
	}

	public IsDisconnected() {
		return this.Disconnected
	}
}

class Event<P extends Callback> {
	// Private Properties
	private Signal: Signal<P>

	// Constructor
	constructor(signal: Signal<P>) {
		// Store our signal
		this.Signal = signal
	}

	// Public Methods
	public Connect(callback: P) {
		return this.Signal.Connect(callback)
	}

	public IsDestroyed() {
		return this.Signal.IsDestroyed()
	}
}

class Signal<P extends Callback> {
	// Private Properties
	private ConnectionReferences: SignalConnectionReferences<P>
	private DestroyedState: boolean

	// Constructor
	constructor() {
		// Create our list of connections
		this.ConnectionReferences = new FreeArray()

		// Store our initial destroyed state
		this.DestroyedState = false
	}

	// Public Methods
	public Connect(callback: P): Connection<P> {
		// Make sure we aren't destroyed
		if (this.DestroyedState) {
			throw('Cannot connect to a Destroyed Signal')
		}

		// Return our connection (since the connection handles everything itself)
		return new Connection(this.ConnectionReferences, callback)
	}

	public Fire(...args: Parameters<P>) {
		// Make sure we aren't destroyed
		if (this.DestroyedState) {
			throw('Cannot fire a Destroyed Signal')
		}

		// Loop through all of our connections
		for (const [_, reference] of this.ConnectionReferences.GetIterator()) {
			// Fire our callback
			reference.Callback(...args)
		}
	}

	public GetEvent(): Event<P> {
		// Return our event
		return new Event(this)
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

		// Disconnect all of our connections (so that the connection is labeled as Disconnected)
		for (const [_, reference] of this.ConnectionReferences.GetIterator()) {
			reference.Connection.Disconnect()
		}

		// Disconnect ourself
		this.DestroyedState = true

		// Delete our references
		delete (this as any).ConnectionReferences
	}
}

// Exports
export type {Event, Connection}
export const IsConnection = (value: any): value is Connection<any> => {
	return (value instanceof Connection)
}
export {Signal}