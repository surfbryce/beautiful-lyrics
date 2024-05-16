// Web Modules
import { Maid } from "jsr:@socali/modules/Maid"
import { OnPreRender } from "jsr:@socali/modules/Scheduler";

// Raw Types
type Target = {
	Element: Element & { style: HTMLElement["style"] };
	PropertyValues: {[property: string]: number};
}
export type Targets = {[TargetName: string]: Target}

type ForcedValue = {
	Target: string;
	Property: string;
	Value: number;
}
type Condition<Metadata> = (metadata: Metadata) => boolean;
type Task<Metadata> = {
	Condition?: Condition<Metadata>;

	StartProgress: number,
	EndProgress: number,

	Target: string,
	Property: string,
	To: number,

	GetValue: (progress: number, from: number, distance: number, to: number) => number
}
type ForceValues<Metadata> = {
	Condition?: Condition<Metadata>;
	Values: ForcedValue[];
}
export type Animation<Metadata> = (
	{
		Type: "Live";
		Duration: number;
		InitialValues?: ForceValues<Metadata>;
		Tasks: Task<Metadata>[];
		FinalValues?: ForceValues<Metadata>;

		OnCompletion?: (metadata: Metadata) => void;
	}
	| {
		Type: "Static";
		Values: ForcedValue[];
	}
	| {
		Type: "None";
	}
)

// Helper Functions
const ThirdTau = ((2 * Math.PI) / 3)
export const AnimateLinear = (progress: number, from: number, distance: number) => (from + (distance * progress))
export const AnimateSineIn = (progress: number, from: number, distance: number) => (
	from
	+ (distance * (1 - Math.cos((progress * Math.PI) / 2)))
)
export const AnimateSineOut = (progress: number, from: number, distance: number) => (
	from
	+ (distance * Math.sin((progress * Math.PI) / 2))
)
export const AnimateElasticOut = (progress: number, from: number, distance: number) => (
	from
	+ (
		distance
		* (
			(progress === 0) ? 0
			: (progress === 1) ? 1
			: ((Math.pow(2, (-10 * progress)) * Math.sin(((progress * 10) - 0.75) * ThirdTau)) + 1)
		)
	)
)

// Animation functionality
export const RunAnimation = <Metadata>(
	animation: Animation<Metadata>, targets: Targets,
	maid: Maid, maidKey: unknown,
	metadata: Metadata, onCompletion?: (() => void)
) => {
	// Get our animation-maid (and if we have one, clean it)
	let animationMaid = maid.Get<Maid>(maidKey)
	if (animationMaid !== undefined) {
		animationMaid.CleanUp()
	}

	// If we have no animation then just don't do anything
	if (animation.Type === "None") {
		return
	}

	// Determine if we should simply just set the values immediately
	if (animation.Type === "Static") {
		for(const forcedValue of animation.Values) {
			const target = targets[forcedValue.Target]
			target.PropertyValues[forcedValue.Property] = forcedValue.Value
			target.Element.style.setProperty(`--${forcedValue.Property}`, `${forcedValue.Value}`)
		}

		return
	}

	// Create our animation-maid if we do not have one
	if (animationMaid === undefined) {
		animationMaid = maid.Give(new Maid(), maidKey)
	}

	// If we have initial values, apply them
	if (
		(animation.InitialValues !== undefined)
		&& (
			(animation.InitialValues.Condition === undefined)
			|| animation.InitialValues.Condition(metadata)
		)
	) {
		for(const forcedValue of animation.InitialValues.Values) {
			const target = targets[forcedValue.Target]
			target.PropertyValues[forcedValue.Property] = forcedValue.Value
			target.Element.style.setProperty(`--${forcedValue.Property}`, `${forcedValue.Value}`)
		}
	}

	// Determine which tasks we can run
	const tasks: Task<Metadata>[] = []
	for(const task of animation.Tasks) {
		if (
			(task.Condition === undefined)
			|| task.Condition(metadata)
		) {
			tasks.push(task)
		}
	}
	const totalTasks = tasks.length

	// Go through our all our tasks and mark each target as being animated
	for(const task of tasks) {
		targets[task.Target].Element.classList.toggle("Animating", true)
	}
	animationMaid.Give(
		() => {
			for(const task of tasks) {
				targets[task.Target].Element.classList.toggle("Animating", false)
			}
		}
	)

	// Store our from values immediately
	const taskFromValues: number[] = [], taskFromToDeltas: number[] = []
	const finishedTasks = new Array<boolean>(totalTasks).fill(false)
	let tasksLeft = totalTasks

	// Handle our final values
	let SetFinalValues: (() => void) | undefined
	if (animation.FinalValues !== undefined) {
		let alreadySetFinalValues = false
		SetFinalValues = () => {
			if (alreadySetFinalValues) {
				return
			}
			alreadySetFinalValues = true

			if (animation.FinalValues!.Condition !== undefined) {
				if (animation.FinalValues!.Condition(metadata) === false) {
					return
				}
			}

			for(const forcedValue of animation.FinalValues!.Values) {
				const target = targets[forcedValue.Target]
				target.PropertyValues[forcedValue.Property] = forcedValue.Value
				target.Element.style.setProperty(`--${forcedValue.Property}`, `${forcedValue.Value}`)
			}
		}
		animationMaid.Give(SetFinalValues)
	}

	// Start our animation
	const startedAt = performance.now()
	const durationMilliseconds = (animation.Duration * 1000)
	const Animate = () => {
		// Get our animation progress
		const progress = Math.min(((performance.now() - startedAt) / durationMilliseconds), 1)

		// Go through all of our tasks and compute them (also updating their target property values)
		for(let index = 0; index < totalTasks; index += 1) {
			// First check if we're already finished
			if (finishedTasks[index]) {
				continue
			}
			
			// Grab our task
			const task = tasks[index]

			// Make sure we've even started
			if (progress < task.StartProgress) {
				continue
			}

			// Grab our target
			const target = targets[task.Target]

			// Determine if we've finished, important for making sure we don't skip the ending and miss the final value update
			if (progress >= task.EndProgress) {
				finishedTasks[index] = true
				tasksLeft -= 1

				target.PropertyValues[task.Property] = task.To
				target.Element.style.setProperty(`--${task.Property}`, `${task.To}`)

				continue
			}

			// Determine if we have a from value yet
			let fromValue = taskFromValues[index]
			let distanceValue = taskFromToDeltas[index]
			if (fromValue === undefined) {
				fromValue = target.PropertyValues[task.Property]
				distanceValue = (task.To - fromValue)
				taskFromValues.push(fromValue)
				taskFromToDeltas.push(distanceValue)
			}

			// Otherwise, we can compute our value and set it
			const newValue = task.GetValue(
				((progress - task.StartProgress) / (task.EndProgress - task.StartProgress)),
				fromValue, distanceValue, task.To
			)
			target.PropertyValues[task.Property] = newValue
			target.Element.style.setProperty(`--${task.Property}`, `${newValue}`)
		}

		// Determine if we can even continue on (or if we hit the end)
		if (tasksLeft > 0) {
			if (progress === 1) { // Prevents incorrect configurations
				throw new Error("Failed to complete Animation because there were still Tasks running")
			}

			animationMaid.Give(OnPreRender(Animate))
		} else { // We've finished
			if (SetFinalValues !== undefined) {
				SetFinalValues()
			}

			animationMaid.CleanUp()

			if (animation.OnCompletion !== undefined) {
				animation.OnCompletion(metadata)
			}

			if (onCompletion !== undefined) {
				onCompletion()
			}
		}
	}
	Animate()
}