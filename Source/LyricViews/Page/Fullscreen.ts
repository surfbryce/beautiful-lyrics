// Styles
import "./style.scss"

// NPM Packages
import {
	bindKey, unbindKey,
	type KeyEvent, type BrowserKeyEventProps
} from "npm:@rwh/keystrokes"

// Web-Modules
import { Maid, Giveable } from "jsr:@socali/modules/Maid"
import Spring from "jsr:@socali/modules/Spring"
import { Timeout, OnPreRender, Defer } from "jsr:@socali/modules/Scheduler"
import { Signal } from "jsr:@socali/modules/Signal"

// Spices
import type PlaylistMetadata from "jsr:@socali/spices/Spicetify/Types/App/PlaylistMetadata"
import type PlaylistItemMetadata from "jsr:@socali/spices/Spicetify/Types/App/PlaylistItemMetadata"
import {
	Spotify,
	SpotifyHistory, SpotifyPlayer
} from "@socali/Spices/Session"
import {
	IsPlaying, IsPlayingChanged, SetIsPlaying,
	Timestamp, TimeStepped, SeekTo, GetTimestampString,
	IsShuffling, IsShufflingChanged, SetIsShuffling,
	LoopMode, LoopModeChanged, SetLoopMode,

	Song, SongChanged, GetDurationString,
	IsLiked, IsLikedChanged, SetIsLiked,

	SongDetails, SongDetailsLoaded, HaveSongDetailsLoaded,
  SongContext
} from "@socali/Spices/Player"
import {
	GetPlaylistsAndFolders,
	GetPlaylistDetails, GetPlaylistContents,
	AddToPlaylist, RemoveFromPlaylist,

	CreateFolder, CreatePlaylist
} from "jsr:@socali/spices/Spicetify/Services/Library"

// Components
import TextScroller from "../../Components/TextScroller/mod.ts"
import Slider from "../../Components/Slider.ts"
import Button from "../../Components/Button.ts"

// Our Modules
import { CreateLyricsRenderer, SetupRomanizationButton } from "./Shared.ts"
import { CreateElement, GetCoverArtForSong, ApplyDynamicBackground } from "../Shared.ts"
import LyricViewIcons from "../Icons.ts"
import Icons from "./Icons.ts"
import { RunAnimation } from "./Animator.ts"
import { AnimationState, AnimationStates } from "./Animations/AnimationStateType.ts"
import { TargetPropertyValues, AnimationMetadata } from "./Animations/Heart/Shared.ts"
import { LikedAnimationState } from "./Animations/Heart/Liked.ts"
import { NotLikedAnimationState } from "./Animations/Heart/NotLiked.ts"
import { AddedAnimation } from "./Animations/PlaylistStatus/Added.ts"
import { RemovedAnimation } from "./Animations/PlaylistStatus/Removed.ts"

// Templates
// <button id="ToggleDetails" class="ViewControl"></button> // Future support
const FolderGridItemTemplate = `
	<div class="GridItem Folder">
		<div class="Cover">${Icons.CreateFolder}</div>
		<div class="Name"><span></span></div>
	</div>
`
const PlaylistGridItemTemplate = `
	<div class="GridItem Playlist">
		<div class="Cover">
			${Icons.AddedToPlaylist}
			<img>
		</div>
		<div class="Details">
			<div class="Name"><span></span></div>
			<div class="Collaborators"><span></span></div>
		</div>
	</div>
`
const LibraryPathBranchTemplate = `
	<div class="Branch Library">
		${Icons.Library}
		<div class="Name"><span>Library</span></div>
	</div>
`
const FolderPathBranchTemplate = `
	<div class="Branch">
		<span class="Divider">/</span>
		${Icons.CreateFolder}
		<div class="Name"><span></span></div>
	</div>
`
const Container = `
	<div class="BeautifulLyricsPage Fullscreen">
		<div class="Content">
			<div class="PlayPanelMouseArea"></div>
			<div class="PlayPanel">
				<div class="MediaSpace">
					<div class="AddToPlaylistCover">
						<div class="Header">
							<div class="Action Close">${Icons.CloseView}</div>
							<div class="Action AddFolder">${Icons.CreateFolder}</div>
							<div class="Action AddPlaylist">${Icons.CreatePlaylist}</div>
							<div class="Divider"></div>
							<div class="Path"><div class="SizeMeasurement"></div></div>
						</div>
						<input type="text" placeholder="__WAITING__" maxlength="0">
						<div class="Grid"></div>
					</div>
					<div class="ViewControls">
						<button id="AddToPlaylist" class="ViewControl">${Icons.AddToPlaylist}</button>
						<button id="Romanize" class="ViewControl"></button>
						<button id="SmallerView" class="ViewControl"></button>
						<button id="Fullscreen" class="ViewControl">${LyricViewIcons.FullscreenOpen}</button>
						<button id="Close" class="ViewControl">${Icons.CloseView}</button>
					</div>
					<div class="LikeState">
						<div class="Hitbox">
							${Icons.LoadingBrokenHeart}
							${Icons.HeartOutline}
							${Icons.BrokenHeart}
						</div>
					</div>
					<div class="PlaybackControls">
						${Icons.Shuffle}
						${Icons.LastTrack}
						<div class="PlaybackControl TogglePlayState"></div>
						${Icons.NextTrack}
						<div class="PlaybackControl ToggleLoopState"></div>
					</div>
					<div class="VolumeControl">
						${Icons.VolumeLevels}
						<div class="SliderBar">
							<div class="Hitbox"></div>
							<div class="Handle"></div>
						</div>
					</div>
					<img class="CoverArt" src="">
				</div>
				<div class="Timeline">
					<span class="Position"></span>
					<div class="SliderBar">
						<div class="Hitbox"></div>
						<div class="Handle"></div>
					</div>
					<span class="Length"></span>
				</div>
				<div class="DetailSpace TrackDetails">
					<div class="DetailsShelf Title"><span></span></div>
					<div class="DetailsShelf Release">
						<span class="Date"></span>
						<div class="Separator"></div>
						<div class="Artists"><span></span></div>
					</div>
				</div>
			</div>
		</div>
	</div>
`

// Will use later with future support for collapsed view
/*const HideDetailsSVGIcon = `
	<svg role="img" data-encore-id="icon" class="Svg-sc-ytk21e-0 Svg-img-16-icon" xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 666.67 613.81">
		<path d="m73.57,0l216.65,216.65c13.05-6.25,27.68-9.75,43.11-9.75,55.23,0,100,44.77,100,100,0,15.44-3.5,30.06-9.75,43.12l216.65,216.65-47.14,47.14-92.51-92.51c-45.51,30.78-101.01,52.28-167.25,52.28C100,573.57,0,306.9,0,306.9c0,0,35.72-95.26,114.28-171.91L26.43,47.14,73.57,0Zm88.05,182.34c-44.89,43.47-74.18,95.16-88.64,124.58,28.16,57.33,113.06,199.99,260.34,199.99,45.48,0,85.01-13.6,118.76-34.1l-75.65-75.65c-13.05,6.25-27.68,9.75-43.11,9.75-55.23,0-100-44.77-100-100,0-15.44,3.5-30.06,9.75-43.11l-81.45-81.45ZM333.33,40.24c233.33,0,333.33,266.67,333.33,266.67,0,0-22.25,59.33-70.24,122.02l-47.75-47.76c20.99-28.51,35.92-55.78,45-74.27-28.16-57.33-113.06-199.99-260.35-199.99-18.5,0-36.01,2.25-52.55,6.3l-53.19-53.2c31.64-12.35,66.84-19.76,105.74-19.76Z"/>
	</svg>
`.trim()
const ShowDetailsSVGIcon = `
	<svg role="img" data-encore-id="icon" class="Svg-sc-ytk21e-0 Svg-img-16-icon" xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 666.68 533.33">
		<path d="m2.07,278.2c57.03,155.13,187.1,255.13,331.27,255.13s274.23-100,331.27-255.13c2.77-7.44,2.77-15.63,0-23.07C607.57,100,477.51,0,333.34,0S59.11,100,2.07,255.13c-2.77,7.44-2.77,15.63,0,23.07ZM333.34,66.67c112.43,0,215.03,78.1,264.3,200-49.27,121.9-151.87,200-264.3,200s-215.03-78.1-264.3-200c49.27-121.9,151.87-200,264.3-200Zm0,333.33c73.64,0,133.33-59.7,133.33-133.33s-59.7-133.33-133.33-133.33-133.33,59.7-133.33,133.33,59.7,133.33,133.33,133.33Zm0-200c36.82,0,66.67,29.85,66.67,66.67s-29.85,66.67-66.67,66.67-66.67-29.85-66.67-66.67,29.85-66.67,66.67-66.67Z"/>
	</svg>
`.trim()*/

