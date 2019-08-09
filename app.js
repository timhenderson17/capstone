const express = require('express');
const app = express();
const path = require('path');
const router = express.Router();
var unirest = require('unirest');
const music = require('musicmatch')({ apikey: "d3b0896968fa558b0050974e580c2136" });
var bodyParser = require('body-parser');
var SpotifyWebApi = require('spotify-web-api-node');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
  }));

app.use(express.static(path.join(__dirname, 'src')));

var spotify = new SpotifyWebApi({
    clientId: '6c98dc4e42ef4dbf95bc37d30e139c1f',
    clientSecret: '4fe9eb5bec11406fb1101d9f3125877b',
    redirectUri: 'http://localhost:3000/'
  });

spotify.clientCredentialsGrant()
  .then(function(data) {
    console.log('The access token expires in ' + data.body['expires_in']);
    console.log('The access token is ' + data.body['access_token']);

    // Save the access token so that it's used in future calls
    spotify.setAccessToken(data.body['access_token']);
  }, function(err) {
    console.log('Something went wrong when retrieving an access token', err.message);
  });

router.get('/login',function(req,res){
    var scopes = 'user-read-private user-read-email';
    res.redirect('https://accounts.spotify.com/authorize' +
      '?response_type=code' +
      '&client_id=' + '6c98dc4e42ef4dbf95bc37d30e139c1f' +
      (scopes ? '&scope=' + encodeURIComponent(scopes) : '') +
      '&redirect_uri=' + encodeURIComponent('http://localhost:3000/'));
});

router.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + 'index.html'));
})


app.get('/ass', async function(req, res, next) {
    //if (req.method == "POST") {
        console.log(req.query.artists);
        artists = req.query.artists;
        spotify_ids = ["", "", ""];
        songs = ["", "", ""];
        try {
        await searchArtist(artists[0], 0);
        await searchArtist(artists[1], 1);
        await searchArtist(artists[2], 2);
        await setTimeout(async function() {
            console.log(spotify_ids);
            await getSongs(spotify_ids[0], 0);
            await getSongs(spotify_ids[1], 1);
            await getSongs(spotify_ids[2], 2);
            await setTimeout(async function() {
                sendToPython();
            }, 500);
        }, 500);
        } catch (err) {
            console.log(err);
        }
        res.send("Successfully received data");
    //}
    //next();
})

//add the router
app.use('/', router);
app.listen(process.env.port || 2000);
/*
unirest.get("https://musixmatchcom-musixmatch.p.rapidapi.com/wsr/1.1/track.lyrics.get?track_id=15449912")
.header("X-RapidAPI-Key", "d3b0896968fa558b0050974e580c2136")
.end(function (result) {
  console.log(result.status, result.headers, result.body);
});
*/

var songs = ["", "", ""];
var artists = [];
var spotify_ids = [];

async function searchArtist(artist, artist_num) {
    console.log("ARTISTS:" + artist);
    if (artist != "NULL") {
        spotify.searchArtists(artist).then(
            function(data) {
                spotify_ids[artist_num] = data.body.artists.items[0].id;
            },
            function(err) {
                console.error(err);
            }
        );
    } else {
        spotify_ids.push("NULL");
    }
}

async function getSongs(spotify_id, artist_num) {
    console.log(spotify_id + "hello");
    if (spotify_id != "NULL" && spotify_id != "") {
        spotify.getArtistTopTracks(spotify_id, 'US').then(
            function(data) {
                tracks = data.body.tracks;
                var albums = [];
                for (track in tracks) {
                    album = tracks[track].album.id;
                    console.log("ALBUM    ::;; %j ", album);
                    if (!albums.includes(album)) {
                        albums.push(album);
                        spotify.getAlbumTracks(album).then(
                            function(data) {
                                album_songs = data.body.items;
                                for (song in album_songs) {
                                    songs[artist_num] += "\"" + album_songs[song].name + "\"" +  ",";
                                }
                            },
                            function(err) {
                                console.error(err + "error: 1" + albums[album].id);
                            }
                        );
                    }
                    setTimeout(function(){console.log("songs:     " + songs[artist_num]);}, 1000);
                }
            },
            function(err) {
                console.error(err + "error: 2" + spotify_id);
            }
        )
    }
}

async function sendToPython() {
    console.log("artists :::" + artists);
    console.log("songs :::" + songs);
    const spawn = require("child_process").spawn;
    const pythonProcess = spawn('python',
        ["./cmd_line_parser.py", artists[0], artists[1], artists[2], songs[0], songs[1], songs[2]]);

    pythonProcess.stdout.on('data', (data) => {
        console.log(data.toString());
    });
}


console.log('Running at Port 3000');