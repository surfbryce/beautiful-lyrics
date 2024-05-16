// Imported Types
import type { Animation } from "../Animator.ts"

// Export
export type AnimationStates<ConditionMetadata> = {
	Default: Animation<ConditionMetadata>,

	Hover: Animation<ConditionMetadata>,
	Pressed: Animation<ConditionMetadata>,
	Unhovered: Animation<ConditionMetadata>,

	SwitchedTo: Animation<ConditionMetadata>
}
export type AnimationState = keyof AnimationStates<unknown>