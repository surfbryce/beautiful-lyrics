/**
	Aromanize-js
	@author Fajar Chandra
	@since 2017.12.06

	UNICODE TABLE REFERENCES
	Hangul Jamo            0x3131 - 0x
	Hangul Choseong Jaeum  0x1100 - 0x1112
	Hangul Jungseong Moeum 0x1161 -
	Hangul Jongseong Jaeum 0x11A8
	Hangul Eumjeol         0xAC00
*/

// Romanization Constants
const TransliterationRules = {
	// Revised Romanization Transcription
	"RevisedRomanizationTranscription": {
		// Note: giyeok (0x1100) for middle moeum is different than giyeok (0x3131) for standalone jamo
		cho: {
			"ᄀ": "g",
			"ᄁ": "kk",
			"ᄂ": "n",
			"ᄃ": "d",
			"ᄄ": "tt",
			"ᄅ": "r",
			"ᄆ": "m",
			"ᄇ": "b",
			"ᄈ": "pp",
			"ᄉ": "s",
			"ᄊ": "ss",
			"ᄋ": "",
			"ᄌ": "j",
			"ᄍ": "jj",
			"ᄎ": "ch",
			"ᄏ": "k",
			"ᄐ": "t",
			"ᄑ": "p",
			"ᄒ": "h",
		},

		cho2: undefined,

		// Note: ᅡ (0x1161) for middle moeum is different than ㅏ (0x314F) for standalone jamo
		jung: {
			"ᅡ": "a",
			"ᅢ": "ae",
			"ᅣ": "ya",
			"ᅤ": "yae",
			"ᅥ": "eo",
			"ᅦ": "e",
			"ᅧ": "yeo",
			"ᅨ": "ye",
			"ᅩ": "o",
			"ᅪ": "wa",
			"ᅫ": "wae",
			"ᅬ": "oe",
			"ᅭ": "yo",
			"ᅮ": "u",
			"ᅯ": "wo",
			"ᅰ": "we",
			"ᅱ": "wi",
			"ᅲ": "yu",
			"ᅳ": "eu",
			"ᅴ": "eui",
			"ᅵ": "i",
		},

		// Note: ᆨ (0x11A8) for last jaeum (batchim) is different than ᄀ (0x1100) for first jaeum
		// also different than ㄱ (0x3131) for standalone jamo
		jong: {
			"ᆨ": "k",
			"ᆨᄋ": "g",
			"ᆨᄂ": "ngn",
			"ᆨᄅ": "ngn",
			"ᆨᄆ": "ngm",
			"ᆨᄒ": "kh",
			"ᆩ": "kk",
			"ᆩᄋ": "kg",
			"ᆩᄂ": "ngn",
			"ᆩᄅ": "ngn",
			"ᆩᄆ": "ngm",
			"ᆩᄒ": "kh",
			"ᆪ": "k",
			"ᆪᄋ": "ks",
			"ᆪᄂ": "ngn",
			"ᆪᄅ": "ngn",
			"ᆪᄆ": "ngm",
			"ᆪᄒ": "kch",
			"ᆫ": "n",
			"ᆫᄅ": "ll",
			"ᆬ": "n",
			"ᆬᄋ": "nj",
			"ᆬᄂ": "nn",
			"ᆬᄅ": "nn",
			"ᆬᄆ": "nm",
			"ᆬㅎ": "nch",
			"ᆭ": "n",
			"ᆭᄋ": "nh",
			"ᆭᄅ": "nn",
			"ᆮ": "t",
			"ᆮᄋ": "d",
			"ᆮᄂ": "nn",
			"ᆮᄅ": "nn",
			"ᆮᄆ": "nm",
			"ᆮᄒ": "th",
			"ᆯ": "l",
			"ᆯᄋ": "r",
			"ᆯᄂ": "ll",
			"ᆰ": "k",
			"ᆰᄋ": "lg",
			"ᆰᄂ": "ngn",
			"ᆰᄅ": "ngn",
			"ᆰᄆ": "ngm",
			"ᆰᄒ": "lkh",
			"ᆱ": "m",
			"ᆱᄋ": "lm",
			"ᆱᄂ": "mn",
			"ᆱᄅ": "mn",
			"ᆱᄆ": "mm",
			"ᆱᄒ": "lmh",
			"ᆲ": "p",
			"ᆲᄋ": "lb",
			"ᆲᄂ": "mn",
			"ᆲᄅ": "mn",
			"ᆲᄆ": "mm",
			"ᆲᄒ": "lph",
			"ᆳ": "t",
			"ᆳᄋ": "ls",
			"ᆳᄂ": "nn",
			"ᆳᄅ": "nn",
			"ᆳᄆ": "nm",
			"ᆳᄒ": "lsh",
			"ᆴ": "t",
			"ᆴᄋ": "lt",
			"ᆴᄂ": "nn",
			"ᆴᄅ": "nn",
			"ᆴᄆ": "nm",
			"ᆴᄒ": "lth",
			"ᆵ": "p",
			"ᆵᄋ": "lp",
			"ᆵᄂ": "mn",
			"ᆵᄅ": "mn",
			"ᆵᄆ": "mm",
			"ᆵᄒ": "lph",
			"ᆶ": "l",
			"ᆶᄋ": "lh",
			"ᆶᄂ": "ll",
			"ᆶᄅ": "ll",
			"ᆶᄆ": "lm",
			"ᆶᄒ": "lh",
			"ᆷ": "m",
			"ᆷᄅ": "mn",
			"ᆸ": "p",
			"ᆸᄋ": "b",
			"ᆸᄂ": "mn",
			"ᆸᄅ": "mn",
			"ᆸᄆ": "mm",
			"ᆸᄒ": "ph",
			"ᆹ": "p",
			"ᆹᄋ": "ps",
			"ᆹᄂ": "mn",
			"ᆹᄅ": "mn",
			"ᆹᄆ": "mm",
			"ᆹᄒ": "psh",
			"ᆺ": "t",
			"ᆺᄋ": "s",
			"ᆺᄂ": "nn",
			"ᆺᄅ": "nn",
			"ᆺᄆ": "nm",
			"ᆺᄒ": "sh",
			"ᆻ": "t",
			"ᆻᄋ": "ss",
			"ᆻᄂ": "tn",
			"ᆻᄅ": "tn",
			"ᆻᄆ": "nm",
			"ᆻᄒ": "th",
			"ᆼ": "ng",
			"ᆽ": "t",
			"ᆽᄋ": "j",
			"ᆽᄂ": "nn",
			"ᆽᄅ": "nn",
			"ᆽᄆ": "nm",
			"ᆽᄒ": "ch",
			"ᆾ": "t",
			"ᆾᄋ": "ch",
			"ᆾᄂ": "nn",
			"ᆾᄅ": "nn",
			"ᆾᄆ": "nm",
			"ᆾᄒ": "ch",
			"ᆿ": "k",
			"ᆿᄋ": "k",
			"ᆿᄂ": "ngn",
			"ᆿᄅ": "ngn",
			"ᆿᄆ": "ngm",
			"ᆿᄒ": "kh",
			"ᇀ": "t",
			"ᇀᄋ": "t",
			"ᇀᄂ": "nn",
			"ᇀᄅ": "nn",
			"ᇀᄆ": "nm",
			"ᇀᄒ": "th",
			"ᇁ": "p",
			"ᇁᄋ": "p",
			"ᇁᄂ": "mn",
			"ᇁᄅ": "mn",
			"ᇁᄆ": "mm",
			"ᇁᄒ": "ph",
			"ᇂ": "t",
			"ᇂᄋ": "h",
			"ᇂᄂ": "nn",
			"ᇂᄅ": "nn",
			"ᇂᄆ": "mm",
			"ᇂᄒ": "t",
		},
	},

	// Revised Romanization Transliteration
	"RevisedRomanizationTransliteration": {
		// Note: giyeok (0x1100) for middle moeum is different than giyeok (0x3131) for standalone jamo
		cho: {
			"ᄀ": "g",
			"ᄁ": "kk",
			"ᄂ": "n",
			"ᄃ": "d",
			"ᄄ": "tt",
			"ᄅ": "l",
			"ᄆ": "m",
			"ᄇ": "b",
			"ᄈ": "pp",
			"ᄉ": "s",
			"ᄊ": "ss",
			"ᄋ": "",
			"ᄌ": "j",
			"ᄍ": "jj",
			"ᄎ": "ch",
			"ᄏ": "k",
			"ᄐ": "t",
			"ᄑ": "p",
			"ᄒ": "h",
		},

		cho2: undefined,

		// Note: ᅡ (0x1161) for middle moeum is different than ㅏ (0x314F) for standalone jamo
		jung: {
			"ᅡ": "a",
			"ᅢ": "ae",
			"ᅣ": "ya",
			"ᅤ": "yae",
			"ᅥ": "eo",
			"ᅦ": "e",
			"ᅧ": "yeo",
			"ᅨ": "ye",
			"ᅩ": "o",
			"ᅪ": "oa",
			"ᅫ": "oae",
			"ᅬ": "oi",
			"ᅭ": "yo",
			"ᅮ": "u",
			"ᅯ": "ueo",
			"ᅰ": "ue",
			"ᅱ": "ui",
			"ᅲ": "yu",
			"ᅳ": "eu",
			"ᅴ": "eui",
			"ᅵ": "i",
		},

		// Note: ᆨ (0x11A8) for last jaeum (batchim) is different than ᄀ (0x1100) for first jaeum
		// also different than ㄱ (0x3131) for standalone jamo
		jong: {
			"ᆨ": "g",
			"ᆨᄋ": "g-",
			"ᆩ": "kk",
			"ᆩᄋ": "kk-",
			"ᆪ": "gs",
			"ᆪᄋ": "gs-",
			"ᆪᄉ": "gs-s",
			"ᆫ": "n",
			"ᆫᄋ": "n-",
			"ᆬ": "nj",
			"ᆬᄋ": "nj-",
			"ᆬᄌ": "nj-j",
			"ᆭ": "nh",
			"ᆭᄋ": "nh-",
			"ᆮ": "d",
			"ᆮᄋ": "d-",
			"ᆯ": "l",
			"ᆯᄋ": "l-",
			"ᆰ": "lg",
			"ᆰᄋ": "lg-",
			"ᆱ": "lm",
			"ᆱᄋ": "lm-",
			"ᆲ": "lb",
			"ᆲᄋ": "lb-",
			"ᆳ": "ls",
			"ᆳᄋ": "ls-",
			"ᆳᄉ": "ls-s",
			"ᆴ": "lt",
			"ᆴᄋ": "lt-",
			"ᆵ": "lp",
			"ᆵᄋ": "lp-",
			"ᆶ": "lh",
			"ᆶᄋ": "lh-",
			"ᆷ": "m",
			"ᆷᄋ": "m-",
			"ᆸ": "b",
			"ᆸᄋ": "b-",
			"ᆹ": "bs",
			"ᆹᄋ": "bs-",
			"ᆹᄉ": "bs-s",
			"ᆺ": "s",
			"ᆺᄋ": "s-",
			"ᆺᄊ": "s-ss",
			"ᆻ": "ss",
			"ᆻᄋ": "ss-",
			"ᆻᄉ": "ss-s",
			"ᆼ": "ng",
			"ᆼᄋ": "ng-",
			"ᆽ": "j",
			"ᆽᄋ": "j-",
			"ᆽᄌ": "j-j",
			"ᆾ": "ch",
			"ᆾᄋ": "ch-",
			"ᆿ": "k",
			"ᆿᄋ": "k-",
			"ᇀ": "t",
			"ᇀᄋ": "t-",
			"ᇁ": "p",
			"ᇁᄋ": "p-",
			"ᇂ": "h",
			"ᇂᄋ": "h-",
		},
	},

	"Skats": {
		hyphen: " ",

		// Note: giyeok (0x1100) for middle moeum is different than giyeok (0x3131) for standalone jamo
		cho: {
			"ᄀ": "L",
			"ᄁ": "LL",
			"ᄂ": "F",
			"ᄃ": "B",
			"ᄄ": "BB",
			"ᄅ": "V",
			"ᄆ": "M",
			"ᄇ": "W",
			"ᄈ": "WW",
			"ᄉ": "G",
			"ᄊ": "GG",
			"ᄋ": "K",
			"ᄌ": "P",
			"ᄍ": "PP",
			"ᄎ": "C",
			"ᄏ": "X",
			"ᄐ": "Z",
			"ᄑ": "O",
			"ᄒ": "J",
			" ": "  ",
		},

		cho2: undefined,

		// Note: ᅡ (0x1161) for middle moeum is different than ㅏ (0x314F) for standalone jamo
		jung: {
			"ᅡ": "E",
			"ᅢ": "EU",
			"ᅣ": "I",
			"ᅤ": "IU",
			"ᅥ": "T",
			"ᅦ": "TU",
			"ᅧ": "S",
			"ᅨ": "SU",
			"ᅩ": "A",
			"ᅪ": "AE",
			"ᅫ": "AEU",
			"ᅬ": "AU",
			"ᅭ": "N",
			"ᅮ": "H",
			"ᅯ": "HT",
			"ᅰ": "HTU",
			"ᅱ": "HU",
			"ᅲ": "R",
			"ᅳ": "D",
			"ᅴ": "DU",
			"ᅵ": "U",
		},

		// Note: ᆨ (0x11A8) for last jaeum (batchim) is different than ᄀ (0x1100) for first jaeum
		// also different than ㄱ (0x3131) for standalone jamo
		jong: {
			"ᆨ": "L",
			"ᆩ": "LL",
			"ᆪ": "LG",
			"ᆫ": "F",
			"ᆬ": "FP",
			"ᆭ": "FJ",
			"ᆮ": "B",
			"ᆯ": "V",
			"ᆰ": "VL",
			"ᆱ": "VM",
			"ᆲ": "VW",
			"ᆳ": "VG",
			"ᆴ": "VZ",
			"ᆵ": "VO",
			"ᆶ": "VJ",
			"ᆷ": "M",
			"ᆸ": "W",
			"ᆹ": "WG",
			"ᆺ": "G",
			"ᆻ": "GG",
			"ᆼ": "K",
			"ᆽ": "P",
			"ᆾ": "C",
			"ᆿ": "X",
			"ᇀ": "Z",
			"ᇁ": "O",
			"ᇂ": "J",
		},
	},

	// Indonesian Transcription
	"IndonesionTranscription": {
		// Note: giyeok (0x1100) for middle moeum is different than giyeok (0x3131) for standalone jamo
		cho: {
			"ᄀ": "gh",
			"ᄁ": "k",
			"ᄂ": "n",
			"ᄃ": "dh",
			"ᄄ": "t",
			"ᄅ": "r",
			"ᄆ": "m",
			"ᄇ": "bh",
			"ᄈ": "p",
			"ᄉ": "s",
			"ᄊ": "s",
			"ᄋ": "",
			"ᄌ": "jh",
			"ᄍ": "c",
			"ᄎ": "ch",
			"ᄏ": "kh",
			"ᄐ": "th",
			"ᄑ": "ph",
			"ᄒ": "h",
		},

		// Note: giyeok (0x1100) for middle moeum is different than giyeok (0x3131) for standalone jamo
		cho2: {
			"ᄀ": "g",
			"ᄁ": "k",
			"ᄂ": "n",
			"ᄃ": "d",
			"ᄄ": "t",
			"ᄅ": "r",
			"ᄆ": "m",
			"ᄇ": "b",
			"ᄈ": "p",
			"ᄉ": "s",
			"ᄊ": "s",
			"ᄋ": "",
			"ᄌ": "j",
			"ᄍ": "c",
			"ᄎ": "ch",
			"ᄏ": "kh",
			"ᄐ": "th",
			"ᄑ": "ph",
			"ᄒ": "h",
		},

		// Note: ᅡ (0x1161) for middle moeum is different than ㅏ (0x314F) for standalone jamo
		jung: {
			"ᅡ": "a",
			"ᅢ": "è",
			"ᅣ": "ya",
			"ᅤ": "yè",
			"ᅥ": "ö",
			"ᅦ": "é",
			"ᅧ": "yö",
			"ᅨ": "yé",
			"ᅩ": "o",
			"ᅪ": "wa",
			"ᅫ": "wè",
			"ᅬ": "wé",
			"ᅭ": "yo",
			"ᅮ": "u",
			"ᅯ": "wo",
			"ᅰ": "wé",
			"ᅱ": "wi",
			"ᅲ": "yu",
			"ᅳ": "eu",
			"ᅴ": "eui",
			"ᅵ": "i",
		},

		// Note: ᆨ (0x11A8) for last jaeum (batchim) is different than ᄀ (0x1100) for first jaeum
		// also different than ㄱ (0x3131) for standalone jamo
		jong: {
			"ᆨ": "k",
			"ᆨᄋ": "g",
			"ᆨᄂ": "ngn",
			"ᆨᄅ": "ngn",
			"ᆨᄆ": "ngm",
			"ᆨᄒ": "kh",
			"ᆩ": "k",
			"ᆩᄋ": "kg",
			"ᆩᄂ": "ngn",
			"ᆩᄅ": "ngn",
			"ᆩᄆ": "ngm",
			"ᆩᄒ": "kh",
			"ᆪ": "k",
			"ᆪᄋ": "ks",
			"ᆪᄂ": "ngn",
			"ᆪᄅ": "ngn",
			"ᆪᄆ": "ngm",
			"ᆪᄒ": "kch",
			"ᆫ": "n",
			"ᆫᄅ": "ll",
			"ᆬ": "n",
			"ᆬᄋ": "nj",
			"ᆬᄂ": "nn",
			"ᆬᄅ": "nn",
			"ᆬᄆ": "nm",
			"ᆬㅎ": "nch",
			"ᆭ": "n",
			"ᆭᄋ": "nh",
			"ᆭᄅ": "nn",
			"ᆮ": "t",
			"ᆮᄋ": "d",
			"ᆮᄂ": "nn",
			"ᆮᄅ": "nn",
			"ᆮᄆ": "nm",
			"ᆮᄒ": "th",
			"ᆯ": "l",
			"ᆯᄋ": "r",
			"ᆯᄂ": "ll",
			"ᆰ": "k",
			"ᆰᄋ": "lg",
			"ᆰᄂ": "ngn",
			"ᆰᄅ": "ngn",
			"ᆰᄆ": "ngm",
			"ᆰᄒ": "lkh",
			"ᆱ": "m",
			"ᆱᄋ": "lm",
			"ᆱᄂ": "mn",
			"ᆱᄅ": "mn",
			"ᆱᄆ": "mm",
			"ᆱᄒ": "lmh",
			"ᆲ": "p",
			"ᆲᄋ": "lb",
			"ᆲᄂ": "mn",
			"ᆲᄅ": "mn",
			"ᆲᄆ": "mm",
			"ᆲᄒ": "lph",
			"ᆳ": "t",
			"ᆳᄋ": "ls",
			"ᆳᄂ": "nn",
			"ᆳᄅ": "nn",
			"ᆳᄆ": "nm",
			"ᆳᄒ": "lsh",
			"ᆴ": "t",
			"ᆴᄋ": "lt",
			"ᆴᄂ": "nn",
			"ᆴᄅ": "nn",
			"ᆴᄆ": "nm",
			"ᆴᄒ": "lth",
			"ᆵ": "p",
			"ᆵᄋ": "lp",
			"ᆵᄂ": "mn",
			"ᆵᄅ": "mn",
			"ᆵᄆ": "mm",
			"ᆵᄒ": "lph",
			"ᆶ": "l",
			"ᆶᄋ": "lh",
			"ᆶᄂ": "ll",
			"ᆶᄅ": "ll",
			"ᆶᄆ": "lm",
			"ᆶᄒ": "lh",
			"ᆷ": "m",
			"ᆷᄅ": "mn",
			"ᆸ": "p",
			"ᆸᄋ": "b",
			"ᆸᄂ": "mn",
			"ᆸᄅ": "mn",
			"ᆸᄆ": "mm",
			"ᆸᄒ": "ph",
			"ᆹ": "p",
			"ᆹᄋ": "ps",
			"ᆹᄂ": "mn",
			"ᆹᄅ": "mn",
			"ᆹᄆ": "mm",
			"ᆹᄒ": "psh",
			"ᆺ": "t",
			"ᆺᄋ": "sh",
			"ᆺᄂ": "nn",
			"ᆺᄅ": "nn",
			"ᆺᄆ": "nm",
			"ᆺᄒ": "sh",
			"ᆻ": "t",
			"ᆻᄋ": "s",
			"ᆻᄂ": "nn",
			"ᆻᄅ": "nn",
			"ᆻᄆ": "nm",
			"ᆻᄒ": "th",
			"ᆼ": "ng",
			"ᆽ": "t",
			"ᆽᄋ": "j",
			"ᆽᄂ": "nn",
			"ᆽᄅ": "nn",
			"ᆽᄆ": "nm",
			"ᆽᄒ": "ch",
			"ᆾ": "t",
			"ᆾᄋ": "ch",
			"ᆾᄂ": "nn",
			"ᆾᄅ": "nn",
			"ᆾᄆ": "nm",
			"ᆾᄒ": "ch",
			"ᆿ": "k",
			"ᆿᄋ": "k",
			"ᆿᄂ": "ngn",
			"ᆿᄅ": "ngn",
			"ᆿᄆ": "ngm",
			"ᆿᄒ": "kh",
			"ᇀ": "t",
			"ᇀᄋ": "t",
			"ᇀᄂ": "nn",
			"ᇀᄅ": "nn",
			"ᇀᄆ": "nm",
			"ᇀᄒ": "th",
			"ᇀ이": "ch",
			"ᇁ": "p",
			"ᇁᄋ": "p",
			"ᇁᄂ": "mn",
			"ᇁᄅ": "mn",
			"ᇁᄆ": "mm",
			"ᇁᄒ": "ph",
			"ᇂ": "t",
			"ᇂᄋ": "h",
			"ᇂᄂ": "nn",
			"ᇂᄅ": "nn",
			"ᇂᄆ": "mm",
			"ᇂᄒ": "t",
		},
	},
}

