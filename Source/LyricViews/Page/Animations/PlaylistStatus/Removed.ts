// Animator Functions
import { AnimateSineOut, Animation } from "../../Animator.ts"

const c1 = 2.5 // Custom, standard is 1.70158
const c3 = (c1 + 1)
const AnimateBackIn = (progress: number, from: number, distance: number) => (
	from + (((c3 * (progress ** 3)) - (c1 * (progress ** 2))) * distance)
)

// Export our animation
export const RemovedAnimation: Animation<undefined> = {
	Type: "Live",
	Duration: 0.4,
	InitialValues: {
		Values: [
			{
				Target: "Object",
				Property: "Scale",
				Value: 1
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
			EndProgress: 1,

			Target: "Object",
			Property: "Rotation",
			To: -(360 * 2),

			GetValue: AnimateSineOut
		},
		{
			StartProgress: 0,
			EndProgress: 1,

			Target: "Object",
			Property: "YOffset",
			To: 100,

			GetValue: AnimateBackIn
		}
	]
}