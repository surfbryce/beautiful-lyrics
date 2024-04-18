// Packages
import Spring from "$spicetify-packages/Spring"
import { Event } from "$spicetify-packages/Signal"

// General Types
type TimeValue = {
	Time: number;
	Value: number;
}
type TimeValueRange = TimeValue[]
type Springs = {
	Scale: Spring;
	YOffset: Spring;
	Glow: Spring;
}
type LiveText = {
	Object: HTMLSpanElement;
	Springs: Springs;
}
type LyricState = ("Idle" | "Active" | "Sung")

// Shared Class Definitions
interface BaseVocals {}
interface SyncedVocals extends BaseVocals {
	// Public Properties
	ActivityChanged: Event<(isActive: boolean) => void>
	RequestedTimeSkip: Event<() => void>

	// Public Methods
	Animate(songTimestamp: number, deltaTime: number, isImmediate?: true): void
	SetBlur(blurDistance: number): void
	IsActive(): boolean
}

// Exports
export { TimeValue, TimeValueRange, Springs, LiveText, LyricState, BaseVocals, SyncedVocals }