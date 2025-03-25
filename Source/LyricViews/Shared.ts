// Imported Types
import type { RomanizedLanguage } from "@socali/Spices/Player"

// NPM Packages
import seedrandom from "npm:seedrandom"

// JSR
import * as THREE from "jsr:@3d/three"

// Web-Modules
import { Signal } from "jsr:@socali/modules/Signal"
import type { Maid } from "jsr:@socali/modules/Maid"
import { OnPreRender } from "jsr:@socali/modules/Scheduler"

// Spices
import { GetInstantStore } from "jsr:@socali/spices/Spicetify/Services/Cache"
import {
	Song, SongChanged,
	SongContext, SongContextChanged
} from "@socali/Spices/Player"

// Shaders
import {
	GetShaderUniforms, type ShaderUniforms,
	VertexShader, FragmentShader
} from "./Shaders.ts"

// Our store
export const Store = GetInstantStore<
	{
		CardLyricsVisible: boolean;
		PlaybarDetailsHidden: boolean;
		RomanizedLanguages: {[key in RomanizedLanguage]: boolean};
	}
>(
	"BeautifulLyrics/LyricViews", 1,
	{
		CardLyricsVisible: false,
		PlaybarDetailsHidden: false,
		RomanizedLanguages: {
			Chinese: false,
			Japanese: false,
			Korean: false,
		}
	}
)

// Shared Signals
const LanguageRomanizationChangedSignal = new Signal<(language: string, isRomanized: boolean) => void>()
export const LanguageRomanizationChanged = LanguageRomanizationChangedSignal.GetEvent()

// Shared Methods
export const CreateElement = <E = HTMLElement>(text: string) => {
	const element = document.createElement("div")
	element.innerHTML = text
	return element.firstElementChild as E
}

export const ToggleLanguageRomanization = (language: RomanizedLanguage, isRomanized: boolean) => {
	// Determine whether or not we've even changed in state
	if (Store.Items.RomanizedLanguages[language] !== isRomanized) {
		// Update ourselves
		Store.Items.RomanizedLanguages[language] = isRomanized

		// Save our changes
		Store.SaveChanges()

		// Now fire that we've changed
		LanguageRomanizationChangedSignal.Fire(language, isRomanized)
	}
}

export const IsLanguageRomanized = (language: RomanizedLanguage): boolean => {
	return (Store.Items.RomanizedLanguages[language] === true)
}

//* FUTURE PRE-BLUR SUPPORT
//const CoverArtContainerFilters: Map<(CoverArtContainer | "Default"), string> = new Map()
//CoverArtContainerFilters.set("Default", "brightness(0.5) saturate(2.5)")
//CoverArtContainerFilters.set("SidePanel", "brightness(1) saturate(2.25)")

// Handle applying our dynamic-background
const BackgroundClassName = "BeautifulLyricsBackground"

export const GetCoverArtForSong = (): [string, (number | undefined)] => {
	// DJ is ALWAYS guaranteed to have a cover-art
	if (Song?.Type === "DJ") {
		return [Song.CoverArt.Big, undefined]
	}

	const coverArt = (
		(Song?.Type === "Local")
		? (
			Song?.CoverArt
			?? (
				(SongContext?.CoverArt !== undefined)
				? `spotify:image:${SongContext.CoverArt}`
				: undefined
			)
		)
		: Song?.CoverArt.Big
	)
	if (coverArt === undefined) {
		return [
			"https://images.socalifornian.live/SongPlaceholderFull.png",
			(75 + ((360 - 75) * seedrandom(Song?.Uri)()))
		]
	} else {
		return [coverArt, undefined]
	}
}

// Blurred Cover Art Generation
let Blurred_CovertArt: OffscreenCanvas
const CoverArtBlurred = new Signal()
const GenerateBlurredCoverArt = async () => {
	const [coverArt, placeholderHueShift] = GetCoverArtForSong()

	const image = new Image()
	image.src = coverArt
	await image.decode()

	const originalSize = Math.min(image.width, image.height) // Crop to a square
	const blurExtent = Math.ceil(3 * 40) // Blur spread extent

	// Create a square canvas to crop the image into a circle
	const circleCanvas = new OffscreenCanvas(originalSize, originalSize)
	const circleCtx = circleCanvas.getContext('2d')!

	// Create circular clipping mask
	circleCtx.beginPath()
	circleCtx.arc(originalSize / 2, originalSize / 2, originalSize / 2, 0, Math.PI * 2)
	circleCtx.closePath()
	circleCtx.clip()

	// Draw the original image inside the circular clip
	circleCtx.drawImage(
		image,
		((image.width - originalSize) / 2), ((image.height - originalSize) / 2),
		originalSize, originalSize,
		0, 0,
		originalSize, originalSize
	)

	// Expand canvas to accommodate blur effect
	const padding = (blurExtent * 1.5)
	const expandedSize = originalSize + padding
	const blurredCanvas = new OffscreenCanvas(expandedSize, expandedSize)
	const blurredCtx = blurredCanvas.getContext('2d')!

	blurredCtx.filter = `hue-rotate(${placeholderHueShift ?? 0}deg) blur(${40}px)`

	// Draw the cropped circular image in the center of the expanded canvas
	blurredCtx.drawImage(circleCanvas, (padding / 2), (padding / 2))

	if (GetCoverArtForSong()[0] === coverArt) {
		Blurred_CovertArt = blurredCanvas
		CoverArtBlurred.Fire()
	}
}
GenerateBlurredCoverArt()
SongChanged.Connect(GenerateBlurredCoverArt)
SongContextChanged.Connect(GenerateBlurredCoverArt) // We might use Playlist cover instead

