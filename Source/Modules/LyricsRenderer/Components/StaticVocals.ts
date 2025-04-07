// Packages
import { Maid, Giveable } from 'jsr:@socali/modules/Maid'

// Imported Types
import { TextMetadata } from "jsr:@socali/beautiful-lyrics/Types/Lyrics"
import { BaseVocals } from '../Types.d.ts'

// Class
export default class StaticVocals implements BaseVocals, Giveable {
	// Private Properties
	private readonly Maid: Maid;
	private readonly LyricMetadata: TextMetadata;

	// Constructor
	public constructor(
		lineContainer: HTMLElement, lyricMetadata: TextMetadata,
		isRomanized: boolean
	) {
		// Store our lyric-metadata
		this.LyricMetadata = lyricMetadata

		// Create our maid
		this.Maid = new Maid()

		// First create our container
		const container = this.Maid.Give(document.createElement('div'))
		container.classList.add('Vocals')
		container.classList.add('Lead')
		container.classList.add('Active')

		// Create our main span element
		const syllableSpan = this.Maid.Give(document.createElement('span'))
		syllableSpan.classList.add('Lyric')
		syllableSpan.classList.add('Static')
		syllableSpan.innerText = (isRomanized && lyricMetadata.RomanizedText || lyricMetadata.Text)
		container.appendChild(syllableSpan)

		// Finally, add our vocals to our line
		lineContainer.appendChild(container)
	}

	// Deconstructor
	public Destroy() {
		this.Maid.Destroy()
	}
}