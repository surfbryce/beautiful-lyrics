// https://open.spotify.com/get_access_token
type RetrievedAuthorizationToken = {
	clientId: string;
	accessToken: string;
	accessTokenExpirationTimestampMs: number;
	isAnonymous: boolean;
}

// https://api.spotify.com/v1/search?q=isrc:${recordCode}&type=track
namespace RecordReleasesSpace {
	type ExternalUrls = {
		spotify: string;
	};

	type Image = {
		height: number;
		url: string;
		width: number;
	};

	type Artist = {
		external_urls: ExternalUrls;
		href: string;
		id: string;
		name: string;
		type: string;
		uri: string;
	};

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
	};

	type Release = {
		album: Album;
		artists: Artist[];
		available_markets: string[];
		disc_number: number;
		duration_ms: number;
		explicit: boolean;
		external_ids: {
			isrc: string;
		};
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
	};

	type Releases = {
		href: string;
		items: Release[];
		limit: number;
		next: null | string;
		offset: number;
		previous: null | string;
		total: number;
	};

	type Data = {
		tracks: Releases;
	};

	export type Self = Data
}

namespace RetrievedLyricsSpace {
	type Line = {
		startTimeMs: string,
		words: string,
		syllables: any[], // Similarly, I am not sure what the elements of this array look like
		endTimeMs: string
	}

	type SongColors = {
		background: number,
		text: number,
		highlightText: number
	}

	type SyncType = ("SYLLABLE_SYNCED" | "LINE_SYNCED" | "UNSYNCED")

	type SongLyrics = {
		syncType: SyncType,
		lines: Line[],
		provider: string,
		providerLyricsId: string,
		providerDisplayName: string,
		syncLyricsUri: string,
		isDenseTypeface: boolean,
		alternatives: any[], // I am not sure what the elements of this array look like, so for now I'll just put any
		language: string,
		isRtlLanguage: boolean,
		fullscreenAction: string
	}

	type LyricsData = {
		lyrics: SongLyrics,
		colors: SongColors,
		hasVocalRemoval: boolean
	}

	export type LyricSyncType = SyncType
	export type LyricLines = Line[]
	export type Self = LyricsData
}

// Export our types
export type RecordReleases = RecordReleasesSpace.Self
export type RetrievedLyrics = RetrievedLyricsSpace.Self
export type LyricLines = RetrievedLyricsSpace.LyricLines
export type LyricSyncType = RetrievedLyricsSpace.LyricSyncType
export type {RetrievedAuthorizationToken}