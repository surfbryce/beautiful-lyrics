// Animator Functions
import { AnimateElasticOut, AnimateSineOut, Animation } from "../../Animator.ts"

// Export our animation
export const AddedAnimation: Animation<undefined> = {
	Type: "Live",
	Duration: 0.85,
	InitialValues: {
		Values: [
			{
				Target: "Object",
				Property: "Scale",
				Value: 0
			},
			{
				Target: "Object",
				Property: "Rotation",
				Value: 0
			},
			{
				Target: "Object",
				Property: "YOffset",
				Value: 0
			}
		]
	},
	Tasks: [
		{
			StartProgress: 0,
			EndProgress: 0.65,

			Target: "Object",
			Property: "Rotation",
			To: (360 * 2),

			GetValue: AnimateSineOut
		},
		{
			StartProgress: 0,
			EndProgress: 0.15,

			Target: "Object",
			Property: "Scale",
			To: 1.6,

			GetValue: AnimateSineOut
		},
		{
			StartProgress: 0,
			EndProgress: 0.15,

			Target: "Object",
			Property: "Scale",
			To: 1.6,

			GetValue: AnimateSineOut
		},
		{
			StartProgress: 0.25,
			EndProgress: 1,

			Target: "Object",
			Property: "Scale",
			To: 1,

			GetValue: AnimateElasticOut
		}
	]
}