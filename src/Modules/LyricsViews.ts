// Packages
import { Maid } from "$spicetify-packages/Maid"
import { Signal } from "$spicetify-packages/Signal"

// Modules
import { GlobalMaid, HistoryLocation, SpotifyHistory, SpotifyPlaybar } from "../Services/Session"
import Player from "../Services/Player"

// Components
import CardView from "./LyricsViews/Components/CardView"
import PageView from "./LyricsViews/Components/PageView"
import { Song } from "../Services/Player/Song"

// CSS
import "../Stylings/Views.scss"

// Create our maid
const ViewMaid = GlobalMaid.Give(new Maid())

// Behavior Constants
const InsertCardAfterQuery = ".Root__right-sidebar .main-nowPlayingView-nowPlayingWidget"
const SpotifyCardViewQuery = ".Root__right-sidebar .main-nowPlayingView-section:not(:is(#BeautifulLyrics-CardView)):has(.main-nowPlayingView-lyricsTitle)"

// Lyrics Page Icon
const LyricsPageIconSVG = `
<svg class="Svg-sc-ytk21e-0 Svg-img-16-icon LyricsPageIcon" version="1.0" xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet">
	<g>
		<path d="M11.22 23.92 c0 -0.01 -0.02 -0.03 -0.05 -0.04 -0.03 -0.01 -0.07 -0.06 -0.09 -0.15 -0.03 -0.08 -0.06 -0.15 -0.07 -0.16 -0.01 -0.01 -0.03 -0.12 -0.05 -0.25 -0.02 -0.13 -0.04 -0.25 -0.06 -0.27 -0.01 -0.02 -0.02 -0.04 -0.01 -0.04 0.01 -0.01 0 -0.06 -0.02 -0.10 -0.02 -0.05 -0.05 -0.13 -0.06 -0.18 -0.01 -0.06 -0.03 -0.10 -0.04 -0.10 -0.01 0 -0.03 -0.05 -0.05 -0.11 -0.02 -0.06 -0.05 -0.11 -0.06 -0.11 -0.02 0 -0.02 -0.01 -0.01 -0.02 0.02 -0.02 0 -0.04 -0.16 -0.22 -0.06 -0.07 -0.15 -0.14 -0.19 -0.16 -0.04 -0.02 -0.08 -0.04 -0.08 -0.05 0 -0.01 -0.05 -0.03 -0.11 -0.05 -0.06 -0.02 -0.11 -0.04 -0.11 -0.05 0 -0.02 -0.16 -0.07 -0.29 -0.09 -0.06 -0.01 -0.10 -0.03 -0.10 -0.04 0 -0.01 -0.08 -0.03 -0.18 -0.05 -0.10 -0.02 -0.19 -0.04 -0.21 -0.06 -0.01 -0.01 -0.10 -0.04 -0.19 -0.07 -0.09 -0.03 -0.17 -0.06 -0.17 -0.06 0 -0.01 -0.04 -0.03 -0.09 -0.05 -0.05 -0.02 -0.12 -0.06 -0.17 -0.10 -0.08 -0.06 -0.08 -0.08 -0.08 -0.21 0 -0.12 0.01 -0.15 0.07 -0.19 0.04 -0.03 0.08 -0.06 0.08 -0.07 0.01 -0.01 0.10 -0.03 0.21 -0.05 0.11 -0.02 0.20 -0.04 0.21 -0.05 0.01 -0.01 0.18 -0.04 0.39 -0.07 0.21 -0.02 0.39 -0.05 0.39 -0.07 0.01 -0.01 0.06 -0.03 0.12 -0.04 0.17 -0.03 0.35 -0.19 0.45 -0.37 0.03 -0.06 0.06 -0.11 0.07 -0.11 0.02 -0.01 0.11 -0.19 0.10 -0.22 -0 -0.01 0.01 -0.02 0.02 -0.02 0.01 0 0.04 -0.06 0.06 -0.13 0.02 -0.07 0.04 -0.13 0.06 -0.13 0.01 0 0.03 -0.06 0.05 -0.12 0.02 -0.07 0.04 -0.14 0.06 -0.16 0.02 -0.02 0.02 -0.04 0.01 -0.06 -0.01 -0.01 -0.01 -0.03 0.01 -0.03 0.01 -0 0.04 -0.10 0.06 -0.22 0.02 -0.12 0.04 -0.22 0.05 -0.22 0.01 -0.01 0.03 -0.08 0.06 -0.16 0.06 -0.18 0.14 -0.27 0.25 -0.25 0.05 0.01 0.10 0.03 0.12 0.06 0.02 0.03 0.04 0.06 0.04 0.07 0.01 0.01 0.03 0.08 0.05 0.15 0.02 0.07 0.04 0.14 0.06 0.14 0.01 0 0.01 0.03 0 0.07 -0.01 0.04 0 0.07 0.02 0.07 0.02 0 0.04 0.08 0.06 0.18 0.02 0.10 0.04 0.18 0.06 0.18 0.01 0 0.02 0.02 0.02 0.06 0 0.07 0.08 0.35 0.11 0.37 0.01 0.01 0.04 0.06 0.06 0.11 0.02 0.05 0.06 0.13 0.09 0.17 0.06 0.09 0.42 0.46 0.45 0.46 0.01 0 0.06 0.03 0.11 0.07 0.05 0.04 0.13 0.07 0.18 0.08 0.05 0.01 0.09 0.02 0.09 0.03 0 0.03 0.34 0.11 0.44 0.11 0.04 0 0.08 0.01 0.08 0.03 0 0.02 0.03 0.03 0.07 0.03 0.11 0 0.40 0.06 0.40 0.08 0 0.01 0.05 0.03 0.11 0.05 0.19 0.06 0.22 0.25 0.08 0.39 -0.08 0.08 -0.31 0.20 -0.43 0.22 -0.05 0.01 -0.13 0.04 -0.19 0.07 -0.06 0.03 -0.17 0.06 -0.24 0.07 -0.08 0.01 -0.14 0.03 -0.14 0.04 0 0.01 -0.04 0.03 -0.10 0.04 -0.11 0.02 -0.28 0.07 -0.30 0.09 -0.01 0.01 -0.06 0.03 -0.12 0.05 -0.06 0.02 -0.11 0.04 -0.11 0.05 0 0.01 -0.05 0.03 -0.11 0.05 -0.12 0.04 -0.37 0.25 -0.33 0.28 0.03 0.02 0.04 0.11 0.02 0.11 -0.01 0 -0.03 0.04 -0.05 0.09 -0.02 0.05 -0.04 0.09 -0.06 0.09 -0.02 0 -0.02 0.01 -0.01 0.03 0.01 0.02 0.01 0.03 -0.01 0.03 -0.02 0 -0.04 0.08 -0.06 0.17 -0.02 0.09 -0.04 0.17 -0.05 0.17 -0.01 0 -0.03 0.11 -0.05 0.24 -0.02 0.13 -0.04 0.24 -0.06 0.24 -0.01 0 -0.02 0.03 -0.01 0.07 0.01 0.04 0.01 0.07 -0 0.07 -0.01 0 -0.03 0.05 -0.05 0.11 -0.04 0.14 -0.14 0.23 -0.24 0.23 -0.04 0 -0.08 -0.01 -0.08 -0.02z"/>
		<path d="M19.22 20.43 c0 -0.01 -0.03 -0.03 -0.06 -0.04 -0.07 -0.02 -0.23 -0.17 -0.23 -0.21 0 -0.02 -0.02 -0.05 -0.04 -0.07 -0.04 -0.04 -0.12 -0.40 -0.12 -0.54 0 -0.05 -0.01 -0.09 -0.03 -0.09 -0.02 0 -0.03 -0.09 -0.03 -0.20 0 -0.21 -0.04 -0.40 -0.08 -0.40 -0.01 0 -0.04 -0.04 -0.07 -0.10 -0.03 -0.06 -0.06 -0.11 -0.07 -0.12 -0.01 -0.01 -0.03 -0.16 -0.05 -0.33 -0.02 -0.17 -0.04 -0.32 -0.05 -0.34 -0.01 -0.01 -0.02 -0.04 -0.01 -0.06 0.01 -0.02 0 -0.04 -0.01 -0.04 -0.02 0 -0.04 -0.05 -0.06 -0.11 -0.02 -0.06 -0.04 -0.11 -0.06 -0.11 -0.01 0 -0.02 -0.02 -0.02 -0.04 0 -0.02 -0.03 -0.06 -0.06 -0.08 -0.03 -0.02 -0.05 -0.04 -0.03 -0.04 0.05 0 -0.24 -0.27 -0.40 -0.37 -0.09 -0.06 -0.17 -0.12 -0.17 -0.13 0 -0.01 -0.02 -0.02 -0.03 -0.02 -0.02 0 -0.10 -0.03 -0.18 -0.08 -0.08 -0.04 -0.19 -0.08 -0.24 -0.09 -0.04 -0.01 -0.10 -0.03 -0.12 -0.05 -0.02 -0.02 -0.11 -0.05 -0.21 -0.07 -0.10 -0.02 -0.19 -0.04 -0.21 -0.06 -0.01 -0.01 -0.14 -0.03 -0.28 -0.05 -0.14 -0.02 -0.27 -0.04 -0.30 -0.05 -0.03 -0.01 -0.13 -0.03 -0.22 -0.04 -0.24 -0.02 -0.50 -0.07 -0.50 -0.09 0 -0.01 -0.05 -0.03 -0.11 -0.05 -0.11 -0.03 -0.26 -0.13 -0.26 -0.18 0 -0.02 -0.02 -0.03 -0.04 -0.04 -0.06 -0.02 -0.10 -0.20 -0.08 -0.34 0.02 -0.13 0.14 -0.30 0.21 -0.30 0.02 0 0.05 -0.02 0.07 -0.04 0.03 -0.03 0.14 -0.05 0.38 -0.07 0.19 -0.01 0.34 -0.04 0.35 -0.05 0.01 -0.02 0.03 -0.03 0.07 -0.03 0.08 0 0.41 -0.08 0.50 -0.12 0.04 -0.02 0.12 -0.04 0.18 -0.05 0.05 -0.01 0.10 -0.03 0.10 -0.04 0 -0.01 0.07 -0.03 0.16 -0.05 0.09 -0.02 0.17 -0.05 0.19 -0.06 0.02 -0.02 0.08 -0.05 0.15 -0.07 0.07 -0.02 0.14 -0.05 0.17 -0.07 0.03 -0.02 0.10 -0.05 0.17 -0.07 0.06 -0.02 0.11 -0.04 0.11 -0.05 0 -0.01 0.05 -0.03 0.11 -0.05 0.06 -0.02 0.11 -0.05 0.12 -0.07 0.01 -0.02 0.05 -0.05 0.09 -0.06 0.04 -0.02 0.08 -0.05 0.08 -0.07 0 -0.02 0.01 -0.04 0.03 -0.04 0.01 0 0.04 -0.05 0.06 -0.11 0.02 -0.06 0.04 -0.13 0.06 -0.14 0.02 -0.02 0.04 -0.10 0.06 -0.18 0.02 -0.08 0.04 -0.15 0.06 -0.15 0.01 0 0.04 -0.06 0.05 -0.14 0.02 -0.08 0.04 -0.16 0.06 -0.17 0.02 -0.02 0.02 -0.05 0.01 -0.07 -0.01 -0.02 -0.01 -0.04 0.01 -0.04 0.01 0 0.04 -0.07 0.06 -0.16 0.02 -0.09 0.04 -0.16 0.05 -0.16 0.01 0 0.04 -0.11 0.07 -0.25 0.03 -0.14 0.06 -0.25 0.07 -0.25 0.01 0 0.03 -0.09 0.05 -0.19 0.02 -0.11 0.04 -0.21 0.06 -0.22 0.01 -0.02 0.02 -0.05 0.01 -0.07 -0.01 -0.02 -0 -0.04 0.01 -0.04 0.02 0 0.03 -0.03 0.03 -0.07 0 -0.10 0.05 -0.27 0.08 -0.27 0.02 0 0.03 -0.02 0.03 -0.04 0 -0.02 0.02 -0.07 0.05 -0.10 0.03 -0.04 0.04 -0.07 0.03 -0.08 -0.01 -0.01 -0 -0.02 0.01 -0.02 0.02 0 0.05 -0.02 0.08 -0.05 0.06 -0.07 0.26 -0.12 0.38 -0.10 0.10 0.02 0.20 0.07 0.20 0.10 0 0.01 0.02 0.04 0.05 0.07 0.03 0.03 0.06 0.09 0.07 0.14 0.01 0.05 0.03 0.09 0.04 0.09 0.01 0 0.02 0.08 0.02 0.18 0 0.21 0.07 0.79 0.10 0.83 0.01 0.02 0.03 0.12 0.05 0.22 0.02 0.10 0.04 0.19 0.05 0.19 0.01 0 0.03 0.07 0.05 0.17 0.02 0.09 0.06 0.21 0.08 0.27 0.03 0.06 0.06 0.14 0.07 0.19 0.01 0.04 0.03 0.08 0.04 0.08 0.02 0 0.02 0.01 0.01 0.02 -0.02 0.03 0.09 0.25 0.13 0.28 0.02 0.01 0.03 0.04 0.03 0.06 0 0.02 0.08 0.11 0.18 0.20 0.18 0.18 0.53 0.37 0.80 0.45 0.07 0.02 0.12 0.04 0.12 0.05 0 0.01 0.11 0.04 0.24 0.07 0.13 0.03 0.24 0.06 0.24 0.07 0 0.01 0.08 0.03 0.18 0.05 0.10 0.02 0.18 0.04 0.19 0.05 0.01 0.01 0.13 0.04 0.26 0.07 0.14 0.02 0.26 0.05 0.28 0.07 0.02 0.01 0.12 0.03 0.22 0.05 0.11 0.02 0.21 0.04 0.22 0.05 0.02 0.01 0.08 0.03 0.16 0.05 0.13 0.03 0.30 0.17 0.30 0.24 0 0.02 0.01 0.03 0.03 0.03 0.02 0 0.03 0.06 0.03 0.13 0 0.07 -0.01 0.13 -0.02 0.13 -0.01 0 -0.03 0.03 -0.04 0.06 -0.02 0.08 -0.18 0.24 -0.26 0.27 -0.03 0.01 -0.11 0.04 -0.17 0.07 -0.09 0.04 -0.22 0.06 -0.58 0.08 -0.25 0.02 -0.47 0.03 -0.48 0.04 -0.01 0.01 -0.10 0.03 -0.21 0.05 -0.11 0.02 -0.20 0.04 -0.21 0.06 -0.01 0.01 -0.09 0.04 -0.19 0.07 -0.10 0.03 -0.18 0.06 -0.18 0.06 0 0.01 -0.05 0.03 -0.12 0.05 -0.07 0.02 -0.12 0.04 -0.12 0.06 0 0.01 -0.06 0.04 -0.13 0.07 -0.07 0.03 -0.13 0.06 -0.13 0.07 0 0.01 -0.03 0.03 -0.06 0.04 -0.03 0.01 -0.10 0.05 -0.14 0.08 -0.04 0.03 -0.09 0.06 -0.11 0.06 -0.02 0 -0.04 0.02 -0.06 0.05 -0.02 0.03 -0.04 0.05 -0.06 0.05 -0.04 0 -0.16 0.13 -0.19 0.21 -0.01 0.03 -0.03 0.06 -0.04 0.06 -0.01 0 -0.03 0.04 -0.04 0.09 -0.01 0.04 -0.03 0.11 -0.06 0.14 -0.02 0.03 -0.03 0.07 -0.02 0.08 0.01 0.02 0.01 0.03 -0.01 0.03 -0.02 0 -0.03 0.04 -0.04 0.10 -0.01 0.05 -0.03 0.13 -0.05 0.18 -0.04 0.10 -0.12 0.40 -0.12 0.48 0 0.03 -0.01 0.06 -0.02 0.06 -0.01 0 -0.04 0.09 -0.06 0.21 -0.02 0.11 -0.04 0.22 -0.06 0.23 -0.01 0.02 -0.02 0.05 -0.01 0.07 0.01 0.02 0.01 0.04 -0.01 0.04 -0.02 0 -0.08 0.41 -0.08 0.56 0 0.05 -0.01 0.09 -0.02 0.09 -0.01 0 -0.03 0.06 -0.04 0.12 -0.01 0.07 -0.04 0.14 -0.06 0.17 -0.02 0.03 -0.03 0.05 -0.02 0.05 0.01 0 -0.02 0.02 -0.06 0.05 -0.05 0.03 -0.10 0.05 -0.12 0.05 -0.02 0 -0.04 0.01 -0.04 0.03 0 0.02 -0.06 0.03 -0.13 0.03 -0.07 0 -0.13 -0.01 -0.13 -0.02z"/>
		<path d="M5.69 18.57 c-1.37 -0.14 -2.43 -1.12 -2.66 -2.44 -0.06 -0.35 -0.04 -0.89 0.05 -1.24 0.08 -0.30 0.27 -0.72 0.45 -0.96 0.07 -0.09 1.61 -1.86 3.43 -3.93 l3.30 -3.76 0.04 -0.28 c0.23 -1.39 1.14 -2.63 2.42 -3.29 0.35 -0.18 0.88 -0.37 1.27 -0.44 0.37 -0.07 1.29 -0.07 1.63 -0 0.73 0.14 1.37 0.42 1.93 0.85 2.02 1.52 2.43 4.38 0.90 6.41 -0.67 0.89 -1.69 1.52 -2.76 1.72 -0.16 0.03 -0.31 0.06 -0.34 0.07 -0.03 0.01 -1.75 1.50 -3.82 3.33 -2.07 1.82 -3.82 3.35 -3.89 3.40 -0.29 0.22 -0.72 0.40 -1.10 0.49 -0.23 0.05 -0.67 0.08 -0.85 0.06z m0.56 -1.60 c0.17 -0.04 0.36 -0.13 0.49 -0.23 0.04 -0.03 1.66 -1.45 3.60 -3.15 l3.51 -3.09 -1.39 -1.39 c-0.76 -0.76 -1.40 -1.39 -1.41 -1.39 -0.01 0 -1.17 1.31 -2.58 2.91 -3.75 4.27 -3.70 4.21 -3.76 4.32 -0.29 0.57 -0.20 1.21 0.23 1.63 0.35 0.34 0.83 0.48 1.30 0.37z m9.21 -7.28 c0.49 -0.09 1.08 -0.41 1.47 -0.80 1.06 -1.05 1.19 -2.74 0.32 -3.92 -0.17 -0.22 -0.52 -0.57 -0.73 -0.71 -1.52 -1.03 -3.60 -0.48 -4.40 1.16 -0.13 0.27 -0.26 0.67 -0.26 0.80 0 0.06 0.31 0.38 1.71 1.78 1.09 1.09 1.73 1.71 1.76 1.71 0.02 -0.01 0.08 -0.02 0.13 -0.03z"/>
		<path d="M3.83 8.12 c-0.09 -0.08 -0.19 -0.29 -0.23 -0.52 -0.02 -0.10 -0.04 -0.19 -0.05 -0.19 -0.01 0 -0.01 -0.04 -0.01 -0.09 0.01 -0.05 0 -0.10 -0.01 -0.11 -0.01 -0.01 -0.04 -0.13 -0.06 -0.28 -0.02 -0.14 -0.04 -0.27 -0.06 -0.28 -0.01 -0.01 -0.02 -0.04 -0.01 -0.06 0.01 -0.02 0 -0.05 -0.01 -0.07 -0.01 -0.02 -0.03 -0.08 -0.04 -0.14 -0.01 -0.06 -0.03 -0.13 -0.05 -0.14 -0.02 -0.02 -0.05 -0.07 -0.07 -0.12 -0.02 -0.05 -0.05 -0.10 -0.07 -0.11 -0.02 -0.01 -0.03 -0.03 -0.03 -0.05 0 -0.02 -0.05 -0.08 -0.11 -0.13 -0.06 -0.06 -0.13 -0.12 -0.15 -0.14 -0.02 -0.02 -0.08 -0.05 -0.14 -0.07 -0.06 -0.02 -0.10 -0.04 -0.10 -0.05 0 -0.01 -0.05 -0.03 -0.11 -0.05 -0.06 -0.02 -0.15 -0.05 -0.19 -0.07 -0.04 -0.02 -0.15 -0.05 -0.24 -0.07 -0.09 -0.02 -0.16 -0.04 -0.17 -0.05 -0.01 -0.01 -0.09 -0.03 -0.20 -0.05 -0.10 -0.02 -0.20 -0.04 -0.21 -0.06 -0.02 -0.01 -0.11 -0.03 -0.21 -0.05 -0.10 -0.02 -0.23 -0.05 -0.29 -0.08 -0.06 -0.03 -0.14 -0.06 -0.19 -0.07 -0.12 -0.02 -0.27 -0.17 -0.27 -0.26 0 -0.04 -0.02 -0.07 -0.03 -0.08 -0.03 -0.01 -0.03 -0.02 0 -0.02 0.02 -0 0.03 -0.02 0.03 -0.05 0 -0.08 0.08 -0.22 0.12 -0.22 0.02 0 0.04 -0.01 0.04 -0.02 0 -0.03 0.16 -0.08 0.31 -0.10 0.07 -0.01 0.13 -0.02 0.13 -0.03 0 -0.01 0.12 -0.04 0.28 -0.07 0.15 -0.03 0.28 -0.06 0.28 -0.06 0 -0.01 0.11 -0.03 0.24 -0.05 0.13 -0.02 0.24 -0.04 0.24 -0.05 0 -0.01 0.09 -0.03 0.20 -0.05 0.19 -0.03 0.26 -0.05 0.40 -0.14 0.07 -0.04 0.29 -0.25 0.29 -0.28 0 -0.01 0.02 -0.05 0.05 -0.09 0.03 -0.04 0.04 -0.08 0.03 -0.09 -0.01 -0.01 -0 -0.02 0.01 -0.02 0.02 0 0.04 -0.05 0.06 -0.11 0.02 -0.06 0.05 -0.13 0.07 -0.14 0.02 -0.02 0.03 -0.07 0.03 -0.11 0 -0.04 0.02 -0.11 0.04 -0.15 0.02 -0.04 0.04 -0.09 0.04 -0.11 -0 -0.02 0 -0.05 0.01 -0.07 0.02 -0.06 0.07 -0.38 0.07 -0.47 0 -0.05 0.01 -0.08 0.03 -0.08 0.02 0 0.03 -0.04 0.02 -0.11 -0.01 -0.06 -0 -0.11 0.01 -0.11 0.01 0 0.03 -0.09 0.05 -0.20 0.02 -0.11 0.04 -0.20 0.05 -0.20 0.01 0 0.03 -0.04 0.05 -0.10 0.04 -0.10 0.16 -0.24 0.21 -0.24 0.02 0 0.03 -0.01 0.03 -0.03 0 -0.04 0.18 -0.03 0.23 0.01 0.12 0.10 0.20 0.18 0.18 0.18 -0.01 0 0 0.03 0.02 0.06 0.02 0.03 0.05 0.10 0.06 0.16 0.01 0.05 0.03 0.10 0.04 0.10 0.01 0 0.02 0.02 0.01 0.04 -0.01 0.02 -0.01 0.06 0.01 0.07 0.02 0.02 0.04 0.14 0.06 0.26 0.02 0.13 0.04 0.23 0.05 0.23 0.01 0 0.03 0.11 0.05 0.24 0.02 0.13 0.04 0.24 0.05 0.24 0.01 0 0.02 0.03 0.01 0.07 -0.01 0.04 0 0.07 0.02 0.07 0.02 0 0.03 0.05 0.04 0.11 0.01 0.06 0.03 0.12 0.05 0.14 0.02 0.02 0.05 0.08 0.08 0.14 0.05 0.13 0.06 0.14 0.24 0.34 0.07 0.08 0.14 0.14 0.16 0.14 0.02 0 0.04 0.02 0.06 0.03 0.03 0.04 0.29 0.17 0.43 0.21 0.07 0.02 0.13 0.04 0.14 0.05 0.02 0.01 0.11 0.03 0.21 0.05 0.10 0.02 0.21 0.04 0.24 0.06 0.03 0.01 0.18 0.04 0.33 0.07 0.15 0.02 0.29 0.05 0.30 0.06 0.02 0.01 0.08 0.04 0.15 0.05 0.13 0.04 0.27 0.14 0.29 0.23 0.01 0.03 0.03 0.06 0.04 0.06 0.01 0 0.02 0.08 0.02 0.17 0 0.10 -0.01 0.17 -0.03 0.17 -0.01 0 -0.03 0.02 -0.03 0.04 0 0.02 -0.03 0.06 -0.07 0.07 -0.04 0.02 -0.08 0.04 -0.09 0.05 -0.01 0.01 -0.11 0.04 -0.24 0.06 -0.12 0.03 -0.23 0.06 -0.25 0.07 -0.01 0.01 -0.13 0.03 -0.26 0.05 -0.13 0.02 -0.24 0.04 -0.25 0.05 -0.01 0.01 -0.11 0.03 -0.22 0.05 -0.12 0.02 -0.24 0.05 -0.29 0.07 -0.04 0.02 -0.13 0.05 -0.18 0.07 -0.06 0.02 -0.11 0.04 -0.12 0.05 -0.01 0.01 -0.04 0.03 -0.08 0.06 -0.10 0.06 -0.34 0.29 -0.39 0.38 -0.02 0.04 -0.05 0.09 -0.07 0.11 -0.02 0.02 -0.05 0.08 -0.07 0.15 -0.02 0.07 -0.04 0.12 -0.05 0.12 -0.01 0 -0.03 0.07 -0.05 0.16 -0.02 0.09 -0.04 0.16 -0.06 0.16 -0.01 0 -0.02 0.03 -0.01 0.07 0.01 0.04 0.01 0.07 -0.01 0.07 -0.01 0 -0.03 0.09 -0.05 0.21 -0.02 0.11 -0.04 0.22 -0.05 0.23 -0.01 0.02 -0.03 0.11 -0.05 0.21 -0.02 0.10 -0.04 0.20 -0.06 0.22 -0.02 0.02 -0.02 0.05 -0.01 0.07 0.01 0.02 0 0.04 -0.01 0.04 -0.01 0 -0.03 0.05 -0.04 0.11 -0.01 0.06 -0.05 0.14 -0.10 0.20 -0.08 0.08 -0.09 0.09 -0.26 0.09 -0.14 0 -0.19 -0.01 -0.25 -0.06z"/>
	</g>
</svg>`.trim()

