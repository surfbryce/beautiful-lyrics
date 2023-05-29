// Packages
import {Maid} from '../../../Packages/Maid'

// Store our current-script/style
const Script = (document.currentScript as HTMLScriptElement)
const IsDevelopment = (Script.src.includes("https://xpui.app.spotify.com/"))

// Store our Spicetify-Classes
const SpotifyPlayer = Spicetify.Player
const SpotifyFetch = Spicetify.CosmosAsync

// Create our Global-Maid (this is used so we can clean-up everything prior to updating)
const GlobalMaid = new Maid()

// Exports
export {GlobalMaid, SpotifyPlayer, SpotifyFetch, Script, IsDevelopment}