// Packages
import {Maid} from '../../../Packages/Maid'

// Store our Spicetify-Classes
const SpotifyPlayer = Spicetify.Player

// Create our Global-Maid (this is used so we can clean-up everything prior to updating)
const GlobalMaid = new Maid()

// Exports
export {GlobalMaid, SpotifyPlayer}