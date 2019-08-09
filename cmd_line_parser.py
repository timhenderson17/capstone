import os
import sys
from lyric_writer import main
from gensim.models import KeyedVectors
import json

graph = {
    "artists": sys.argv[1:4],
    "nodes": [],
    "edges": []
}
print("1")
if os.path.exists("./src/graph.json") :
    os.remove("./src/graph.json")
print("2")
with open("./src/graph.json", 'w') as fp :
    json.dump(graph, fp)
    fp.close()
print("3")
filename = 'GoogleNews-vectors-negative300.bin'
print("loading")
google_model = KeyedVectors.load_word2vec_format(filename, binary = True, limit = 500000)
print("loaded")

for i, arg in enumerate(sys.argv[1:3], start = 4) :
    if arg != "NULL" :
        song_list = sys.argv[i].split(",")
        main(arg, song_list, google_model)

print("Success!")
sys.stdout.flush()