// Controls Display Configuration
const AddToPlaylistFadeInSpeed = 5
const AddToPlaylistFadeOutSpeed = 7.5
const ControlsFadeInSpeed = 2
const ControlsFadeOutSpeed = 1.1
const ControlsAutoHideAfter = 0.75

// Like Animation Configuration
const LikeStateUpdateShimmerAppearsAfter = 0.5 // Determines how long we should wait before showing the waiting shimmer

// Volume Slider Configuration
const MinimumVolume = 0.15
const VolumeLevelPoints = [(MinimumVolume + 0.02), 0.4, 0.725]

// Link Helpers
const OpenSpotifyPage = (mouseEvent: MouseEvent) => {
	SpotifyHistory.push(new URL((mouseEvent.target as HTMLLinkElement).href).pathname)
	mouseEvent.preventDefault()
}

// Store where we last were before a Page opened
let LastPageLocation: (string | undefined)

// Class
export default class PageView implements Giveable {
	// Private Properties
	private readonly Maid = new Maid()

	// Public Properties
	public readonly Closed = this.Maid.Destroyed

	// Constructor
	constructor(makeSpotifyFullscreen?: true) {
		// Determine our last-page
		const lastPage = SpotifyHistory.entries[SpotifyHistory.entries.length - 2]
		if ((lastPage !== undefined) && (lastPage.pathname.startsWith("/BeautifulLyrics") === false)) {
			LastPageLocation = lastPage.pathname
		}

		// Create our container
		const container = this.Maid.Give(CreateElement<HTMLDivElement>(Container))

		// Apply our dynamic background
		ApplyDynamicBackground(container, this.Maid)

		// Handle lyric-rendering changes
		const content = container.querySelector<HTMLDivElement>(".Content")!
		const UpdateLyricsRenderer = CreateLyricsRenderer(content, this.Maid)

		// Handle our play-panel
		{
			// Grab our container-references
			const playPanel = content.querySelector<HTMLDivElement>(".PlayPanel")!
			const mediaSpace = playPanel.querySelector<HTMLDivElement>(".MediaSpace")!
			const timeline = playPanel.querySelector<HTMLDivElement>(".Timeline")!
			const trackDetailsSpace = playPanel.querySelector<HTMLDivElement>(".TrackDetails")!

			// Media-Space References
			const coverArt = mediaSpace.querySelector<HTMLImageElement>(".CoverArt")!
			const addToPlaylistCover = mediaSpace.querySelector<HTMLDivElement>(".AddToPlaylistCover")!
			const viewControls = mediaSpace.querySelector<HTMLDivElement>(".ViewControls")!
			const likeStateContainer = mediaSpace.querySelector<HTMLDivElement>(".LikeState .Hitbox")!
			const playbackControls = mediaSpace.querySelector<HTMLDivElement>(".PlaybackControls")!

			// Timeline References
			const timelineTimestamp = timeline.querySelector<HTMLSpanElement>(".Position")!
			const timelineBar = timeline.querySelector<HTMLDivElement>(".SliderBar")!
			const timelineLength = timeline.querySelector<HTMLSpanElement>(".Length")!

			// Volume References
			const volumeControl = mediaSpace.querySelector<HTMLDivElement>(".VolumeControl")!
			const volumeBar = volumeControl.querySelector<HTMLDivElement>(".SliderBar")!
			const volumeLevels = volumeControl.querySelectorAll<HTMLDivElement>(".VolumeLevels .Level")!

			// Track Details References
			const trackTitleContainer = trackDetailsSpace.querySelector<HTMLDivElement>(".Title")!
			const trackTitle = trackTitleContainer.querySelector<HTMLSpanElement>("span")!
			const trackReleaseDate = trackDetailsSpace.querySelector<HTMLSpanElement>(".Date")!
			const trackReleaseDetailsSeparator = trackDetailsSpace.querySelector<HTMLDivElement>(".Separator")!
			const trackArtistsContainer = trackDetailsSpace.querySelector<HTMLDivElement>(".Artists")!
			const trackArtists = trackArtistsContainer.querySelector<HTMLSpanElement>("span")!

			// Initiate our text-scrolling functionality for our labels
			this.Maid.Give(new TextScroller(trackTitleContainer, playPanel, true))
			this.Maid.Give(new TextScroller(trackArtistsContainer, playPanel))

			// Handle our add-to-playlist cover
			let SetAddToPlaylistCoverOpenState: (open: boolean) => void
			{
				// Store our playlist-open state
				let isAddToPlaylistCoverOpen = false

				// Grab our references
				const header = addToPlaylistCover.querySelector<HTMLDivElement>(".Header")!
				const closeElement = header.querySelector<HTMLDivElement>(".Close")!
				const addFolderElement = header.querySelector<HTMLDivElement>(".AddFolder")!
				const addPlaylistElement = header.querySelector<HTMLDivElement>(".AddPlaylist")!
				const pathContainer = header.querySelector<HTMLDivElement>(".Path")!
				const pathBranchContainer = pathContainer.querySelector<HTMLDivElement>(".SizeMeasurement")!
				const input = addToPlaylistCover.querySelector<HTMLInputElement>("input")!
				const grid = addToPlaylistCover.querySelector<HTMLDivElement>(".Grid")!

				// State management
				const pathChangeRequested = this.Maid.Give(new Signal<(folder: LibraryFolder) => void>())

				// Grid Functionality
				type LibraryPlaylist = {
					Type: "Playlist",
					Uri: string,
					LoadedDetails: Promise<PlaylistMetadata>
				}
				type LibraryFolder = {
					Type: "Folder",
					Uri: string,
					Name: string,
					Items?: Promise<(LibraryFolder | LibraryPlaylist)[]>
				}
				const library: LibraryFolder = {
					Type: "Folder",
					Uri: "",
					Name: "Library"
				}
				const LoadFolderItems = (folder: LibraryFolder, textFilter?: string, forceNewData?: true) => {
					// Ignore if we've already loaded our items before
					if ((textFilter === undefined) && (folder.Items !== undefined) && (forceNewData === undefined)) {
						return folder.Items
					}

					// Load our items
					const itemsPromise = (
						GetPlaylistsAndFolders("Recents", folder.Uri, textFilter)
						.then(
							(items) => {
								const processedItems: (LibraryFolder | LibraryPlaylist)[] = []
								for (const item of items) {
									if (item.Type === "Folder") {
										processedItems.push(
											{
												Type: "Folder",
												Uri: item.Uri,
												Name: item.Name
											}
										)
									} else if (item.CanAddTo) {
										processedItems.push(
											{
												Type: "Playlist",
												Uri: item.Uri,
												LoadedDetails: GetPlaylistDetails(item.Uri)
											}
										)
									}
								}
								return processedItems
							}
						)
					)

					if (textFilter === undefined) {
						folder.Items = itemsPromise
					}

					return itemsPromise
				}
				const renderMaid = this.Maid.Give(new Maid())
				let currentRenderedTextFilter: (string | undefined)
				const RenderFolderItems = (folder: LibraryFolder, textFilter?: string, forceNewData?: true) => {
					// First clear our grid
					renderMaid.CleanUp()

					// Now load our folder-items
					currentRenderedTextFilter = textFilter
					LoadFolderItems(folder, textFilter, forceNewData)
					.then(
						items => {
							for (const item of items) {
								if ((textFilter === undefined) && (item.Type === "Folder")) {
									// Grab our root-element and create our button
									const folderElement = renderMaid.Give(CreateElement<HTMLDivElement>(FolderGridItemTemplate))
									const folderButton = renderMaid.Give(new Button(folderElement))

									// Grab our element references
									const nameContainer = folderElement.querySelector<HTMLDivElement>(".Name")!
									const folderName = nameContainer.querySelector<HTMLSpanElement>("span")!

									// Create scrollers for our element
									renderMaid.Give(new TextScroller(nameContainer, folderElement, true))

									// Update our details
									folderName.textContent = item.Name

									// Handle requesting a path change
									folderButton.Clicked.Connect(
										() => {
											if (isAddToPlaylistCoverOpen) {
												pathChangeRequested.Fire(item)
											}
										}
									)

									// Append our element
									grid.appendChild(folderElement)
								} else if (item.Type === "Playlist") {
									// Grab our root-element and create our button
									const playlistElement = renderMaid.Give(CreateElement<HTMLDivElement>(PlaylistGridItemTemplate))
									const playlistButton = renderMaid.Give(new Button(playlistElement))

									// Grab our detail references
									const playlistCoverContainer = playlistElement.querySelector<HTMLDivElement>(".Cover")!
									const addedStatus = playlistCoverContainer.querySelector<SVGElement>(".Added")!
									const playlistCover = playlistCoverContainer.querySelector<HTMLImageElement>("img")!
									const playlistTitleContainer = playlistElement.querySelector<HTMLDivElement>(".Details .Name")!
									const playlistTitle = playlistTitleContainer.querySelector<HTMLSpanElement>("span")!
									const playlistCollaboratorsContainer = playlistElement.querySelector<HTMLDivElement>(
										".Details .Collaborators"
									)!
									const playlistCollaborators = playlistCollaboratorsContainer.querySelector<HTMLSpanElement>("span")!

									// Define our animation-targets and what we can manipulate on them
									const targets = {
										Object: {
											Element: addedStatus,
											PropertyValues: {
												Scale: 0,
												Rotation: 0,
												YOffset: 0
											}
										}
									}

									// Create our scrollers
									renderMaid.Give(new TextScroller(playlistTitleContainer, playlistElement, true))
									renderMaid.Give(new TextScroller(playlistCollaboratorsContainer, playlistElement, true))

									// Set our title/collaborators as loading
									playlistCover.classList.toggle("Loading", true)
									playlistTitleContainer.classList.toggle("Loading", true)
									playlistCollaboratorsContainer.classList.toggle("Loading", true)

									// Handle detail updates
									const UpdateToDetails = () => {
										item.LoadedDetails.then(
											(details) => {
												const cover = details.images[0]?.url
												if (cover === undefined) {
													const placeholder = renderMaid.Give(
														CreateElement<SVGElement>(Icons.PlaceholderPlaylistIcon),
														playlistCoverContainer
													)
													playlistCover.style.display = "none"
													playlistCoverContainer.prepend(placeholder)
												} else {
													renderMaid.Clean(playlistCoverContainer)
													playlistCover.style.display = ""
													playlistCover.src = cover
												}

												playlistTitle.textContent = details.name
												playlistCollaborators.textContent = details.collaborators.items.map(
													(collaborator) => collaborator.user.displayName
												).join(", ")
	
												playlistCover.classList.toggle("Loading", false)
												playlistTitleContainer.classList.toggle("Loading", false)
												playlistCollaboratorsContainer.classList.toggle("Loading", false)
											}
										)
									}

									// Load our added status
									let lastAddedStatus: (boolean | undefined)
									const UpdateAddedStatus = (
										initial?: true,
										compareToStatus?: boolean
									): Promise<[(PlaylistItemMetadata | undefined), boolean]> => (
										GetPlaylistContents(item.Uri)
										.then(
											playlistContents => playlistContents.Items.find(
												(playlistItem) => (playlistItem.uri === Song!.Uri)
											)
										)
										.then(
											(playlistItem) => {
												// Mark that we are no longer loading
												playlistCoverContainer.classList.toggle("Loading", false)

												// Quick check to see if we changed at all
												const alreadyAdded = (playlistItem !== undefined)
												if (lastAddedStatus === alreadyAdded) {
													return [
														playlistItem,
														(
															(compareToStatus === undefined) ? true
															: (alreadyAdded === compareToStatus)
														)
													]
												}
												lastAddedStatus = alreadyAdded

												// Handle animating
												if (initial === undefined) {
													RunAnimation(
														(alreadyAdded ? AddedAnimation : RemovedAnimation), targets,
														renderMaid, addedStatus,
														undefined
													)
												}

												// Update our base class (allows us to be visible always or not)
												addedStatus.classList.toggle("Active", alreadyAdded)

												/*
													On the initial call, we already have details requested.

													On any other call, we need to request NEW details, since
													our status changed. We could have a playlist with only our
													song, and then we removed it, leaving the playlist with
													no cover (if it's using the automatically chosen one).
													This is the exact edge-case we are covering by doing this.
												*/
												if (initial) {
													UpdateToDetails()
												} else {
													item.LoadedDetails = GetPlaylistDetails(item.Uri)
													UpdateToDetails()
												}

												return [
													playlistItem,
													(
														(compareToStatus === undefined) ? false
														: (alreadyAdded === compareToStatus)
													)
												]
											}
										)
									)
									UpdateAddedStatus(true)

									// Handle requesting a toggle
									playlistButton.Clicked.Connect(
										() => {
											if (isAddToPlaylistCoverOpen === false) {
												return
											}

											// Check our status again, and make sure we are different than the wanted status
											const addToPlaylist = (lastAddedStatus === false)
											UpdateAddedStatus(undefined, addToPlaylist)
											.then(
												([playlistItem, noStatusDifference]) => {
													if (noStatusDifference) {
														return
													}

													playlistCoverContainer.classList.toggle("Loading", true)

													return (
														(
															addToPlaylist ? AddToPlaylist(item.Uri, [ Song!.Uri ])
															: RemoveFromPlaylist(item.Uri, [ playlistItem! ])
														)
														.then(() => renderMaid.Give(Defer(UpdateAddedStatus), item))
													)
												}
											)
										}
									)

									// Append our element
									grid.appendChild(playlistElement)
								}
							}
						}
					)
				}

				// Store branch state here
				const pathBranches: {
					Folder: LibraryFolder,
					Element: HTMLDivElement
				}[] = []

				// Input Functionality
				let createItemInputState: (
					{
						Type: ("Playlist" | "Folder"),
						InFolder: LibraryFolder,
						Creating?: true
					}
					| undefined
				)
				const UpdateToInputState = () => {
					if (createItemInputState === undefined) {
						input.classList.toggle("Loading", false)
						input.placeholder = `Search ${pathBranches[pathBranches.length - 1].Folder.Name}`
						input.value = ""
						input.maxLength = 50
						input.disabled = (isAddToPlaylistCoverOpen ? false : true)

						renderMaid.Clean("CreateItemWaiting")
					} else {
						// If our branch has changed since the create-item state, we need to reset that
						if (pathBranches[pathBranches.length - 1].Folder !== createItemInputState.InFolder) {
							createItemInputState = undefined
							UpdateToInputState()
							return
						}

						// If we are creating then we can stop here
						if (createItemInputState.Creating) {
							input.classList.toggle("Loading", true)

							input.placeholder = `Creating your ${createItemInputState.Type}, "${input.value}"`
							input.value = ""
							input.maxLength = 0
							input.disabled = true

							return
						} else {
							input.classList.toggle("Loading", false)
						}

						// If we have a filter, restore to the base folder
						if ((currentRenderedTextFilter !== undefined) && isAddToPlaylistCoverOpen) {
							RenderFolderItems(createItemInputState.InFolder)
						}

						// Create our temporary waiting element
						if (createItemInputState.Type === "Folder") {
							const element = renderMaid.Give(CreateElement<HTMLDivElement>(FolderGridItemTemplate), "CreateItemWaiting")
							element.classList.add("Loading")
							element.querySelector<HTMLDivElement>(".Name")!.remove()
							grid.prepend(element)
						} else {
							const element = renderMaid.Give(CreateElement<HTMLDivElement>(PlaylistGridItemTemplate), "CreateItemWaiting")
							element.classList.add("Loading")
							element.querySelector<HTMLImageElement>(".Cover img")!.classList.add("Loading")
							element.querySelector<HTMLDivElement>(".Details")!.remove()
							grid.prepend(element)
						}

						// Setup our input
						input.placeholder = `Type the Name of your ${createItemInputState.Type}`
						input.value = ""
						input.maxLength = 100
						input.disabled = (isAddToPlaylistCoverOpen ? false : true)
						input.focus()
					}
				}
				{
					// Handle update our input state when we change branches
					pathChangeRequested.Connect(() => Defer(UpdateToInputState))

					// Listen for input (matters when searching)
					const UpdateSearchFilter = () => {
						if (isAddToPlaylistCoverOpen === false) {
							return
						}

						if (createItemInputState === undefined) {
							const searchFilter = input.value.trim()
							renderMaid.Give(
								Timeout(0.1, () => RenderFolderItems(
									pathBranches[pathBranches.length - 1].Folder,
									((searchFilter === "") ? undefined : searchFilter))
								),
								"UpdateSearchFilter"
							)
						}
					}
					input.addEventListener("input", UpdateSearchFilter)
					this.Maid.Give(() => input.removeEventListener("input", UpdateSearchFilter))

					// Handle losing focus (when creating an item this matters)
					const OnFocusLost = () => {
						if (
							(createItemInputState === undefined)
							|| createItemInputState.Creating
							|| (isAddToPlaylistCoverOpen === false)
						) {
							return
						}

						createItemInputState = undefined
						UpdateToInputState()
					}
					input.addEventListener("focusout", OnFocusLost)
					this.Maid.Give(() => input.removeEventListener("focusout", OnFocusLost))

					// Handle "enter"/"escape" bindings (enter only matters when creating an item)
					const onEnter = (event: KeyboardEvent) => {
						if (isAddToPlaylistCoverOpen === false) {
							return
						}

						if (event.key === "Enter") {
							const ourCreateItemState = createItemInputState
							if (ourCreateItemState === undefined) {
								return
							}

							const submittedInput = input.value.trim()
							if (submittedInput.length === 0) {
								input.blur()
							}

							ourCreateItemState.Creating = true
							UpdateToInputState()

							{
								(
									(ourCreateItemState.Type === "Folder")
									? CreateFolder(submittedInput, ourCreateItemState.InFolder.Uri)
									: CreatePlaylist(submittedInput, ourCreateItemState.InFolder.Uri)
								)
								.then(
									() => {
										if (ourCreateItemState !== createItemInputState) {
											return
										}

										createItemInputState = undefined
										RenderFolderItems(ourCreateItemState.InFolder, undefined, true)
										UpdateToInputState()
									}
								)
							}
						} else if (event.key === "Escape") {
							input.blur()
						}
					}
					input.addEventListener("keydown", onEnter)
					this.Maid.Give(() => input.removeEventListener("keydown", onEnter))
				}

				// Path Functionality
				const pathMaid = this.Maid.Give(new Maid())
				const AddPathBranch = (folder: LibraryFolder, template: string) => {
					// Create our maid
					const branchMaid = pathMaid.Give(new Maid(), folder)

					// Create our branch element and its corresponding button
					const branchElement = branchMaid.Give(CreateElement<HTMLDivElement>(template))
					const branchButton = branchMaid.Give(new Button(branchElement))
					const branchNameContainer = branchElement.querySelector<HTMLDivElement>(".Name")!
					const branchName = branchNameContainer.querySelector<HTMLSpanElement>("span")!

					// Create a scroller for our branch-name
					branchMaid.Give(new TextScroller(branchNameContainer, branchElement))

					// Set our branch name
					branchName.textContent = folder.Name

					// Handle requesting a path change
					branchButton.Clicked.Connect(
						() => {
							if (isAddToPlaylistCoverOpen === false) {
								return
							}

							if (branchElement.classList.contains("Current") === false) {
								pathChangeRequested.Fire(folder)
							}
						}
					)

					// Now append our branch
					pathBranchContainer.appendChild(branchElement)

					// Store ourselves
					pathBranches.push({ Folder: folder, Element: branchElement })
				}

				// Handle shifting our path so that we are right-aligned IF we are overflowing
				this.Maid.Give(
					new ResizeObserver(
						() => pathBranchContainer.style.transform = `translateX(-${
							Math.max(0, (pathBranchContainer.clientWidth - pathContainer.clientWidth))
						}px)`
					)
				).observe(pathBranchContainer)

				// Create our tool-tips
				{
					const closeTooltip = Spotify.Tippy(
						closeElement,
						{
							...Spotify.TippyProps,
							content: "Close"
						}
					)
					const addFolderTooltip = Spotify.Tippy(
						addFolderElement,
						{
							...Spotify.TippyProps,
							content: "Create Folder"
						}
					)
					const addPlaylistTooltip = Spotify.Tippy(
						addPlaylistElement,
						{
							...Spotify.TippyProps,
							content: "Create Playlist"
						}
					)
					this.Maid.GiveItems(
						() => closeTooltip.destroy(),
						() => addFolderTooltip.destroy(),
						() => addPlaylistTooltip.destroy()
					)
				}

				// Handle our statically available buttons
				{
					const [
						closeButton, addFolderButton, addPlaylistButton
					] = this.Maid.GiveItems(
						new Button(closeElement), new Button(addFolderElement), new Button(addPlaylistElement)
					)

					closeButton.Clicked.Connect(() => SetAddToPlaylistCoverOpenState(false))

					addFolderButton.Clicked.Connect(
						() => {
							if (isAddToPlaylistCoverOpen === false) {
								return
							}

							createItemInputState = {
								Type: "Folder",
								InFolder: pathBranches[pathBranches.length - 1].Folder
							}
							UpdateToInputState()
						}
					)
					addPlaylistButton.Clicked.Connect(
						() => {
							if (isAddToPlaylistCoverOpen === false) {
								return
							}

							createItemInputState = {
								Type: "Playlist",
								InFolder: pathBranches[pathBranches.length - 1].Folder
							}
							UpdateToInputState()
						}
					)
				}

				// Handle requests to change the path
				pathChangeRequested.Connect(
					(folder) => {
						// Start rendering our items
						RenderFolderItems(folder)

						// Toggle our tail branch current class
						pathBranches[pathBranches.length - 1].Element.classList.toggle("Current", false)

						// Determine if we just need to trim our path or if we need to add a new branch
						let index: (number | undefined)
						for (let pathIndex = 0; pathIndex < pathBranches.length; pathIndex += 1) {
							if (pathBranches[pathIndex].Folder === folder) {
								index = pathIndex
								break
							}
						}

						if (index === undefined) {
							AddPathBranch(folder, FolderPathBranchTemplate)
						} else {
							for (let pathIndex = (pathBranches.length - 1); pathIndex > index; pathIndex -= 1) {
								const pathBranch = pathBranches.pop()!
								pathMaid.Clean(pathBranch.Folder)
								pathMaid.Clean(pathBranch.Element)
							}
						}

						pathBranches[pathBranches.length - 1].Element.classList.toggle("Current", true)
					}
				)

				// Handle opening/closing our cover
				{
					const openProgressSpring = new Spring(0, 0, 0)
					let lastProcessTimestamp: (number | undefined)
					const RunAnimation = () => {
						const timeNow = performance.now()

						if (lastProcessTimestamp !== undefined) {
							const deltaTime = ((timeNow - lastProcessTimestamp) / 1000)
							const openProgress = openProgressSpring.Step(deltaTime)

							mediaSpace.style.setProperty("--AddToPlaylistOpenProgress", openProgress.toString())

							if (openProgressSpring.CanSleep()) {
								lastProcessTimestamp = undefined

								if (isAddToPlaylistCoverOpen === false) {
									addToPlaylistCover.classList.toggle("Closing", false)
									addToPlaylistCover.classList.toggle("Open", false)
									pathBranches.length = 0
									pathMaid.CleanUp()
									renderMaid.CleanUp()
								}

								return
							}
						}

						lastProcessTimestamp = timeNow

						this.Maid.Give(OnPreRender(RunAnimation), "AddToPlaylistAnimation")
					}

					SetAddToPlaylistCoverOpenState = (open: boolean) => {
						if (isAddToPlaylistCoverOpen === open) {
							return
						}
	
						isAddToPlaylistCoverOpen = open

						if (open) {
							// Easy way for us to determine if we should even bother with this (rapid opening/closing)
							if (pathBranches.length === 0) {
								AddPathBranch(library, LibraryPathBranchTemplate)
								pathChangeRequested.Fire(library)
							} else if (pathBranches.length > 1) {
								for (let pathIndex = (pathBranches.length - 1); pathIndex > 0; pathIndex -= 1) {
									const pathBranch = pathBranches.pop()!
									pathMaid.Clean(pathBranch.Folder)
									pathMaid.Clean(pathBranch.Element)
								}
								pathChangeRequested.Fire(library)
							}

							// If we're opening, we need to reset our input state
							if (currentRenderedTextFilter !== undefined) {
								RenderFolderItems(pathBranches[pathBranches.length - 1].Folder)
								UpdateToInputState()
							}

							// We only set open here since we'll set it to false when the close actually happens
							addToPlaylistCover.classList.toggle("Closing", false)
							addToPlaylistCover.classList.toggle("Open", true)
						} else {
							addToPlaylistCover.classList.toggle("Closing", true) // Disables input
							input.blur()
						}

						openProgressSpring.SetGoal(open ? 1 : 0)
						openProgressSpring.SetFrequency(open ? AddToPlaylistFadeInSpeed : AddToPlaylistFadeOutSpeed)
						openProgressSpring.SetDampingRatio(open ? 1.5 : 2)

						RunAnimation()
					}

					// Close ourselves when the song changes (obvious reasons)
					SongChanged.Connect(
						() => {
							SetAddToPlaylistCoverOpenState(false)
							delete library.Items
						}
					)
				}
			}

			// Handle our view controls
			{
				// Grab our controls
				const addToPlaylistButton = viewControls.querySelector<HTMLButtonElement>("#AddToPlaylist")!
				const romanizeButton = viewControls.querySelector<HTMLButtonElement>("#Romanize")!
				const fullscreenButton = viewControls.querySelector<HTMLButtonElement>("#Fullscreen")!
				const smallViewButton = viewControls.querySelector<HTMLButtonElement>("#SmallerView")!
				const closeButton = viewControls.querySelector<HTMLButtonElement>("#Close")!
				// const toggleDetailsButton = viewControls.querySelector<HTMLButtonElement>("#ToggleDetails")!

				// Handle our add to playlist button
				{
					const addToPlaylistTooltip = Spotify.Tippy(
						addToPlaylistButton,
						{
							...Spotify.TippyProps,
							content: "Add to Playlist"
						}
					)
					this.Maid.Give(() => addToPlaylistTooltip.destroy())

					addToPlaylistButton.addEventListener(
						"click",
						() => SetAddToPlaylistCoverOpenState(true)
					)

					// Hide our button when we go into DJ
					const CheckForDJ = () => addToPlaylistButton.style.display = (Song?.Type === "DJ" ? "none" : "")
					CheckForDJ()
					this.Maid.Give(SongChanged.Connect(CheckForDJ))
				}

				// Handle our view changing
				let exitedFullscreenFromButton: (true | undefined)
				{
					// Setup our tooltips
					const smallViewTooltip = Spotify.Tippy(
						smallViewButton,
						{
							...Spotify.TippyProps,
							content: "__WAITING__"
						}
					)
					const fullscreenTooltip = Spotify.Tippy(
						fullscreenButton,
						{
							...Spotify.TippyProps,
							content: "Enter Fullscreen"
						}
					)
					this.Maid.Give(() => smallViewTooltip.destroy() && fullscreenTooltip.destroy())

					// Setup our utility functions
					const UpdateToFullscreenState = () => {
						const notFullscreen = (document.fullscreenElement === null)

						// Switch the inner content of our small-view button
						smallViewTooltip.setContent(
							notFullscreen ? "__WAITING__"
							: "Back to Cinema"
						)
						smallViewButton.innerHTML = (
							notFullscreen ? ""
							: Icons.FullscreenClose
						)

						// Hide our fullscreen button (since we're already in fullscreen!)
						smallViewButton.style.display = (notFullscreen ? "none" : "")
						fullscreenButton.style.display = (
							notFullscreen ? ""
							: "none"
						)
					}
					const RequestFullscreenState = (shouldBeFullscreen: boolean) => {
						const notFullscreen = (document.fullscreenElement === null)
						if (shouldBeFullscreen === notFullscreen) {
							if (shouldBeFullscreen) {
								delete SpotifyHistory.location.state.FromPlaybar // Consume this flag (prevents non-user input fullscreen)
								document.documentElement.requestFullscreen()
							} else {
								document.exitFullscreen()
							}
						}
					}

					// Now setup our button functionality
					{
						const SetToFullscreen = () => RequestFullscreenState(true)
						fullscreenButton.addEventListener("click", SetToFullscreen)

						const SetToSmallView = () => {
							if (document.fullscreenElement === null) {
								SpotifyHistory.push("/BeautifulLyrics/Page")
							} else {
								exitedFullscreenFromButton = true
								RequestFullscreenState(false)
							}
						}
						smallViewButton.addEventListener("click", SetToSmallView)

						this.Maid.GiveItems(
							() => fullscreenButton.removeEventListener("click", SetToFullscreen),
							() => smallViewButton.removeEventListener("click", SetToSmallView)
						)

						RequestFullscreenState(makeSpotifyFullscreen ?? false)
					}

					UpdateToFullscreenState()
					document.addEventListener("fullscreenchange", UpdateToFullscreenState)
					this.Maid.Give(() => document.removeEventListener("fullscreenchange", UpdateToFullscreenState))
				}

				// Handle our close button
				{
					const closeTooltip = Spotify.Tippy(
						closeButton,
						{
							...Spotify.TippyProps,
							content: "Close"
						}
					)
					this.Maid.Give(() => closeTooltip.destroy())

					closeButton.addEventListener(
						"click",
						() => this.Close()
					)

					// Listen for escape-key functionality
					const OnEscape = {
						onReleased: (event: KeyEvent<KeyboardEvent, BrowserKeyEventProps>) => {
							event.preventDefault()
							this.Close()
						}
					}
					bindKey("escape", OnEscape)
					this.Maid.Give(() => unbindKey("escape", OnEscape))

					// Watch for when our fullscreen state changes (determines if we close ourselves or not)
					const OnFullscreenChange = () => {
						if (
							(document.fullscreenElement === null)
							&& makeSpotifyFullscreen
							&& (exitedFullscreenFromButton === undefined)
						) {
							this.Close()
						}
					}
					document.addEventListener("fullscreenchange", OnFullscreenChange)
					this.Maid.Give(() => document.removeEventListener("fullscreenchange", OnFullscreenChange))
				}

				// Handle our toggle-details button
				/*
				if (toggleDetailsButton !== undefined) {
					// Get our current-state
					let detailsHidden = Store.Items.PlaybarDetailsHidden

					// Create our tool-tip
					const detailsTooltip = Spotify.Tippy(
						toggleDetailsButton,
						{
							...Spotify.TippyProps,
							content: ""
						}
					)
					this.Maid.Give(() => detailsTooltip.destroy())

					// Handle updating our icon/class
					const Update = () => {
						toggleDetailsButton!.innerHTML = (detailsHidden ? ShowDetailsSVGIcon : HideDetailsSVGIcon)

						if (detailsHidden) {
							container.classList.add("PlaybarDetailsHidden")
							detailsTooltip.setContent("Show Playbar Details")
						} else {
							container.classList.remove("PlaybarDetailsHidden")
							detailsTooltip.setContent("Hide Playbar Details")
						}
					}

					// Handle switching our state
					toggleDetailsButton.addEventListener(
						"click",
						() => {
							// Flip our state
							detailsHidden = !detailsHidden

							// Save our state
							Store.Items.PlaybarDetailsHidden = detailsHidden
							Store.SaveChanges()

							// Now update
							Update()
						}
					)

					// Update  immediately
					Update()
				}*/

				// Setup our romanization button
				SetupRomanizationButton(romanizeButton, UpdateLyricsRenderer, this.Maid)
			}

			// Handle our like state
			{
				// Grab our heart references
				const loading = likeStateContainer.querySelector<HTMLDivElement>(".Loading")!
				const heartOutline = likeStateContainer.querySelector<HTMLDivElement>(".Outline")!
				const filledHeart = likeStateContainer.querySelector<HTMLDivElement>(".Filled")!
				const leftHeartPiece = filledHeart.querySelector<HTMLDivElement>(".Left")!
				const rightHeartPiece = filledHeart.querySelector<HTMLDivElement>(".Right")!

				// Store our state
				const lastAnimationStates: AnimationState[] = []
				let currentAnimationStateCollection: AnimationStates<AnimationMetadata>
				let currentAnimationState: AnimationState
				let isHovering = false
				let isWaitingForLikeClick = false
				let isWaitingForLikeUpdate = false

				// Create our button for the container
				const likeButton = this.Maid.Give(new Button(likeStateContainer))

				// Define our targets and what we can manipulate on them
				const targets = {
					Outline: {
						Element: heartOutline,
						PropertyValues: { ...TargetPropertyValues.Outline }
					},
					Filled: {
						Element: filledHeart,
						PropertyValues: { ...TargetPropertyValues.Filled }
					},
					LeftPiece: {
						Element: leftHeartPiece,
						PropertyValues: { ...TargetPropertyValues.LeftPiece }
					},
					RightPiece: {
						Element: rightHeartPiece,
						PropertyValues: { ...TargetPropertyValues.RightPiece }
					},
				}

				// Handle animating our given state
				const StartAnimatingState = (fromLikeStateUpdate?: true, forceDefault?: boolean, ignoreSwitchedTo?: true) => {
					// Determine what our state is in
					const newAnimationStateCollection = (IsLiked ? LikedAnimationState : NotLikedAnimationState)
					const newAnimationState: AnimationState = (
						// Only happens on initial call or new song (needs to immediately display state)
						forceDefault ? "Default"

						// Pressed takes priority when pressing or waiting for a like update (and when not called from a LikeUpdate)
						: (
							likeButton.IsPressed()
							|| ((fromLikeStateUpdate === undefined) && (isWaitingForLikeClick || isWaitingForLikeUpdate))
						) ? "Pressed"

						/*
							SwitchedTo has an interesting case where we have to account for two situations:
							- Switched from a LikeUpdate
							- Preventing any other non-action state (Hover/Unhovered) from happening

							The first condition is obvious, but in the second we need to make sure our
							current-state is NOT "SwitchedTo" (and we're not ignoring it) so that
							we don't activate "Hover"/"Unhovered" states
						*/
						: (
							(fromLikeStateUpdate && (forceDefault === undefined))
							|| ((ignoreSwitchedTo === undefined) && (currentAnimationState === "SwitchedTo"))
						) ? "SwitchedTo"

						: isHovering ? "Hover"

						// We check for Pressed since unhovering while Pressed will Release it but not trigger a Click
						: ((currentAnimationState === "Pressed") || (currentAnimationState === "Hover")) ? "Unhovered"

						: "Default"
					)

					// We don't need to animate to the same state
					if (
						(newAnimationStateCollection === currentAnimationStateCollection)
						&& (newAnimationState === currentAnimationState)
					) {
						return
					}

					// Disable our loading states
					this.Maid.Clean("LikeStateLoading")
					loading.classList.toggle("Full", false)
					loading.classList.toggle("Outline", false)

					// Update our last states (used for certain task conditions)
					if (lastAnimationStates.length === 2) {
						lastAnimationStates.shift()
					}
					lastAnimationStates.push(currentAnimationState)

					// Update our current state
					currentAnimationStateCollection = newAnimationStateCollection, currentAnimationState = newAnimationState

					// Update our class-states
					if (fromLikeStateUpdate) {
						heartOutline.classList.toggle("Active", (IsLiked === false))
						filledHeart.classList.toggle("Active", IsLiked)
					}

					// If we have no tasks to run then don't do anything
					RunAnimation(
						currentAnimationStateCollection[currentAnimationState], targets,
						this.Maid, "LikeAnimation",

						{
							Maid: this.Maid,
							LastAnimationStates: lastAnimationStates,
							LikeStateUpdateShimmerAppearsAfter,
							Loading: loading
						},

						// We want to update to the correct state after our switch animation finishes
						(newAnimationState === "SwitchedTo") ? (() => StartAnimatingState(undefined, undefined, true)) : undefined
					)
				}

				// Watch for updates
				let newSong: (true | undefined)
				const UpdateToLikeState = (initialCall?: true) => {
					isWaitingForLikeUpdate = false

					if (initialCall || newSong) {
						StartAnimatingState(true, true, true) // This is done so we can reset our state to default
						StartAnimatingState(true, false, true) // Then we check if we can animate the state to anything else
					}

					// Prevents double starting of our animation state
					if (newSong || initialCall) {
						if (initialCall === undefined) {
							newSong = undefined
						}

						return
					}

					StartAnimatingState(true)
				}
				{
					UpdateToLikeState(true)
					this.Maid.Give(
						SongChanged.Connect(
							() => (
								newSong = true,
	
								// Prevent accidentally unliking a song if we're still pressing during a song change
								isWaitingForLikeClick = false, isWaitingForLikeUpdate = false
							)
						)
					)
					this.Maid.Give(IsLikedChanged.Connect(UpdateToLikeState))
				}

				// Handle our like button actions
				{
					likeButton.Pressed.Connect(
						() => {
							// Prevents the "Hover" state from activating and keeps it pressed until we get a like update
							isWaitingForLikeClick = true
							StartAnimatingState()
						}
					)
					likeButton.Clicked.Connect(
						() => {
							// Only do any behavior IF we've registered a click and haven't deregistered it
							if (isWaitingForLikeClick) {
								isWaitingForLikeClick = false, isWaitingForLikeUpdate = true
								SetIsLiked(!IsLiked)
							}
						}
					)
				}

				// Handle checking if we're within the hover area (used for hover/unhover states)
				{
					const MarkHover = () => {
						isHovering = true
						StartAnimatingState()
					}
					const UnmarkHover = () => {
						if (isWaitingForLikeClick) {
							isWaitingForLikeClick = false
						}

						isHovering = false
						StartAnimatingState()
					}
					likeStateContainer.addEventListener("mouseenter", MarkHover)
					likeStateContainer.addEventListener("mouseleave", UnmarkHover)
					this.Maid.GiveItems(
						() => likeStateContainer.removeEventListener("mouseenter", MarkHover),
						() => likeStateContainer.removeEventListener("mouseleave", UnmarkHover)
					)
				}
			}

			// Handle our playback controls
			{
				// Grab our control references
				const shuffleToggleElement = playbackControls.querySelector<HTMLDivElement>(".Shuffle")!
				const lastTrackElement = playbackControls.querySelector<HTMLDivElement>(".LastTrack")!
				const playToggleElement = playbackControls.querySelector<HTMLDivElement>(".TogglePlayState")!
				const nextTrackElement = playbackControls.querySelector<HTMLDivElement>(".NextTrack")!
				const loopToggleElement = playbackControls.querySelector<HTMLDivElement>(".ToggleLoopState")!

				// Create our buttons
				const [shuffleButton, lastTrackButton, playButton, nextTrackButton, loopButton] = this.Maid.GiveItems(
					new Button(shuffleToggleElement),
					new Button(lastTrackElement), new Button(playToggleElement), new Button(nextTrackElement),
					new Button(loopToggleElement),
				)

				// Handle play toggling
				{
					const Update = () => {
						playToggleElement.innerHTML = (IsPlaying ? Icons.Pause : Icons.Play)
					}
					Update()
					this.Maid.Give(IsPlayingChanged.Connect(Update))

					playButton.Clicked.Connect(() => SetIsPlaying(!IsPlaying))
				}

				// Handle track buttons
				{
					lastTrackButton.Clicked.Connect(SpotifyPlayer.back)
					nextTrackButton.Clicked.Connect(SpotifyPlayer.next)
				}

				// Handle shuffle/loop buttons
				{
					// Handle updating
					const OnShuffleUpdate = () => {
						shuffleToggleElement.classList.toggle("Enabled", IsShuffling)
					}
					const OnLoopUpdate = () => {
						loopToggleElement.classList.toggle("Enabled", (LoopMode !== "Off"))
						loopToggleElement.innerHTML = (
							(LoopMode === "Off") ? Icons.Loop
							: (LoopMode === "Context") ? Icons.Loop
							: Icons.LoopTrack
						)
					}

					OnShuffleUpdate()
					OnLoopUpdate()

					this.Maid.GiveItems(IsShufflingChanged.Connect(OnShuffleUpdate), LoopModeChanged.Connect(OnLoopUpdate))

					// Handle buttons
					shuffleButton.Clicked.Connect(() => SetIsShuffling(!IsShuffling))
					loopButton.Clicked.Connect(
						() => {
							if (LoopMode === "Off") {
								SetLoopMode("Context")
							} else if (LoopMode === "Context") {
								SetLoopMode("Song")
							} else {
								SetLoopMode("Off")
							}
						}
					)
				}
			}

			// Handle our volume control
			const volumeSlider = this.Maid.Give(new Slider(volumeBar, undefined, undefined, MinimumVolume))
			{
				volumeSlider.ProgressChanged.Connect(
					(newVolume) => {
						SpotifyPlayer.setVolume(
							(newVolume === MinimumVolume) ? 0
							: newVolume
						)

						for(const [index, volumeLevel] of volumeLevels.entries()) {
							volumeLevel.classList.toggle(
								"Hidden",
								(
									(newVolume === MinimumVolume)
									|| (newVolume < VolumeLevelPoints[index])
								)
							)
						}
					}
				)
				volumeSlider.SetProgress(SpotifyPlayer.getVolume())
			}

			// Handle our timeline
			const timelineSlider = this.Maid.Give(new Slider(timelineBar, undefined, 1))
			{
				// Handle hiding our timeline when we're in DJ mode
				const CheckForDJ = () => timelineBar.style.display = (Song?.Type === "DJ" ? "none" : "")
				CheckForDJ()
				this.Maid.Give(SongChanged.Connect(CheckForDJ))

				// Handle updating our slider timestamp to its active position
				timelineSlider.ProgressChanged.Connect(
					(progress, changedByUser) => {
						if (changedByUser && (Song!.Type !== "DJ")) {
							const minutes = Math.floor(progress / 60)
							const seconds = Math.floor(progress % 60)
							timelineTimestamp.textContent = `${
								(Song!.Duration >= 600) ? minutes.toString().padStart(2, "0")
								: minutes
							}:${seconds.toString().padStart(2, "0")}`
						}
					}
				)

				// Handle seeking to our desired progress
				let newSeekTimestamp: (number | undefined) // Helps us pause timeline updating until we're at our seek timestamp
				let seekApprovedDeltaDirection: (number | undefined) // Helps us determine if we're at a good seek-point
				timelineSlider.IsActiveChanged.Connect(
					(isActive, _, seekToTimestamp) => {
						if ((isActive === false) && (seekToTimestamp !== undefined)) {
							newSeekTimestamp = seekToTimestamp
							seekApprovedDeltaDirection = ((Timestamp < seekToTimestamp) ? 1 : -1)
							SeekTo(seekToTimestamp)
						}
					}
				)

				// Handle song details
				const UpdateTimelineToSong = () => {
					// Clean-up our last connection
					this.Maid.Clean("TimelineUpdater")
	
					// Determine our new functionality
					if ((Song !== undefined) && (Song.Type !== "DJ")) {
						// Reset our seek-point
						newSeekTimestamp = undefined
						seekApprovedDeltaDirection = undefined

						// Update our timeline immediately
						timelineSlider.SetProgress(Timestamp, Song.Duration)
	
						// Update our duration time-label
						timelineLength.textContent = GetDurationString()
	
						// Update our time-labels
						const UpdateTimestampLabel = () => {
							// FIRST, check if there is a seek point we need to be at/near (prevents flickering)
							if (newSeekTimestamp !== undefined) {
								const timestampDelta = (Timestamp - newSeekTimestamp)
								if (
									(Math.abs(timestampDelta) < 0.1)
									|| (Math.sign(timestampDelta) === seekApprovedDeltaDirection)
								) {
									newSeekTimestamp = undefined
									seekApprovedDeltaDirection = undefined
								} else {
									return
								}
							}

							// Don't bother updating to our timestamp IF we're actively using the slider
							if (timelineSlider.IsActive() === false) {
								timelineTimestamp.textContent = GetTimestampString()
								timelineSlider.SetProgress(Timestamp)
							}
						}
						UpdateTimestampLabel()
						this.Maid.Give(TimeStepped.Connect(UpdateTimestampLabel), "TimelineUpdater")
					}
				}
				UpdateTimelineToSong()
				this.Maid.Give(SongChanged.Connect(UpdateTimelineToSong))
			}

			// Handle detail updating (cover-art and text details)
			{
				const detailsMaid = this.Maid.Give(new Maid(), "SongDetails")
				const Update = () => {
					// Clean our related maids
					detailsMaid.CleanUp()

					// Determine if we should show that we're loading
					if (HaveSongDetailsLoaded === false) {
						coverArt.style.setProperty("--CoverArtHueShift", "0deg")
						coverArt.style.backgroundColor = ""

						mediaSpace.classList.toggle("Loading", true)
						trackTitleContainer.classList.toggle("Loading", true)
						trackArtistsContainer.classList.toggle("Loading", true)
						trackReleaseDate.classList.toggle("Loading", true)

						trackTitle.textContent = ""
						trackArtists.innerHTML = ""
						trackReleaseDate.textContent = ""

						return
					}

					// Force our loading state back to normal
					mediaSpace.classList.toggle("Loading", false)
					trackTitleContainer.classList.toggle("Loading", false)
					trackArtistsContainer.classList.toggle("Loading", false)
					trackReleaseDate.classList.toggle("Loading", false)

					// Determine if we need to show a custom message or just show the details
					if (Song?.Type === "DJ") {
						const [coverArtUrl, placeholderHueShift] = GetCoverArtForSong()
						coverArt.style.backgroundColor = ((placeholderHueShift === undefined) ? "" : "white")
						coverArt.style.setProperty("--CoverArtHueShift", `${placeholderHueShift ?? 0}deg`)
						coverArt.src = coverArtUrl

						const trackTitleLink = detailsMaid.Give(document.createElement("span"))
						trackTitleLink.textContent = Song.Action
						trackTitle.appendChild(trackTitleLink)

						const artistElement = detailsMaid.Give(document.createElement("span"))
						artistElement.textContent = "DJ"
						trackArtists.appendChild(artistElement)

						trackReleaseDate.textContent = ""
						trackReleaseDetailsSeparator.style.display = "none"
					} else if (SongDetails !== undefined) {
						const [coverArtUrl, placeholderHueShift] = GetCoverArtForSong()
						coverArt.style.backgroundColor = ((placeholderHueShift === undefined) ? "" : "white")
						coverArt.style.setProperty("--CoverArtHueShift", `${placeholderHueShift ?? 0}deg`)
						coverArt.src = coverArtUrl

						if (SongDetails.IsLocal) {
							if ((SongContext === undefined) || (SongContext.Type === "Other")) {
								const trackTitleLink = detailsMaid.Give(document.createElement("span"))
								trackTitleLink.textContent = SongDetails.Name
								trackTitle.appendChild(trackTitleLink)
							} else {
								const trackTitleLink = detailsMaid.Give(document.createElement("a"))
								trackTitleLink.href = (
									(SongContext.Type === "LocalFiles") ? "/collection/local-files"
									: (SongContext.Type === "Playlist") ? `/playlist/${SongContext.Id}`
									: (SongContext.Type === "Album") ? `/album/${SongContext.Id}`
									: ""
								)
								trackTitleLink.textContent = SongDetails.Name

								trackTitleLink.addEventListener("click", OpenSpotifyPage)
								detailsMaid.Give(() => trackTitleLink.removeEventListener("click", OpenSpotifyPage))

								trackTitle.appendChild(trackTitleLink)
							}
						} else {
							const trackTitleLink = detailsMaid.Give(document.createElement("a"))
							trackTitleLink.href = `/album/${SongDetails.Album.Id}`
							trackTitleLink.textContent = SongDetails.Name

							trackTitleLink.addEventListener("click", OpenSpotifyPage)
							detailsMaid.Give(() => trackTitleLink.removeEventListener("click", OpenSpotifyPage))

							trackTitle.appendChild(trackTitleLink)
						}

						if (SongDetails.Artists !== undefined) {
							if (SongDetails.IsLocal) {
								for (const [index, artistName] of SongDetails.Artists.entries()) {
									const artistElement = detailsMaid.Give(document.createElement("span"))
									artistElement.textContent = artistName
		
									if (index > 0) {
										const separator = detailsMaid.Give(document.createElement("span"))
										separator.textContent = ", "
										trackArtists.appendChild(separator)
									}
		
									trackArtists.appendChild(artistElement)
								}
							} else {
								for (const [index, artist] of SongDetails.Artists.entries()) {
									const artistElement = detailsMaid.Give(document.createElement("a"))
									artistElement.href = `/artist/${artist.Id}`
									artistElement.textContent = artist.Name
		
									if (index > 0) {
										const separator = detailsMaid.Give(document.createElement("span"))
										separator.textContent = ", "
										trackArtists.appendChild(separator)
									}
		
									artistElement.addEventListener("click", OpenSpotifyPage)
									detailsMaid.Give(() => artistElement.removeEventListener("click", OpenSpotifyPage))
		
									trackArtists.appendChild(artistElement)
								}
							}
						}

						if (SongDetails.IsLocal) {
							trackReleaseDate.textContent = ""
						} else {
							trackReleaseDate.textContent = SongDetails.Album.ReleaseDate.year.toString()
						}

						if (SongDetails.IsLocal) {
							trackReleaseDetailsSeparator.style.display = "none"
						} else {
							trackReleaseDetailsSeparator.style.display = ""
						}
					}
				}
				Update()
				SongChanged.Connect(Update)
				SongDetailsLoaded.Connect(Update)
			}

			// Handle toggling our controls visibility
			{
				// Store our auto-hide trigger
				// deno-lint-ignore prefer-const
				let triggerAutoHideTimer: () => void
				
				// Store our state for checking if we are over any element that should prevent fading-out
				let isOverCoverArt = false
				let isOverSlider = false

				// Animation Process
				const progressSpring = new Spring(0, 0, 0)
				const hoverScaleSpring = new Spring(0, 0, 0)
				let controlsVisible = false
				let visuallyActive = false
				let lastProcessTimestamp: (number | undefined)
				const RunAnimation = () => {
					const timeNow = performance.now()

					if (lastProcessTimestamp !== undefined) {
						const deltaTime = ((timeNow - lastProcessTimestamp) / 1000)
						const progress = progressSpring.Step(deltaTime)
						const hoverScale = hoverScaleSpring.Step(deltaTime)

						mediaSpace.style.setProperty("--CoverArtHoverScale", hoverScale.toString())
						mediaSpace.style.setProperty(
							"--ControlsVisibleScale",
							(progress ** 4).toString() // So when we fade-in it comes in a little slower
						)
						coverArt.style.setProperty(
							"--CoverArtScale",
							progress.toString()
						)

						if (progressSpring.CanSleep() && hoverScaleSpring.CanSleep()) {
							lastProcessTimestamp = undefined
							visuallyActive = false

							if (controlsVisible === false) {
								mediaSpace.classList.remove("ControlsVisible")
							}

							return
						}
					}

					lastProcessTimestamp = timeNow

					this.Maid.Give(OnPreRender(RunAnimation), "Animation")
				}

				// Handle toggling our control visibility
				const mouseArea = content.querySelector<HTMLDivElement>(".PlayPanelMouseArea")!
				const ToggleControls = (event?: MouseEvent) => {
					const shouldBeVisible = (
						(IsPlaying === false)
						|| timelineSlider.IsActive() || volumeSlider.IsActive()
						|| (
							(event !== undefined)
							&& (
								(event.clientX > mouseArea.clientLeft)
								&& (event.clientX < (mouseArea.clientLeft + mouseArea.clientWidth))
								&& (event.clientY > mouseArea.clientTop)
								&& (event.clientY < (mouseArea.clientTop + mouseArea.clientHeight))
							)
						)
					)
					if (controlsVisible !== shouldBeVisible) {
						controlsVisible = shouldBeVisible

						// Determine if we should stop our timer
						if (controlsVisible === false) {
							this.Maid.Clean("ControlsAutoHideTimer")
						}

						// Start our animation
						{
							progressSpring.SetGoal(controlsVisible ? 1 : 0)
							progressSpring.SetFrequency(controlsVisible ? ControlsFadeInSpeed : ControlsFadeOutSpeed)
							progressSpring.SetDampingRatio(controlsVisible ? 1.5 : 2)
	
							hoverScaleSpring.SetGoal(
								(isOverCoverArt ? 1 : 0),
								(shouldBeVisible && hoverScaleSpring.CanSleep())
							)
							hoverScaleSpring.SetFrequency(controlsVisible ? ControlsFadeInSpeed : ControlsFadeOutSpeed)
							hoverScaleSpring.SetDampingRatio(controlsVisible ? 1.5 : 2)
						}

						// Handle applying visuals IF we haven't already
						if (visuallyActive === false) {
							visuallyActive = true

							if (controlsVisible) {
								mediaSpace.classList.add("ControlsVisible")
							}

							RunAnimation()
						}
					}
				}

				// Register our auto-hider trigger
				triggerAutoHideTimer = () => {
					if (
						controlsVisible
						&& IsPlaying
						&& (isOverCoverArt === false)
						&& (isOverSlider === false)
						&& (timelineSlider.IsActive() === false)
						&& (volumeSlider.IsActive() === false)
					) {
						this.Maid.Give(
							Timeout(ControlsAutoHideAfter, () => ToggleControls()),
							"ControlsAutoHideTimer"
						)
					} else {
						this.Maid.Clean("ControlsAutoHideTimer")
					}
				}

				// Update ourselves when changing play-state
				this.Maid.Give(IsPlayingChanged.Connect(() => (IsPlaying ? triggerAutoHideTimer() : ToggleControls())))

				// Immediately toggle our controls when our active state changes
				const UpdateHoverScaleSpringGoal = () => {
					const newGoal = (
						(isOverCoverArt || volumeSlider.IsActive()) ? 1
						: 0
					)
					if (hoverScaleSpring.GetGoal() !== newGoal) {
						hoverScaleSpring.SetGoal(newGoal)
						RunAnimation()
					}

					if (isOverCoverArt === false) {
						SetAddToPlaylistCoverOpenState(false)
					}
				}
				{
					const CheckWhenSliderDone = (isActive: boolean, mouseEvent: MouseEvent) => {
						if (isActive === false) {
							if ((isOverCoverArt === false) && (isOverSlider === false)) {
								triggerAutoHideTimer()
							}

							UpdateHoverScaleSpringGoal()
							ToggleControls(mouseEvent)
						}
					}
					timelineSlider.IsActiveChanged.Connect(CheckWhenSliderDone)
					volumeSlider.IsActiveChanged.Connect(CheckWhenSliderDone)
				}
				
				// Handle our mouse related events
				{
					// This is for the blur event
					const ForceHideControls = () => ToggleControls()

					// Handle determining if we can register mouse movements or not
					let canRegisterMovement = true
					const allowMovement = () => canRegisterMovement = true
					const disallowMovement = (mouseEvent: MouseEvent) => {
						canRegisterMovement = false
						ToggleControls(mouseEvent)
					}
					const checkMovement = (event: MouseEvent) => {
						if (canRegisterMovement) {
							ToggleControls(event)
							triggerAutoHideTimer()
						}
					}
					const MarkCoverArtHover = () => {
						isOverCoverArt = true
						this.Maid.Clean("ControlsAutoHideTimer")
						UpdateHoverScaleSpringGoal()
					}
					const UnmarkCoverArtHover = () => {
						isOverCoverArt = false
						UpdateHoverScaleSpringGoal()
					}
					const MarkSliderHover = () => isOverSlider = true
					const UnmarkSliderHover = () => isOverSlider = false

					// Register all our event listeners
					mediaSpace.addEventListener("mouseenter", MarkCoverArtHover)
					mediaSpace.addEventListener("mouseleave", UnmarkCoverArtHover)
					
					const timelineHitbox = timelineSlider.GetHitBox()
					timelineHitbox.addEventListener("mouseenter", MarkSliderHover)
					timelineHitbox.addEventListener("mouseleave", UnmarkSliderHover)

					globalThis.addEventListener("mouseover", allowMovement)
					globalThis.addEventListener("mouseout", disallowMovement)
					globalThis.addEventListener("mousemove", checkMovement)
					globalThis.addEventListener("blur", ForceHideControls)
					this.Maid.GiveItems(
						() => mediaSpace.removeEventListener("mouseover", MarkCoverArtHover),
						() => mediaSpace.removeEventListener("mouseout", UnmarkCoverArtHover),
						() => globalThis.removeEventListener("mouseover", allowMovement),
						() => globalThis.removeEventListener("mouseout", disallowMovement),
						() => globalThis.removeEventListener("mousemove", checkMovement),
						() => globalThis.removeEventListener("blur", ForceHideControls)
					)
				}
			}
		}

		// Finally, parent our container
		document.body.appendChild(container)

		// Handle watching for no-songs
		{
			const CheckForSongExistence = () => {
				if (Song === undefined) {
					this.Close()
				}
			}
			this.Maid.Give(SongChanged.Connect(CheckForSongExistence))
			this.Maid.Give(Timeout(1, CheckForSongExistence))
		}
	}

	// Public Methods
	public Close() {
		// If we are fullscreen, exit out of it
		if (document.fullscreenElement !== null) {
			document.exitFullscreen()
		}

		// If we have a last-page then go there
		if (LastPageLocation !== undefined) {
			return SpotifyHistory.push(LastPageLocation)
		}

		// Otherwise, send us home
		SpotifyHistory.push("/")
	}

	// Deconstructor
	public Destroy() {
		this.Maid.Destroy()
	}
}