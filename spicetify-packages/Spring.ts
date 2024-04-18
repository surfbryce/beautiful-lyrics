// Math Standards
const Epsilon = 1e-4
const Pi = Math.PI
const Tau = (Pi * 2)
const Exp = Math.exp
const Sin = Math.sin
const Cos = Math.cos
const Sqrt = Math.sqrt

// Behavior Constants
const SleepEpsilon = 0.1 // Determines how far away from our Final value can be considered "sleeping"/"met"

// Class
class Spring {
	// Private Properties
	private Velocity: number
	private DampingRatio: number
	private Frequency: number

	private Sleeping: boolean = true

	// Public Properties
	public Position: number
	public Final: number

	// Constructor
	public constructor(initial: number, dampingRatio: number, frequency: number) {
		// Make sure we were passed a valid Spring
		if ((dampingRatio * frequency) < 0) {
			throw new Error("Spring does not converge.")
		}

		// Update our properties
		this.DampingRatio = dampingRatio, this.Frequency = frequency
		this.Velocity = 0
		this.Position = initial, this.Final = initial
	}

	public Update(deltaTime: number): number {
		const radialFrequency = (this.Frequency * Tau)
		const final = this.Final
		const velocity = this.Velocity

		const offset = (this.Position - final)
		const dampingRatio = this.DampingRatio
		const decay = Exp(-dampingRatio * radialFrequency * deltaTime)

		let newPosition, newVelocity

		if (this.DampingRatio == 1) {
			newPosition = (((offset * (1 + radialFrequency * deltaTime) + velocity * deltaTime) * decay) + final)
			newVelocity = ((velocity * (1 - radialFrequency * deltaTime) - offset * (radialFrequency * radialFrequency * deltaTime)) * decay)
		} else if (this.DampingRatio < 1) {
			const c = Sqrt(1 - (dampingRatio * dampingRatio))

			const i = Cos(radialFrequency * c * deltaTime)
			const j = Sin(radialFrequency * c * deltaTime)

			let z
			if (c > Epsilon) {
				z = j / c
			} else {
				const a = (deltaTime * radialFrequency)
				z = (a + ((((a * a) * (c * c) * (c * c) / 20 - c * c) * (a * a * a)) / 6))
			}

			let y
			if ((radialFrequency * c) > Epsilon) {
				y = (j / (radialFrequency * c))
			} else {
				const b = (radialFrequency * c)
				y = (deltaTime + ((((deltaTime * deltaTime) * (b * b) * (b * b) / 20 - b * b) * (deltaTime * deltaTime * deltaTime)) / 6))
			}

			newPosition = (((offset * (i + dampingRatio * z) + velocity * y) * decay) + final)
			newVelocity = ((velocity * (i - z * dampingRatio) - offset * (z * radialFrequency)) * decay)
		} else { // Overdamped
			const c = Sqrt((dampingRatio * dampingRatio) - 1)

			const r1 = (-radialFrequency * (dampingRatio - c))
			const r2 = (-radialFrequency * (dampingRatio + c))

			const co2 = ((velocity - offset * r1) / (2 * radialFrequency * c))
			const co1 = (offset - co2)

			const e1 = (co1 * Exp(r1 * deltaTime))
			const e2 = (co2 * Exp(r2 * deltaTime))

			newPosition = (e1 + e2 + final)
			newVelocity = ((e1 * r1) + (e2 * r2))
		}

		this.Position = newPosition
		this.Velocity = newVelocity

		this.Sleeping = (Math.abs(final - newPosition) <= SleepEpsilon)

		return newPosition
	}

	public Set(value: number) {
		this.Position = value, this.Final = value
		this.Velocity = 0
		this.Sleeping = true
	}

	public IsSleeping(): boolean {
		return this.Sleeping
	}
}

export default Spring