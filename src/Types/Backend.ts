namespace SpotifyTrackInformationSpace {
	type ExternalUrls = {
		spotify: string;
	}
	
	type ExternalIds = {
		isrc: string;
	}
	
	type Image = {
		height: number;
		url: string;
		width: number;
	}

	type Artist = {
		external_urls: ExternalUrls;
		href: string;
		id: string;
		name: string;
		type: string;
		uri: string;
	}

	type Album = {
		album_type: string;
		artists: Artist[];
		available_markets: string[];
		external_urls: ExternalUrls;
		href: string;
		id: string;
		images: Image[];
		name: string;
		release_date: string;
		release_date_precision: string;
		total_tracks: number;
		type: string;
		uri: string;
	}

	type TrackInformation = {
		album: Album;
		artists: Artist[];
		available_markets: string[];
		disc_number: number;
		duration_ms: number;
		explicit: boolean;
		external_ids: ExternalIds;
		external_urls: ExternalUrls;
		href: string;
		id: string;
		is_local: boolean;
		name: string;
		popularity: number;
		preview_url: string;
		track_number: number;
		type: string;
		uri: string;
	}

	export type Self = TrackInformation
}

type SpotifyLine = {
	startTimeMs: string,
	words: string,
	syllables: any[], // Similarly, I am not sure what the elements of this array look like
	endTimeMs: string
}
type SpotifyLines = SpotifyLine[]

type SongLyricsData = (
	{
		Source: "AppleMusic";
		ReleaseId: number;
		Content: string;
	}
	| {
		Source: "Spotify";
		ReleaseId: string;
		Content: SpotifyLines;
	}
)

export type {SongLyricsData}
export type SpotifyTrackInformation = SpotifyTrackInformationSpace.Self