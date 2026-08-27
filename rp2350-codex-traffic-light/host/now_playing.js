ObjC.import("Foundation");

function unwrap(value) {
    if (value === undefined || value === null || value.isNil()) return null;
    return ObjC.unwrap(value);
}

function run() {
    const framework = $.NSBundle.bundleWithPath(
        "/System/Library/PrivateFrameworks/MediaRemote.framework"
    );
    if (!framework.load) return JSON.stringify({});

    const request = $.NSClassFromString("MRNowPlayingRequest");
    if (!request) return JSON.stringify({});

    const item = request.localNowPlayingItem;
    const info = item ? item.nowPlayingInfo : null;
    const playerPath = request.localNowPlayingPlayerPath;
    if (!info) return JSON.stringify({});

    function field(name) {
        return unwrap(info.objectForKey(name));
    }

    const client = playerPath ? playerPath.client : null;
    return JSON.stringify({
        app: client ? unwrap(client.displayName) : null,
        title: field("kMRMediaRemoteNowPlayingInfoTitle"),
        artist: field("kMRMediaRemoteNowPlayingInfoArtist"),
        album: field("kMRMediaRemoteNowPlayingInfoAlbum"),
        duration: Number(field("kMRMediaRemoteNowPlayingInfoDuration") || 0),
        elapsed: Number(field("kMRMediaRemoteNowPlayingInfoElapsedTime") || 0),
        rate: Number(field("kMRMediaRemoteNowPlayingInfoPlaybackRate") || 0)
    });
}
