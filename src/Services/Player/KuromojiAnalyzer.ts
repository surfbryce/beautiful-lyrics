// Language Modules
import KuromojiType, { Tokenizer, IpadicFeatures } from "kuromoji"
const Kuromoji = require("./Kuromoji.js") as typeof KuromojiType

// Class
class KuromojiAnalyzer {
	// Private Properties
	private Analyzer?: Tokenizer<IpadicFeatures>

	public init(): Promise<void> {
		if (this.Analyzer !== undefined) {
			return Promise.resolve()
		}

		return new Promise(
			(resolve, reject) => {
				Kuromoji.builder(
					{
						dicPath: "https://kuromoji.socalifornian.live"
					}
				).build(
					(error, analyzer) => {
						if (error) {
							return reject(error)
						}

						this.Analyzer = analyzer
						resolve()
					}
				)
			}
		)
	}

	public parse(text = ""): Promise<IpadicFeatures[]> {
		if ((text.trim() === "") || (this.Analyzer === undefined)) return Promise.resolve([])

		const result = this.Analyzer.tokenize(text) as any[]
		for(const token of result) {
			token.verbose = {
				word_id: token.word_id,
				word_type: token.word_type,
				word_position: token.word_position
			}
			delete token.word_id
			delete token.word_type
			delete token.word_position
		}

		return Promise.resolve(result)
	}
}

// Export our analyzer-class
export default new KuromojiAnalyzer()