// JSR
import * as THREE from "jsr:@3d/three"

// Shaders
const Uniforms = `
uniform float uTime;
uniform sampler2D uImage;

uniform vec2 backgroundCircleOrigin;
uniform float backgroundCircleRadius;

uniform vec2 centerCircleOrigin;
uniform float centerCircleRadius;

uniform vec2 leftCircleOrigin;
uniform float leftCircleRadius;

uniform vec2 rightCircleOrigin;
uniform float rightCircleRadius;
`
export type ShaderUniforms = {
	uTime: { value: number };
	uImage: { value: THREE.Texture };

	backgroundCircleOrigin: { value: THREE.Vector2 };
	backgroundCircleRadius: { value: number };

	centerCircleOrigin: { value: THREE.Vector2 };
	centerCircleRadius: { value: number };

	leftCircleOrigin: { value: THREE.Vector2 };
	leftCircleRadius: { value: number };

	rightCircleOrigin: { value: THREE.Vector2 };
	rightCircleRadius: { value: number };
}

export const VertexShader = `
void main() {
	gl_Position = vec4(position, 1.0);
}
`;

export const FragmentShader = `
${Uniforms}

const vec2 rotateCenter = vec2(0.5, 0.5);
vec2 rotate(vec2 point, float angle) {
	vec2 offset = (point - rotateCenter);

	float s = sin(angle);
	float c = cos(angle);
	mat2 rotation = mat2(c, -s, s, c);
	offset = (rotation * offset);

	return (rotateCenter + offset);
}

const vec4 defaultColor = vec4(0.0, 0.0, 0.0, 0.0);
void main() {
	gl_FragColor = defaultColor;

	vec2 backgroundCircleOffset = (gl_FragCoord.xy - backgroundCircleOrigin);
	if (length(backgroundCircleOffset) <= backgroundCircleRadius) {
		gl_FragColor = texture2D(
			uImage,
			rotate(
				(((backgroundCircleOffset / backgroundCircleRadius) + 1.0) * 0.5),
				(uTime * -0.25)
			)
		);
		gl_FragColor.a = 1.0;
	}

	vec2 centerCircleOffset = (gl_FragCoord.xy - centerCircleOrigin);
	if (length(centerCircleOffset) <= centerCircleRadius) {
		vec4 newColor = texture2D(
			uImage,
			rotate(
				(((centerCircleOffset / centerCircleRadius) + 1.0) * 0.5),
				(uTime * 0.5)
			)
		);
		newColor.a *= 0.75;

		gl_FragColor.rgb = ((newColor.rgb * newColor.a) + (gl_FragColor.rgb * (1.0 - newColor.a)));
		gl_FragColor.a = (newColor.a + (gl_FragColor.a * (1.0 - newColor.a)));
	}

	vec2 leftCircleOffset = (gl_FragCoord.xy - leftCircleOrigin);
	if (length(leftCircleOffset) <= leftCircleRadius) {
		vec4 newColor = texture2D(
			uImage,
			rotate(
				(((leftCircleOffset / leftCircleRadius) + 1.0) * 0.5),
				(uTime * 1.0)
			)
		);
		newColor.a *= 0.5;

		gl_FragColor.rgb = ((newColor.rgb * newColor.a) + (gl_FragColor.rgb * (1.0 - newColor.a)));
		gl_FragColor.a = (newColor.a + (gl_FragColor.a * (1.0 - newColor.a)));
	}

	vec2 rightCircleOffset = (gl_FragCoord.xy - rightCircleOrigin);
	if (length(rightCircleOffset) <= rightCircleRadius) {
		vec4 newColor = texture2D(
			uImage,
			rotate(
				(((rightCircleOffset / rightCircleRadius) + 1.0) * 0.5),
				(uTime * -0.75)
			)
		);
		newColor.a *= 0.5;

		gl_FragColor.rgb = ((newColor.rgb * newColor.a) + (gl_FragColor.rgb * (1.0 - newColor.a)));
		gl_FragColor.a = (newColor.a + (gl_FragColor.a * (1.0 - newColor.a)));
	}
}
`;

const ShaderUniformStructure: Map<string, string> = new Map()
for (const match of Uniforms.matchAll(/uniform\s+(\w+)\s+(\w+);/g)) {
	const uniformType = match[1]
	const uniformName = match[2]
	ShaderUniformStructure.set(uniformName, uniformType)
}
export const GetShaderUniforms = (): ShaderUniforms => {
	const uniforms: Record<string, unknown> = {}
	for (const [uniformName, uniformType] of ShaderUniformStructure.entries()) {
		if (uniformType === "float") {
			uniforms[uniformName] = { value: 0 };
		} else if (uniformType === "vec2") {
			uniforms[uniformName] = { value: new THREE.Vector2() };
		} else if (uniformType === "sampler2D") {
			uniforms[uniformName] = { value: null };
		}
	}
	return uniforms as ShaderUniforms
}