// Fullscreen Icons
const FullscreenOpenIconSVG = `
<svg role="img" height="16" width="16" aria-hidden="true" viewBox="0 0 16 16" data-encore-id="icon" class="Svg-sc-ytk21e-0 Svg-img-16-icon">
	<path d="M6.53 9.47a.75.75 0 0 1 0 1.06l-2.72 2.72h1.018a.75.75 0 0 1 0 1.5H1.25v-3.579a.75.75 0 0 1 1.5 0v1.018l2.72-2.72a.75.75 0 0 1 1.06 0zm2.94-2.94a.75.75 0 0 1 0-1.06l2.72-2.72h-1.018a.75.75 0 1 1 0-1.5h3.578v3.579a.75.75 0 0 1-1.5 0V3.81l-2.72 2.72a.75.75 0 0 1-1.06 0z">
	</path>
</svg>`.trim()
const FullscreenCloseIconSVG = `
<svg role="img" height="24" width="24" aria-hidden="true" viewBox="0 0 24 24" data-encore-id="icon" class="Svg-sc-ytk21e-0 Svg-img-24-icon">
	<path d="M21.707 2.293a1 1 0 0 1 0 1.414L17.414 8h1.829a1 1 0 0 1 0 2H14V4.757a1 1 0 1 1 2 0v1.829l4.293-4.293a1 1 0 0 1 1.414 0zM2.293 21.707a1 1 0 0 1 0-1.414L6.586 16H4.757a1 1 0 0 1 0-2H10v5.243a1 1 0 0 1-2 0v-1.829l-4.293 4.293a1 1 0 0 1-1.414 0z">
	</path>
</svg>
`.trim()