// Recognition Constants
const HasWhitespaceCheck = /\s/

// Helper Functions
// Check if it's letter or numbers
const IsChoseong = (character: string) => ((character.charCodeAt(0) >= 0x1100) && (character.charCodeAt(0) <= 0x1112))

// Converts Hangul/Hiragana/Katakana to Romaja
export default (
	// Source String, Romanization Rule, Hyphenate Syllables with Specified Characters
	text: string, ruleset: keyof typeof TransliterationRules,
	syllableHyphenation: string = ""
) => {
	// Grab our rules
	const rules = (TransliterationRules[ruleset] as Record<string, (Record<string, string> | undefined)>)

	// Now determine our romanized text
	let composedRomanization = ""
	let currentSegment: (string | undefined)
	let processJaeum = true // Indicates jaeum to be processed
	for (let index = 0; index <= text.length; index += 1) {
		// If next is hangul syllable, separate it into jamo
		// 0xAC00 is the first hangul syllable in unicode table
		// 0x1100 is the first hangul jaeum in unicode table
		// 0x1161 is the first hangul moeum in unicode table
		// 0x11A8 is the first hangul batchim in unicode table
		let nextIdx = (text.charCodeAt(index) - 0xAC00)
		let nextSegment: string
		if ((isNaN(nextIdx) === false) && (nextIdx >= 0) && (nextIdx <= 11171)) {
			nextSegment = (
				String.fromCharCode(Math.floor(nextIdx / 588) + 0x1100)
				+ String.fromCharCode(Math.floor((nextIdx % 588) / 28) + 0x1161)
				+ (((nextIdx % 28) == 0) ? "" : String.fromCharCode((nextIdx % 28) + 0x11A7)) // Index 0 is reserved for nothing
			)
		} else {
			nextSegment = text.charAt(index)
		}

		// Except for first iteration (curr is null),
		// Curr and next contains 2 or 3 jamo, or 1 non-hangul letter
		if (currentSegment !== undefined) {
			let piece = ""

			// Choseong Jaeum
			const currentFirstCharacter = currentSegment.charAt(0)
			if (processJaeum) {
				// If not the first syllable, try cho2 if defined
				if (
					(index > 0) && (HasWhitespaceCheck.test(text.charAt(index - 2)) === false)
					&& ((rules.cho2 !== undefined) && (rules.cho2[currentFirstCharacter] !== undefined))
				) {
					piece += rules.cho2[currentFirstCharacter]
				} else if (rules.cho![currentFirstCharacter] !== undefined) {
					piece += rules.cho![currentFirstCharacter]
				} else {
					piece += currentFirstCharacter
				}
			} else {
				processJaeum = true
			}

			// Jungseong Moeum
			const currentSegmentLength = currentSegment.length
			if (currentSegmentLength > 1) {
				const currentSecondCharacter = currentSegment.charAt(1)
				if (rules.jung![currentSecondCharacter] !== undefined) {
					piece += rules.jung![currentSecondCharacter]
				} else {
					piece += currentSecondCharacter
				}

				// Add hyphen if no batchim
				if (currentSegmentLength === 2) {
					if (IsChoseong(nextSegment.charAt(0))) {
						piece += " "
					}
				} else if (currentSegmentLength > 2) { // Jongseong Jaeum (Batchim)
					// Changing sound with next jaeum + moeum
					const currentThirdCharacter = currentSegment.charAt(2)
					const nextFirstCharacter = nextSegment.charAt(0)
					const nextSecondCharacter = nextSegment.charAt(1)
					if (
						rules.jong![currentThirdCharacter + nextFirstCharacter + nextSecondCharacter]
						!== undefined
					) {
						piece += rules.jong![currentThirdCharacter + nextFirstCharacter + nextSecondCharacter]
						processJaeum = false

						// No need to add hyphen here as it's already defined
					} else if (rules.jong![currentThirdCharacter + nextFirstCharacter] !== undefined) {
						// Changing sound with next jaeum
						piece += rules.jong![currentThirdCharacter + nextFirstCharacter]
						processJaeum = false

						// No need to add hyphen here as it's already defined
					} else {
						const jongReplacement = rules.jong![currentThirdCharacter]
						piece += (
							(jongReplacement === undefined) ? currentThirdCharacter
							: jongReplacement // Unchanging sound
						)

						// Add hyphen
						if (IsChoseong(nextFirstCharacter)) {
							piece += " "
						}
					}
				}
			}

			// Replace hyphen (if this is hangeul word)
			if (currentSegment.length > 1) {
				if ((syllableHyphenation === "") && (rules.hyphen !== undefined)) {
					piece = piece.replace(" ", (rules.hyphen as any))
				} else {
					// Soft hyphen
					piece = piece.replace(" ", syllableHyphenation)

					// Hard hyphen
					if (syllableHyphenation !== "") {
						piece = piece.replace("-", syllableHyphenation);
					}
				}
			}

			// Finally, add our piece
			composedRomanization += piece
		}

		currentSegment = nextSegment
	}

	// Finally, return our romanized text
	return composedRomanization
}