// Web-Modules
import { Maid } from "jsr:@socali/modules/Maid"

// Animation State Types
import type { AnimationState } from "../AnimationStateType.ts"

// Exports
export type AnimationMetadata = {
	Maid: Maid,
	LastAnimationStates: AnimationState[],
	LikeStateUpdateShimmerAppearsAfter: number,
	Loading: HTMLDivElement
}

export const TargetPropertyValues = {
	Outline: {
		Opacity: 1,
		Scale: 1
	},
	Filled: {
		Opacity: 1,
		Scale: 1
	},
	LeftPiece: {
		Rotation: 0,
		XOffset: 0,
		YOffset: 0
	},
	RightPiece: {
		Rotation: 0,
		XOffset: 0,
		YOffset: 0
	}
}