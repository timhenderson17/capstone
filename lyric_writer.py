import sys
import requests
from bs4 import BeautifulSoup
import numpy as np
import json
import lyricfetcher

from lyric_cleaner import clean_text

def request_song_info(song_title, artist_name):
    base_url = 'https://api.genius.com'
    headers = {'Authorization': 'Bearer ' + 'ou-SxOYX2Yz-oyaQ9jyS-NFNHOCsW9_LPnKyTO1zqHzIbNUclBPE_iCSX9rr6auQ'}
    search_url = base_url + '/search'
    data = {'q': song_title + ' ' + artist_name}
    response = requests.get(search_url, data=data, headers=headers)

    return response

def scrap_song_url(url):
    page = requests.get(url)
    html = BeautifulSoup(page.text, 'html.parser')
    lyrics = html.find('div', class_='lyrics').get_text()

    return lyrics

def fetch_lyrics(song_title, artist_name) :
    # Search for matches in the request response
    response = request_song_info(song_title, artist_name)
    json = response.json()
    remote_song_info = None

    for hit in json['response']['hits']:
        if artist_name.lower() in hit['result']['primary_artist']['name'].lower():
            remote_song_info = hit
            break

    # Extract lyrics from URL if the song was found
    if remote_song_info:
        song_url = remote_song_info['result']['url']
        song_lyrics = scrap_song_url(song_url)

        song_lyrics = clean_text(song_lyrics)
        
        #print(song_title + " : " + song_lyrics)

        return (song_lyrics)
    return None

def main(artist, songs, google_model) :

    matrix = []
    graph = {}

    with open("./src/graph.json") as data_file :
        graph = json.load(data_file)
        data_file.close()
        
    for i, song in enumerate(songs) :
        lyrics = lyricfetcher.get_lyrics('metrolyrics', artist, song)

        #lyrics = clean_text(lyrics)
        print(lyrics)
        if (lyrics != None and lyrics != 404 and lyrics != "404") : 
            matrix.append([artist, song, lyrics])

    for i, song in enumerate(matrix, start = 0) :
        dict = {
            "id": i,
            "name": song[1],
            "artist": song[0]
        }
        graph["nodes"].append(dict)

    for i, song in enumerate(matrix, start = 0) :
        for j, song_2 in enumerate(matrix[:i], start = 0) :
            #try :
            weight = min((google_model.wmdistance(song[2], song_2[2])), 1)
            if (weight == float('inf') or weight == "") :
                weight = 0
            dict = {
                "source": i,
                "target": j,
#               "song 1": song,
#               "song 2": song_2,
                "weight": weight
            }
            if (dict["weight"] == None) :
                dict["weight"] = 0
            graph["edges"].append(dict)
            #except :
            #    pass

    with open('./src/graph.json', 'w') as fp :
        print(json.dumps(graph))
        json.dump(graph, fp)
        fp.close()

        # Read in the file
    #with open('./src/graph_temp.json', 'r') as file :
    #    filedata = file.read()

    # Replace the target string
    #filedata = filedata.replace('Infinity', '0')

    # Write the file out again
    #with open('./src/graph.json', 'w') as file:
    #    file.write(filedata)


