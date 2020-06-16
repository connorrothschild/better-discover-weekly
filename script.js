// var token = {};

function init() {
	var token = getAccessToken();
	console.log('Access token: ' + token);

	var userId = getUserId(token);
	console.log('User ID: ' + userId);

	var topArtistsShortTerm = getTopArtists(token, 'short_term');
	console.log(topArtistsShortTerm);

	var topArtistsLongTerm = getTopArtists(token, 'long_term');
	console.log(topArtistsLongTerm);

	document
		.getElementById('yourTopArtists')
		.appendChild(makeArtistList(topArtistsShortTerm.names, topArtistsShortTerm.images));
	document
		.getElementById('yourRecommendedArtists')
		.appendChild(makeArtistList(topArtistsLongTerm.names, topArtistsLongTerm.images));

	var relatedArtists = getRelatedArtists(token, topArtistsShortTerm.ids);
	console.log(relatedArtists);
}

/**
 * @function getAccessToken Gets the Spotify access token from the URL and returns it. 
 * @return {string} {Spotify access token}
 */
function getAccessToken() {
	// Get authorization token
	var hashString = location.hash;
	var myRe = /^#access_token=.+?(?=&)/g;
	var result = myRe.exec(hashString.toString())[0];
	token = result.slice(14);
	return token;
}

/**
 * @function getUserId Performs a GET request to Spotify's API to get the userid associated with the access token. 
 * @param  {string} accessToken {Spotify access token}
 * @return {string} {Spotify User Id}
 */
function getUserId(accessToken) {
	var userId = '';
	$.ajax({
		url     : 'https://api.spotify.com/v1/me',
		type    : 'GET',
		async   : false,
		headers : {
			Authorization : 'Bearer ' + accessToken
		},
		success : function(data) {
			userId = data.id;
		}
	});
	return userId;
}

/**
 * @function getTopArtists Performs a GET request to Spotify's API to get a user's top artists 
 * @param  {string} accessToken {Spotify access token}
 * @return {string} {Spotify User Id}
 */
function getTopArtists(accessToken, term) {
	var userId = '';
	$.ajax({
		url     : 'https://api.spotify.com/v1/me/top/artists?limit=10&time_range=' + term,
		type    : 'GET',
		async   : false,
		headers : {
			Authorization : 'Bearer ' + accessToken
		},
		success : function(data) {
			artist_metadata = data.items;
		}
	});

	var images = [];
	var names = [];
	var urls = [];
	var ids = [];
	var artists = [];

	for (i = 0; i < artist_metadata.length; i++) {
		// for each row, grab images, names, and URLs
		images.push(artist_metadata[i].images[2]);
		names.push(artist_metadata[i].name);
		urls.push(artist_metadata[i].uri);
		ids.push(artist_metadata[i].id);

		artists = { names, images, urls, ids };
	}

	// return artist_metadata;
	return artists;
}

/**
 * @function listRelatedArtists Performs a GET request to Spotify's API to get related artists 
 * @param  {string} accessToken {Spotify access token}
 * @param  {string} artistId {Spotify access token}
 */
function listRelatedArtists(accessToken, artistId) {
	var relatedArtists;
	$.ajax({
		url     : `https://api.spotify.com/v1/artists/${artistId}/related-artists`,
		type    : 'GET',
		async   : false,
		headers : {
			Authorization : 'Bearer ' + accessToken
		},
		success : function(data) {
			relatedArtists = data.artists;
		},
		error   : function(er) {
			console.log(er);
		}
	});

	return relatedArtists;
}

/**
 * @function getRelatedArtists uses the listRelatedArtists function and creates an array of artists
 * @param  {string} accessToken {Spotify access token}
 * @param  {string} artistId {Spotify access token}
 */
function getRelatedArtists(accessToken, artistId) {
	var relatedArtistsDF = [];
	for (i = 0; i < 10; i++) {
		relatedArtistsDF.push(listRelatedArtists(accessToken, artistId[i]));
	}

	return relatedArtistsDF;
}

/**
   * @function createPlaylist Create's a playlist using the Spotify API. 
   * @param  {string} userId       {User ID to create the playlist for}
   * @param  {string} playlistName {Name of the playlist}
   * @param  {string} accessToken  {Spotify access token}
   * @return {string} {Spotify playlist ID of created playlist}
   */
function createPlaylist(userId, playlistName, accessToken) {
	var playlistId;
	$.ajax({
		url     : `https://api.spotify.com/v1/users/${userId}/playlists`,
		type    : 'POST',
		async   : false,
		data    : `{\"name\":\"${playlistName}\", \"public\":false}`,
		headers : {
			Authorization  : 'Bearer ' + accessToken,
			'Content-Type' : 'application/json'
		},
		success : function(data) {
			playlistId = data.id;
		},
		error   : function(er) {
			console.log(er);
		}
	});
	return playlistId;
}

/**
   * @function getTrackUri Gets the Spotify track URI by searching a track's name and artist using the Spotify API. 
   * @param  {JSON} songData    {JSON object containing song data. Must have a "songName" and "artistName" values.}
   * @param  {string} accessToken {Spotify access token}
   * @return {string} {Spotify track uri}
   */
function getTrackUri(songData, accessToken) {
	var songName = songData.songName.replace(' ', '%20').concat('%20');
	var artistName = songData.artistName.replace(' ', '%20');
	var query = `q=track:${songName}artist:${artistName}&type=track`;
	var trackUri;
	$.ajax({
		url     : `https://api.spotify.com/v1/search?${query}`,
		type    : 'GET',
		async   : false,
		headers : {
			Authorization  : 'Bearer ' + accessToken,
			'Content-Type' : 'application/json'
		},
		success : function(data) {
			trackUri = data.tracks.items[0].uri;
		},
		error   : function(er) {
			console.log(er);
		}
	});
	return trackUri;
}
/**
   * @function addToPlaylist
   * @param  {string} playlistId  {Spotify playlist Id of playlist to add songs to}
   * @param  {Array} songUris    {Array of song uris to add to playlist}
   * @param  {type} accessToken {Spotify access token}
   * @return 
   */
function addToPlaylist(playlistId, songUris, accessToken) {
	var jsonData = { uris: songUris };
	$.ajax({
		url     : `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
		type    : 'POST',
		async   : false,
		data    : JSON.stringify(jsonData),
		headers : {
			Authorization  : 'Bearer ' + accessToken,
			'Content-Type' : 'application/json'
		},
		success : function(data) {
			console.log(data);
		},
		error   : function(er) {
			console.log(er);
		}
	});
}

//// POPULATE COLUMNS ////

function makeArtistList(names, images) {
	// Create the list element:
	var list = document.createElement('ul');

	for (var i = 0; i < names.length; i++) {
		// Create the list item:
		var div = document.createElement('div');

		var image = document.createElement('img');

		image.src = images[i].url;
		image.width = 60;
		image.height = 60;
		image.style = 'vertical-align: middle';

		var text = document.createTextNode(' ' + names[i]);

		// Set its contents:
		div.appendChild(image);
		div.appendChild(text);

		div.className = 'artists';

		// Add it to the list:
		list.appendChild(div);
	}

	// Finally, return the constructed list:
	return list;
}

// to do:
// populate the middle row (recommendations).
// will need to compute if the user has ever listened to a given artist
// consider: all 10 images in one row, for each artist