// Setup Referential Renderer Objects
const RenderCamera = new THREE.OrthographicCamera(
	-1, 1, 1, -1, 0.1, 10
) as ( THREE.OrthographicCamera & { position: THREE.Vector3 } )
RenderCamera.position.z = 1
const MeshGeometry = new THREE.PlaneGeometry(2, 2)

export const ApplyDynamicBackground = (element: HTMLElement, maid: Maid) => {
	// Give our element the class
	{
		element.classList.toggle(BackgroundClassName, true)
		maid.Give(() => element.classList.toggle(BackgroundClassName, false))

		// Handle re-adding our class IF we are removed
		const observer = maid.Give(new MutationObserver(() => element.classList.toggle(BackgroundClassName, true)))
		observer.observe(
			element,
			{ attributes: true, attributeFilter: ['class'], childList: false, subtree: false }
		)
	}

	const renderScene = new THREE.Scene()
	const materialUniforms = GetShaderUniforms()
	const meshMaterial = new THREE.ShaderMaterial(
		{
			uniforms: materialUniforms,
			vertexShader: VertexShader,
			fragmentShader: FragmentShader,
		}
	) as (THREE.MeshBasicMaterial & THREE.ShaderMaterial & { uniforms: ShaderUniforms })
	const sceneMesh = new THREE.Mesh(MeshGeometry, meshMaterial)
	renderScene.add(sceneMesh)

	const renderer = new THREE.WebGLRenderer({ alpha: true })
	const rendererElement = renderer.domElement
	renderer.setPixelRatio(globalThis.devicePixelRatio)
	rendererElement.classList.add(`${BackgroundClassName}-Container`)
	maid.Give(() => renderer.dispose())
	maid.Give(rendererElement)

	const UpdateBackgroundImages = () => {
		const texture = new THREE.CanvasTexture(Blurred_CovertArt)
		texture.minFilter = THREE.NearestFilter
		texture.magFilter = THREE.NearestFilter
		materialUniforms.BlurredCoverArt.value = texture
		renderer.render(renderScene, RenderCamera)
	}
	UpdateBackgroundImages()
	maid.Give(CoverArtBlurred.Connect(UpdateBackgroundImages))

	{
		const UpdateDimensions = () => {
			const width = element.clientWidth
			const height = element.clientHeight
			renderer.setSize(width, height)
	
			const scaledWidth = (width * globalThis.devicePixelRatio)
			const scaledHeight = (height * globalThis.devicePixelRatio)
	
			const largestAxis = ((scaledWidth > scaledHeight) ? "X" : "Y")
			const largestAxisSize = ((scaledWidth > scaledHeight) ? scaledWidth : scaledHeight)

			materialUniforms.BackgroundCircleOrigin.value.set((scaledWidth / 2), (scaledHeight / 2))
			materialUniforms.BackgroundCircleRadius.value = (largestAxisSize * 1.5)

			materialUniforms.CenterCircleOrigin.value.set((scaledWidth / 2), (scaledHeight / 2))
			materialUniforms.CenterCircleRadius.value = (
				largestAxisSize
				* ((largestAxis === "X") ? 1 : 0.75)
			)
	
			materialUniforms.LeftCircleOrigin.value.set(0, scaledHeight)
			materialUniforms.LeftCircleRadius.value = (largestAxisSize * 0.75)
			
			materialUniforms.RightCircleOrigin.value.set(scaledWidth, 0)
			materialUniforms.RightCircleRadius.value = (
				largestAxisSize
				* ((largestAxis === "X") ? 0.65 : 0.5)
			)
		}
		maid.Give(OnPreRender(UpdateDimensions))
		const sizeObserver = maid.Give(new ResizeObserver(UpdateDimensions))
		sizeObserver.observe(element)
	}

	const RenderUpdate = () => {
		materialUniforms.Time.value = (performance.now() / 3500)
		renderer.render(renderScene, RenderCamera)
		maid.Give(OnPreRender(RenderUpdate))
	}
	RenderUpdate()

	element.prepend(renderer.domElement)
}