// Main method
export default () => {
	// Also store our potential page-view
	let ActivePageView: (PageView | undefined)

	// Create our playbar icons
	const lyricsButton = new SpotifyPlaybar.Button(
		"Lyrics Page",
		LyricsPageIconSVG,
		() => {
			if (ActivePageView === undefined) {
				return SpotifyHistory.push("/BeautifulLyrics/Main")
			}

			ActivePageView.Close()
		},
		false,
		false
	)
	ViewMaid.Give(() => lyricsButton.deregister())

	let clickedFullscreenButton = false
	const fullscreenButton = new SpotifyPlaybar.Button(
		"Enter Fullscreen",
		FullscreenOpenIconSVG,
		() => {
			// Handle whether or not we are opening/closing
			if ((ActivePageView === undefined) || !ActivePageView.IsFullscreen()) {
				clickedFullscreenButton = true
				SpotifyHistory.push("/BeautifulLyrics/Fullscreen")
			} else {
				ActivePageView.Close()
			}
		},
		false,
		false
	)
	ViewMaid.Give(() => fullscreenButton.deregister())

	// Mark our fullscreen-button and force it to the right
	fullscreenButton.element.style.order = "100000"
	fullscreenButton.element.id = "BeautifulLyricsFullscreenButton"

	// Store our potential fullscreen-button for later
	const SetFullscreenState = (isFullscreen: boolean) => {
		if (isFullscreen) {
			document.body.requestFullscreen()
		} else {
			document.exitFullscreen()
		}

		if (fullscreenButton === undefined) {
			return
		}

		if (isFullscreen) {
			fullscreenButton.label = "Exit Fullscreen"
			fullscreenButton.icon = FullscreenCloseIconSVG
		} else {
			fullscreenButton.label = "Enter Fullscreen"
			fullscreenButton.icon = FullscreenOpenIconSVG
		}
	}

	// Handle our right-sidebar
	let InsertCardAfter: (HTMLDivElement | undefined)
	const InsertCardAfterChanged = new Signal<() => void>()
	const DetectSideBarChanges = () => {
		// Grab our elements
		const insertAfter = (document.querySelector<HTMLDivElement>(InsertCardAfterQuery) || undefined) 
		const spotifyCardView = (document.querySelector<HTMLDivElement>(SpotifyCardViewQuery) || undefined)

		// Determine if we changed our insert-after element
		if (insertAfter !== InsertCardAfter) {
			InsertCardAfter = insertAfter
			InsertCardAfterChanged.Fire()
		}

		// If we have a spotify card-view we need to hide it
		if (spotifyCardView !== undefined) {
			spotifyCardView.style.display = "none"
		}
	}

	// Handle our card-view
	const ShouldHandleCardView = (
		() => {
			const HandleCardView = (song: Song) => {
				// Now grab our details
				song.GetDetails()
				.then(
					details => {
						// No details means no lyrics
						if (details === undefined) {
							return
						}
	
						// No lyrics means no lyrics! (DUH!)
						if (details.Lyrics === undefined) {
							return
						}
	
						// Make sure we have something to insert after
						if (InsertCardAfter === undefined) {
							return
						}
	
						// If we already have it don't do anything
						if (ViewMaid.Has("CardView")) {
							return
						}
	
						// Now create our card-view
						ViewMaid.Give(
							new CardView(song, details.Lyrics, InsertCardAfter),
							"CardView"
						)
					}
				)
			}
	
			const ShouldHandleCardView = () => {
				// First make sure that we aren't in any other view
				if (SpotifyHistory.location.pathname.startsWith("/BeautifulLyrics")) {
					ViewMaid.Clean("CardView")
					return
				}
	
				// Now check if we have a song
				const song = Player.GetSong()
				if (song === undefined) {
					return
				}
	
				// Now handle our card-view
				HandleCardView(song)
			}

			InsertCardAfterChanged.Connect(ShouldHandleCardView)

			return ShouldHandleCardView
		}
	)()

	// Handle our page-view
	const HandlePageView = () => {
		// If we don't have a page-view don't do anything
		if (ActivePageView === undefined) {
			return
		}

		// Set our song
		ActivePageView.SetSong(Player.GetSong())
	}

	// Now handle songs changing
	{
		// Handle our current-song
		const HandleSong = (song?: Song) => {
			// Immediately remove our card-view
			ViewMaid.Clean("CardView")

			// Now handle our card-view
			ShouldHandleCardView()

			// Now handle our page-view
			HandlePageView()
		}

		// Handle our song changing
		Player.SongChanged.Connect(HandleSong)

		// Immediately handle our current-song
		HandleSong(Player.GetSong())
	}

	// Handle our Spotify Page Location changing
	let mainPage: HTMLDivElement
	const HandleSpotifyLocation = (location: HistoryLocation) => {
		// Handle our card-view immediately
		ShouldHandleCardView()

		// Remove our previous page-view
		ViewMaid.Clean("PageView")

		// Now handle our page-view
		const isMainView = (location.pathname === "/BeautifulLyrics/Main")
		const isCinemaView = (location.pathname === "/BeautifulLyrics/Cinema")
		const isFullscreenView = (location.pathname === "/BeautifulLyrics/Fullscreen")

		if (isMainView || isCinemaView || isFullscreenView) {
			if (isFullscreenView && !clickedFullscreenButton) {
				return SpotifyHistory.push("/BeautifulLyrics/Cinema")
			}

			lyricsButton.active = true
			ActivePageView = ViewMaid.Give(
				new PageView(mainPage, isCinemaView, isFullscreenView),
				"PageView"
			)
			HandlePageView()

			if (isFullscreenView) {
				SetFullscreenState(true)
			}
		} else {
			if ((ActivePageView !== undefined) && (ActivePageView.IsFullscreen())) {
				SetFullscreenState(false)
			}

			lyricsButton.active = false
			ActivePageView = undefined
		}
	}

	// Handle DOM tracking
	{
		// Create our observer
		const Check = () => {
			DetectSideBarChanges()

			// Determine if we have our main-page yet
			if (mainPage === undefined) {
				const potentialMainPage = document.querySelector<HTMLDivElement>(".main-view-container .os-content")

				if (potentialMainPage !== null) {
					mainPage = potentialMainPage
					ViewMaid.Give(SpotifyHistory.listen(HandleSpotifyLocation))
					HandleSpotifyLocation(SpotifyHistory.location)
				}
			}

			// Determine if we have our fullscreen button yet
			const controlsContainer = document.querySelector<HTMLButtonElement>(".main-nowPlayingBar-extraControls")
			if (controlsContainer !== null) {
				for (const element of controlsContainer.children) {
					if (
						(
							element.innerHTML.includes("0v1.018l2.72-2.72a.75.75 0 0 1 1.06 0zm2.94-2.94a.75.75")
							|| element.innerHTML.includes("2H14V4.757a1 1 0 1 1 2 0v1.829l4.293-4.293a1")
						)
						&& (element.id !== "BeautifulLyricsFullscreenButton")
					) {
						element.remove()
					}
				}
			}
		}

		const observer = ViewMaid.Give(new MutationObserver(Check))

		// Start observing
		observer.observe(document.body, { childList: true, subtree: true })
		Check()

		// Finally, handle our fullscreen-check
		if ((ActivePageView !== undefined) && ActivePageView.IsFullscreen()) {
			SetFullscreenState(true)
		}
	}
}