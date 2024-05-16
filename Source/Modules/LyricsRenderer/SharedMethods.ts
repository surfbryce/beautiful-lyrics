// NPM
import Spline from "npm:cubic-spline"

// Imported Types
import { TimeValueRange } from "./Types.d.ts"

// Methods
export const GetSpline = (range: TimeValueRange) => {
	const times = range.map((value) => value.Time)
	const values = range.map((value) => value.Value)

	return new Spline(times, values)
}

export const Clamp = (value: number, min: number, max: number): number => {
	return Math.max(min, Math.min(value, max))
}