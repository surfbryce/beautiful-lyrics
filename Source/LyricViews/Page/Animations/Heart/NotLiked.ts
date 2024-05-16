// Web-Modules
import { Timeout } from "jsr:@socali/modules/Scheduler"

// Animator Functions
import { AnimateElasticOut, AnimateSineOut, AnimateLinear } from "../../Animator.ts"

// Animation State Types
import type { AnimationStates } from "../AnimationStateType.ts"

// Our Modules
import { TargetPropertyValues, type AnimationMetadata } from "./Shared.ts"

// Define our default values for resetting the not-liked state
const ResetOutline = [
	{
		Target: "Outline",
		Property: "Opacity",
		Value: TargetPropertyValues.Outline.Opacity
	},
	{
		Target: "Outline",
		Property: "Scale",
		Value: TargetPropertyValues.Outline.Scale
	}
]

export const NotLikedAnimationState: AnimationStates<AnimationMetadata> = {
	Default: {
		Type: "Static",
		Values: ResetOutline
	},

	Hover: {
		Type: "None"
	},
	Pressed: {
		Type: "Live",
		Duration: 0.125,
		Tasks: [
			{
				StartProgress: 0,
				EndProgress: 1,

				Target: "Outline",
				Property: "Scale",
				To: 0.75,

				GetValue: AnimateSineOut
			}
		],
		OnCompletion: (metadata) => (
			metadata.Maid.Give(
				Timeout(metadata.LikeStateUpdateShimmerAppearsAfter, () => metadata.Loading.classList.toggle("Outline", true)),
				"LikeStateLoading"
			)
		)
	},
	Unhovered: {
		Type: "Live",
		Duration: 0.075,
		Tasks: [
			{
				Condition: (metadata) => metadata.LastAnimationStates.includes("Pressed"),

				StartProgress: 0,
				EndProgress: 1,

				Target: "Outline",
				Property: "Scale",
				To: 1,

				GetValue: AnimateSineOut
			},
		]
	},

	SwitchedTo: {
		Type: "Live",
		Duration: 0.8,
		InitialValues: {
			Values: [
				{
					Target: "Outline",
					Property: "Opacity",
					Value: 0
				},
				{
					Target: "Outline",
					Property: "Scale",
					Value: 1
				},
				{
					Target: "Filled",
					Property: "Opacity",
					Value: 1
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
				StartProgress: 0.1,
				EndProgress: 0.15,

				Target: "Outline",
				Property: "Opacity",
				To: 1,

				GetValue: AnimateSineOut
			},

			{
				StartProgress: 0,
				EndProgress: 0.15,

				Target: "LeftPiece",
				Property: "Rotation",
				To: 0,

				GetValue: AnimateSineOut
			},
			{
				StartProgress: 0,
				EndProgress: 0.15,

				Target: "RightPiece",
				Property: "Rotation",
				To: 0,

				GetValue: AnimateSineOut
			},

			{
				StartProgress: 0,
				EndProgress: 1,

				Target: "Outline",
				Property: "Scale",
				To: 1,

				GetValue: AnimateElasticOut
			},

			{
				StartProgress: 0,
				EndProgress: 1,

				Target: "Filled",
				Property: "Scale",
				To: 1,

				GetValue: AnimateElasticOut
			},

			{
				StartProgress: 0.15,
				EndProgress: 1,

				Target: "LeftPiece",
				Property: "XOffset",
				To: -220,

				GetValue: AnimateLinear
			},
			{
				StartProgress: 0.15,
				EndProgress: 1,

				Target: "LeftPiece",
				Property: "YOffset",
				To: 350,

				GetValue: (progress, from, distance) => (
					from
					+ (
						distance
						* ((2.25 * (progress ** 2)) - (1.25 * progress))
					)
				)
			},
			{
				StartProgress: 0.15,
				EndProgress: 1,

				Target: "LeftPiece",
				Property: "Rotation",
				To: -110,

				GetValue: AnimateSineOut
			},

			{
				StartProgress: 0.15,
				EndProgress: 1,

				Target: "RightPiece",
				Property: "XOffset",
				To: 220,

				GetValue: AnimateLinear
			},
			{
				StartProgress: 0.15,
				EndProgress: 1,

				Target: "RightPiece",
				Property: "YOffset",
				To: 350,

				GetValue: (progress, from, distance) => (
					from
					+ (
						distance
						* ((2.5 * (progress ** 2)) - (1.5 * progress))
					)
				)
			},
			{
				StartProgress: 0.15,
				EndProgress: 1,

				Target: "RightPiece",
				Property: "Rotation",
				To: 117.5,

				GetValue: AnimateSineOut
			},
		]
	}
}