// Web-Modules
import { Timeout } from "jsr:@socali/modules/Scheduler"

// Animator Functions
import { AnimateElasticOut, AnimateSineOut, AnimateSineIn } from "../../Animator.ts"

// Animation State Types
import type { AnimationStates } from "../AnimationStateType.ts"

// Our Modules
import { TargetPropertyValues, type AnimationMetadata } from "./Shared.ts"

// Define our default values for resetting the liked state
const ResetFilled = [
	{
		Target: "Filled",
		Property: "Opacity",
		Value: TargetPropertyValues.Filled.Opacity
	},
	{
		Target: "Filled",
		Property: "Scale",
		Value: TargetPropertyValues.Filled.Scale
	},
	{
		Target: "LeftPiece",
		Property: "Rotation",
		Value: TargetPropertyValues.LeftPiece.Rotation
	},
	{
		Target: "LeftPiece",
		Property: "XOffset",
		Value: TargetPropertyValues.LeftPiece.XOffset
	},
	{
		Target: "LeftPiece",
		Property: "YOffset",
		Value: TargetPropertyValues.LeftPiece.YOffset
	},
	{
		Target: "RightPiece",
		Property: "Rotation",
		Value: TargetPropertyValues.RightPiece.Rotation
	},
	{
		Target: "RightPiece",
		Property: "XOffset",
		Value: TargetPropertyValues.RightPiece.XOffset
	},
	{
		Target: "RightPiece",
		Property: "YOffset",
		Value: TargetPropertyValues.RightPiece.YOffset
	}
]

// Export our animation
export const LikedAnimationState: AnimationStates<AnimationMetadata> = {
	Default: {
		Type: "Static",
		Values: ResetFilled
	},

	Hover: {
		Type: "Live",
		Duration: 0.6,
		Tasks: [
			{
				Condition: (metadata) => metadata.LastAnimationStates.includes("Pressed"),

				StartProgress: 0,
				EndProgress: 0.2,

				Target: "Filled",
				Property: "Scale",
				To: 1,

				GetValue: AnimateElasticOut
			},
			{
				StartProgress: 0,
				EndProgress: 1,

				Target: "LeftPiece",
				Property: "Rotation",
				To: -2.5,

				GetValue: AnimateElasticOut
			},
			{
				StartProgress: 0,
				EndProgress: 1,

				Target: "RightPiece",
				Property: "Rotation",
				To: 2.5,

				GetValue: AnimateElasticOut
			}
		]
	},
	Pressed: {
		Type: "Live",
		Duration: 0.075,
		Tasks: [
			{
				StartProgress: 0,
				EndProgress: 1,

				Target: "Filled",
				Property: "Scale",
				To: 0.5,

				GetValue: AnimateSineOut
			},
			{
				StartProgress: 0,
				EndProgress: 0.5,

				Target: "LeftPiece",
				Property: "Rotation",
				To: -10,

				GetValue: AnimateSineOut
			},
			{
				StartProgress: 0,
				EndProgress: 0.5,

				Target: "RightPiece",
				Property: "Rotation",
				To: 10,

				GetValue: AnimateSineOut
			}
		],
		OnCompletion: (metadata) => (
			metadata.Maid.Give(
				Timeout(metadata.LikeStateUpdateShimmerAppearsAfter, () => metadata.Loading.classList.toggle("Full", true)),
				"LikeStateLoading"
			)
		)
	},
	Unhovered: {
		Type: "Live",
		Duration: 0.075,
		InitialValues: {
			Values: [
				{
					Target: "LeftPiece",
					Property: "XOffset",
					Value: 0
				},
				{
					Target: "LeftPiece",
					Property: "YOffset",
					Value: 0
				},
				{
					Target: "RightPiece",
					Property: "XOffset",
					Value: 0
				},
				{
					Target: "RightPiece",
					Property: "YOffset",
					Value: 0
				}
			]
		},
		Tasks: [
			{
				Condition: (metadata) => metadata.LastAnimationStates.includes("Pressed"),

				StartProgress: 0,
				EndProgress: 0.75,

				Target: "Filled",
				Property: "Scale",
				To: 1,

				GetValue: AnimateSineOut
			},
			{
				StartProgress: 0,
				EndProgress: 1,

				Target: "LeftPiece",
				Property: "Rotation",
				To: 0,

				GetValue: AnimateSineIn
			},
			{
				StartProgress: 0,
				EndProgress: 1,

				Target: "RightPiece",
				Property: "Rotation",
				To: 0,

				GetValue: AnimateSineIn
			}
		]
	},

	SwitchedTo: {
		Type: "Live",
		Duration: 0.55,
		InitialValues: {
			Values: [
				{
					Target: "Filled",
					Property: "Opacity",
					Value: 0
				},
				{
					Target: "Filled",
					Property: "Scale",
					Value: 0.75
				},
				{
					Target: "LeftPiece",
					Property: "Rotation",
					Value: 0
				},
				{
					Target: "LeftPiece",
					Property: "XOffset",
					Value: 0
				},
				{
					Target: "LeftPiece",
					Property: "YOffset",
					Value: 0
				},
				{
					Target: "RightPiece",
					Property: "Rotation",
					Value: 0
				},
				{
					Target: "RightPiece",
					Property: "XOffset",
					Value: 0
				},
				{
					Target: "RightPiece",
					Property: "YOffset",
					Value: 0
				}
			]
		},
		Tasks: [
			{
				StartProgress: 0,
				EndProgress: 0.2,

				Target: "Outline",
				Property: "Opacity",
				To: 0,

				GetValue: AnimateSineOut
			},
			{
				StartProgress: 0,
				EndProgress: 0.2,

				Target: "Filled",
				Property: "Opacity",
				To: 1,

				GetValue: AnimateSineOut
			},
			{
				StartProgress: 0,
				EndProgress: 0.15,

				Target: "Outline",
				Property: "Scale",
				To: 1.6,

				GetValue: AnimateSineOut
			},
			{
				StartProgress: 0,
				EndProgress: 0.15,

				Target: "Filled",
				Property: "Scale",
				To: 1.6,

				GetValue: AnimateSineOut
			},
			{
				StartProgress: 0.25,
				EndProgress: 1,

				Target: "Filled",
				Property: "Scale",
				To: 1,

				GetValue: AnimateElasticOut
			}
		]
	}
}