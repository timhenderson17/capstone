import re
from nltk.corpus import stopwords
from nltk.stem.porter import *
import gensim
stemmer = PorterStemmer()

def clean_text(raw_text):
    # remove non-letters and remove artist explanations
    letters_only_text = raw_text
    letters_only_text = re.sub("[\(\[].*?[\)\]]", "", letters_only_text)
    letters_only_text = re.sub("[^a-zA-Z]", " ", letters_only_text)
    # lowercase
    lowercase_words = letters_only_text.lower().split()
    # set stopwords
    stop_words = set(stopwords.words("english"))
    # remove stopwords
    final_words = [w for w in lowercase_words if not w in stop_words]
    # stem the words using porter stemmer
    #final_words = " ".join(final_words)
    # final_words = gensim.utils.simple_preprocess(final_words, deacc=False, min_len=4, max_len=20)
    #stemmed_words = [stemmer.stem(w) for w in final_words]
    # turn back into a string
    return(" ".join(final_words))
