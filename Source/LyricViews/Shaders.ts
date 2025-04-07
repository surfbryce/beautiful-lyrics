// JSR
import * as THREE from "jsr:@3d/three"

// Shaders
const Uniforms = `
uniform float Time;
uniform sampler2D BlurredCoverArt;

uniform vec2 BackgroundCircleOrigin;
uniform float BackgroundCircleRadius;

uniform vec2 CenterCircleOrigin;
uniform float CenterCircleRadius;

uniform vec2 LeftCircleOrigin;
uniform float LeftCircleRadius;

uniform vec2 RightCircleOrigin;
uniform float RightCircleRadius;
`
export type ShaderUniforms = {
	Time: { value: number };
	BlurredCoverArt: { value: THREE.Texture };

	BackgroundCircleOrigin: { value: THREE.Vector2 };
	BackgroundCircleRadius: { value: number };

	CenterCircleOrigin: { value: THREE.Vector2 };
	CenterCircleRadius: { value: number };

	LeftCircleOrigin: { value: THREE.Vector2 };
	LeftCircleRadius: { value: number };

	RightCircleOrigin: { value: THREE.Vector2 };
	RightCircleRadius: { value: number };
}

export const VertexShader = `
void main() {
	gl_Position = vec4(position, 1.0);
}
`;

export const FragmentShader = `
${Uniforms}

const vec2 rotateCenter = vec2(0.5, 0.5);
vec2 RotateAroundCenter(vec2 point, float angle) {
	vec2 offset = (point - rotateCenter);

	float s = sin(angle);
	float c = cos(angle);
	mat2 rotation = mat2(c, -s, s, c);
	offset = (rotation * offset);

	return (rotateCenter + offset);
}

const vec4 DefaultColor = vec4(0.0, 0.0, 0.0, 0.0);
void main() {
	gl_FragColor = DefaultColor;

	vec2 BackgroundCircleOffset = (gl_FragCoord.xy - BackgroundCircleOrigin);
	if (length(BackgroundCircleOffset) <= BackgroundCircleRadius) {
		gl_FragColor = texture2D(
			BlurredCoverArt,
			RotateAroundCenter(
				(((BackgroundCircleOffset / BackgroundCircleRadius) + 1.0) * 0.5),
				(Time * -0.25)
			)
		);
		gl_FragColor.a = 1.0;
	}

	vec2 CenterCircleOffset = (gl_FragCoord.xy - CenterCircleOrigin);
	if (length(CenterCircleOffset) <= CenterCircleRadius) {
		vec4 newColor = texture2D(
			BlurredCoverArt,
			RotateAroundCenter(
				(((CenterCircleOffset / CenterCircleRadius) + 1.0) * 0.5),
				(Time * 0.5)
			)
		);
		newColor.a *= 0.75;

		gl_FragColor.rgb = ((newColor.rgb * newColor.a) + (gl_FragColor.rgb * (1.0 - newColor.a)));
		gl_FragColor.a = (newColor.a + (gl_FragColor.a * (1.0 - newColor.a)));
	}

	vec2 LeftCircleOffset = (gl_FragCoord.xy - LeftCircleOrigin);
	if (length(LeftCircleOffset) <= LeftCircleRadius) {
		vec4 newColor = texture2D(
			BlurredCoverArt,
			RotateAroundCenter(
				(((LeftCircleOffset / LeftCircleRadius) + 1.0) * 0.5),
				(Time * 1.0)
			)
		);
		newColor.a *= 0.5;

		gl_FragColor.rgb = ((newColor.rgb * newColor.a) + (gl_FragColor.rgb * (1.0 - newColor.a)));
		gl_FragColor.a = (newColor.a + (gl_FragColor.a * (1.0 - newColor.a)));
	}

	vec2 RightCircleOffset = (gl_FragCoord.xy - RightCircleOrigin);
	if (length(RightCircleOffset) <= RightCircleRadius) {
		vec4 newColor = texture2D(
			BlurredCoverArt,
			RotateAroundCenter(
				(((RightCircleOffset / RightCircleRadius) + 1.0) * 0.5),
				(Time * -0.75)
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