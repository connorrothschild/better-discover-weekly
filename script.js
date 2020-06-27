var token = {};

var authorizationError = document.getElementById('authorizationError');
var mainContent = document.getElementById('mainContent');
var nowPlaying = document.getElementById('nowPlaying');
var songName = document.getElementById('songName');
var artistName = document.getElementById('artistName');

function accessTryCatch() {
	try {
		token = getAccessToken();
		console.log('Access token: ' + token);
	} catch (error) {
		console.log('Access token not found.');
		authorizationError.style = 'display:block';
		mainContent.style = 'display:none';
	}
}

function init() {
	accessTryCatch();

	var userId = getUserId(token);
	// console.log('User ID: ' + userId);

	var topArtistsShortTerm = getTopArtists(token, 'short_term');
	// console.log(topArtistsShortTerm);

	// var topArtistsLongTerm = getTopArtists(token, 'long_term');
	// console.log(topArtistsLongTerm);

	document.getElementById('yourTopArtists').appendChild(makeArtistList(topArtistsShortTerm));
	// document.getElementById('yourRecommendedArtists').appendChild(makeArtistList(topArtistsLongTerm));

	var relatedArtists = getRelatedArtists(token, topArtistsShortTerm);
	// console.log(relatedArtists);

	document.getElementById('yourRecommendedArtists').appendChild(makeRecommendedList(relatedArtists));
	// console.log(document.getElementsByClassName('artistImage'));
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
	var artist_metadata;
	$.ajax({
		url     : 'https://api.spotify.com/v1/me/top/artists?limit=10&time_range=' + term,
		type    : 'GET',
		async   : false,
		headers : {
			Authorization : 'Bearer ' + accessToken
		},
		success : function(data) {
			artist_metadata = data.items;
			artists = artist_metadata;
		}
	});

	return artists;
}

/**
 * @function getArtistTopTracks Performs a GET request to Spotify's API to get an artist's top tracks
 * @param  {string} accessToken {Spotify access token}
 * @param  {string} artistId {artist ID}
 */
function getArtistTopTracks(accessToken, artistId) {
	var topTracks;
	$.ajax({
		url     : `https://api.spotify.com/v1/artists/${artistId}/top-tracks?country=US`,
		type    : 'GET',
		async   : false,
		headers : {
			Authorization : 'Bearer ' + accessToken
		},
		success : function(data) {
			topTracks = data;
		},
		error   : function(er) {
			console.log(er);
		}
	});

	return topTracks;
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
 * @param  {string} data {artist dataframe}
 */
function getRelatedArtists(accessToken, data) {
	var relatedArtistsDF = [];
	for (i = 0; i < 10; i++) {
		relatedArtistsDF.push(listRelatedArtists(accessToken, data[i].id));
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
			// console.log(data);
		},
		error   : function(er) {
			console.log(er);
		}
	});
}

//// POPULATE COLUMNS ////

/**
   * @function makeArtistList
   * @param  {Array} data {Dataset. In this case, nested array of recommended artists.}
   * @return 
   */
function makeArtistList(data) {
	// Create the list element:
	var list = document.createElement('ul');

	for (var i = 0; i < data.length; i++) {
		// Create the list item:
		var div = document.createElement('div');

		var image = document.createElement('img');

		image.src = data[i].images[2].url;
		image.width = 60;
		image.height = 60;
		image.style = 'vertical-align: middle';

		var text = document.createTextNode(' Based on ' + data[i].name + '... ');

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

/**
   * @function makeRecommendedList
   * @param  {Array} data {Dataset. In this case, nested array of recommended artists.}
   * @return 
   */
function makeRecommendedList(data) {
	// Create the list element:
	var div = document.createElement('div');

	for (var i = 0; i < data.length; i++) {
		// Create the list item:
		// console.log(data[i]);

		artist = data[i];

		var listOfImages = document.createElement('div');

		for (var j = 0; j < 5; j++) {
			var audioDiv = document.createElement('a');
			audioDiv.className = 'audioDiv';
			var image = document.createElement('img');

			image.src = artist[j].images[2].url;

			image.song = getArtistTopTracks(token, artist[j].id);

			image.width = 60;
			image.height = 60;

			image.id = image.song.tracks[0].preview_url;

			image.artist = artist[j].name;
			image.song = image.song.tracks[0].name;

			image.name = image.song + ', by ' + image.artist;

			image.className = 'artistImage';

			// Set its contents:
			audioDiv.append(image);

			audioDiv.onmouseover = mouseOver;
			audioDiv.onmouseout = mouseOut;

			listOfImages.appendChild(audioDiv);
		}

		listOfImages.className = 'recommendationArtists';

		div.appendChild(listOfImages);
	}

	var audio = new Audio();
	audio.load();

	function playAudio(src) {
		audio.src = src;
		audio.play();
	}

	function stopAudio(audio) {
		audio.pause();
		audio.currentTime = 0;
	}

	function mouseOver(e) {
		playAudio(e.originalTarget.attributes.id.nodeValue);
		// console.log(e.originalTarget.artist + ', by ' + e.originalTarget.song);
		nowPlaying.style = 'display: block';
		artistName.textContent = e.originalTarget.artist;
		songName.textContent = e.originalTarget.song;
	}

	function mouseOut() {
		stopAudio(audio);
		nowPlaying.style = 'display: none';
	}

	div.onmouseover = mouseOver(event);
	div.onmouseout = mouseOut();

	// Finally, return the constructed list:
	return div;
}
