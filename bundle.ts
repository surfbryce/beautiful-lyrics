// System Packages
import { exec } from "node:child_process"
import * as Path from "node:path"

// Style Processing Packages
import { compile as SASSCompile } from "sass"
import PostCSS from "postcss"
import AutoPrefixer from "autoprefixer"

// Bun Types
import type { BunPlugin } from "bun"

// Grab our spicetify-directory
const SpicetifyDirectory = await (
	new Promise<string>(
		(resolve, reject) => {
			exec(
				"spicetify -c",
				(error, stdout) => {
					if (error) {
						reject(error)
					} else {
						resolve(stdout)
					}
				}
			)
		}
	)
	.then(
		(stdout) => {
			return Path.dirname(stdout.trim())
		}
	)
)
const SpicetifyOutDirectory = Path.join(SpicetifyDirectory, "Extensions")

// Determine our extension-identifier for the DOM
const ExtensionIdentifier = "Beautiful-Lyrics"

// Helper functions
const ConvertToJSRawString = (string: string) => {
	return `String.raw\`${string.replace(/(\$\{|\`)/gm, "\\$1")}\``
}

// Store our state
const RawCSSInjections: string[] = []

// Build plugins
const SCSSInlineStyleNamespace = "SCSS-Inline-Styles"
const SCSSInlineStylesPlugin: BunPlugin = {
	name: SCSSInlineStyleNamespace,
	async setup(build) {
		// Create our Processor
		const PostCSSProcessor = PostCSS([AutoPrefixer])

		// Now handle our build steps
		build.onResolve(
			{ filter: /.\.(scss)$/ },
			args => (
				{
					path: Path.resolve(args.importer, "..", args.path),
					namespace: SCSSInlineStyleNamespace
				}
			)
		)

		build.onLoad(
			{
				filter: /.*/,
				namespace: SCSSInlineStyleNamespace
			},
			args => {
				const compiledCss = SASSCompile(args.path).css
				const processedCss = PostCSSProcessor.process(compiledCss, { from: args.path }).css
				RawCSSInjections.push(String.raw`${processedCss}`.trim())
				return {
					contents: ""
				}
			}
		)
	}
}

const CSSInlineStyleNamespace = "CSS-Inline-Styles"
const CSSInlineStylesPlugin: BunPlugin = {
	name: CSSInlineStyleNamespace,
	async setup(build) {
		// Now handle our build steps
		build.onResolve(
			{ filter: /.\.(css)$/ },
			args => (
				{
					path: Path.resolve(args.importer, "..", args.path),
					namespace: CSSInlineStyleNamespace
				}
			)
		)

		build.onLoad(
			{
				filter: /.*/,
				namespace: CSSInlineStyleNamespace
			},
			async args => {
				const css = (await Bun.file(args.path).text()).trim()
				RawCSSInjections.push(css)
				return {
					contents: ""
				}
			}
		)
	}
}

// Now build our javascript-bundle
const IsProduction = Bun.argv.includes("--production")
const Built = await Bun.build({
	entrypoints: ["./src/app.ts"],
	plugins: [CSSInlineStylesPlugin, SCSSInlineStylesPlugin],
	target: "browser",
	naming: `beautiful-lyrics.js`,
	sourcemap: "none",
	minify: IsProduction,
})
const Output = Built.outputs[0]
const Javascript = await Output.text()

// Put together all our CSS injections together
const FormattedCSSInjections = []
for(const css of RawCSSInjections) {
	FormattedCSSInjections.push(ConvertToJSRawString(css))
}
const CSSInjectionsString = `[${FormattedCSSInjections.join(", ")}]`

// Now compile our CSS injections
const CSSInjections = `{
	for(const css of ${CSSInjectionsString}) {
		const element = document.createElement("style")
		element.id = "${ExtensionIdentifier}"
		element.innerText = css
		document.head.appendChild(element)
	}
}`

// Finally, compile everything together and write our files
const Compiled = `${CSSInjections};(async () => {${Javascript}})();`
if (IsProduction) {
	await Bun.write(
		"./dist/beautiful-lyrics.js",
		Compiled
	)
}
await Bun.write(
	`${SpicetifyOutDirectory}/beautiful-lyrics.js`,
	Compiled
)
