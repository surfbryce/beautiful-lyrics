// Packages
import { Maid } from '../../../../../../Packages/Maid'

// Imported Types
import { BaseVocals } from '../Types'

// Class
export default class StaticVocals implements BaseVocals {
	// Private Properties
	private readonly Maid: Maid;

	// Constructor
	public constructor(lineContainer: HTMLElement, text: string) {
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
		syllableSpan.innerText = text
		container.appendChild(syllableSpan)

		// Finally, add our vocals to our line
		lineContainer.appendChild(container)
	}

	// Deconstructor
	public Destroy() {
		this.Maid.Destroy()
	}
}