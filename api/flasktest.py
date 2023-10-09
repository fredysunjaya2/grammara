from flask import Flask, render_template, request, send_from_directory, redirect, url_for, abort, after_this_request, jsonify
from docx import Document
from docx.shared import RGBColor
from docx.enum.text import WD_COLOR_INDEX
import threading

import requests
import json
import sys
import os
import time

app = Flask(__name__)

UPLOAD_FOLDER = 'tempDocx'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config["ALLOWED_EXT"] = ["doc", "docx"]
app.config["MAXSIZE"] = 60 * 1024
app.config["DOWNLOADED"] = False
app.config["TEMPFILENAME"] = ""
app.config["DOC"] = True
app.config["isDoc"] = False

suggestions = None

def substr_replace(string, replacement, start, length):
    return string[:start] + replacement + string[start + length:]

def allowed_doc(filename):
    if not "." in filename:
        return False
    
    ext = filename.rsplit(".", 1)[1]

    if ext.lower() in app.config["ALLOWED_EXT"]:
        return True
    else:
        return False

def allowed_size(filesize):
    if int(filesize) <= app.config["MAXSIZE"]:
        return True
    else:
        return False

def charParagraph(paragraph):
    paragraphText = ""

    for char in paragraph.text:
        paragraphText += char

    return paragraphText

def requestAPI(text):
    # Set the URL of the LanguageTool API
    url = 'https://api.languagetool.org/v2/check'

    # Set the language parameter (e.g., 'en' for English)
    language = 'en-US'

    # Set any additional parameters required by the API
    params = {
        'text': text,
        'language': language
    }

    # Make the request to the API
    response = requests.get(url, params=params)

    # Retrieve the response content in json
    return response.json()

def autocorrect(text):
    result = requestAPI(text)

    # print(json.dumps(result))

    # Process the result as needed
    wrongCount = len(result["matches"]) 
    newWordsLength = 0
    oldWordsLength = len(text)
    if  wrongCount != 0:
        for i in range(wrongCount):
            newWordsLength += len(text) - oldWordsLength
            oldWordsLength = len(text)
            offset = result["matches"][i]["offset"] + newWordsLength
            replacementLength = result["matches"][i]["length"]

            if(len(result["matches"][i]["replacements"]) != 0):
                replacement = result["matches"][i]["replacements"][0]["value"]
            else:
                replacement = text[offset:length]
            
            newWords = substr_replace(text, replacement, offset, replacementLength)
            text = newWords

    return text
    
def readDoc(files):
    # The os.path.join() function in Python is used to concatenate multiple path components intelligently and construct a valid path string for the current operating system.
    filename = files.filename

    doc = Document(files)

    for paragraph in doc.paragraphs:
        print(len(paragraph.text))
        # paragraphText = charParagraph(paragraph)
        response = requestAPI(paragraph.text)
        wrongCount = len(response["matches"]) 
        newWordsLength = 0
        oldWordsLength = len(paragraph.text)

        if wrongCount != 0:
            for i in range(wrongCount):
                totalLength = 0
                newWordsLength += len(paragraph.text) - oldWordsLength
                oldWordsLength = len(paragraph.text)
                offset = response["matches"][i]["offset"] + newWordsLength
                replacementLength = response["matches"][i]["length"]
                replacement = response["matches"][i]["replacements"][0]["value"]
                wordsToReplace = paragraph.text[offset:offset + replacementLength]
                
                # print(response["matches"][i]["offset"])
                # print(replacementLength)
                # print(newWordsLength)
                # print(wordsToReplace)
                # print(oldWordsLength)
                inlines = paragraph.runs
                # Loop added to work with runs (strings with same style)
                # print(paragraphText)
                for inline in inlines:
                    # print("inline Length:" + len(inline.text))
                    if wordsToReplace in inline.text:
                        # print("here")
                        newOffset = offset - totalLength
                        newText = substr_replace(inline.text, replacement, newOffset, replacementLength)
                        inline.text = newText
                        break
                    
                    totalLength += (len(inline.text))
                    # print("totalLength:", totalLength)

                # paragraphText = paragraph.text

    doc.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))


@app.route("/download/<docname>")
def getFile(docname):
    path = app.config['UPLOAD_FOLDER']
    # print("inside getFile")
    try:
        # the as_attachment=True parameter. This will force the client to download the file instead of displaying it in the browser.
        def delete_file():
            time.sleep(1)  # Delay the deletion to ensure the file is closed
            os.remove(path + "/" + docname)

        # Start the deletion thread
        deletion_thread = threading.Thread(target=delete_file)
        deletion_thread.start()

        # print("before send from directory")

        return send_from_directory(path, docname, as_attachment=False)
    except FileNotFoundError:
        abort(404)

@app.route("/correction", methods=['POST'])
def correctionProcess():
    text = request.form.get("user-input")
    text = autocorrect(text)
    print(text)
    return text

@app.route("/suggestion", methods=['POST'])
def suggestionProcess():
    text = request.form['textData']
    suggestions = requestAPI(text)
    return suggestions

@app.route("/correctiondoc", methods=['POST'])
def correctionProcessDoc():    
    # print(request.files["document"])
    # print(request.form["user-input"])
    print("success")

    if not allowed_size(request.cookies.get("filesize")):
        return redirect(request.url)
    
    files = request.files["file"]
    filename = files.filename

    if filename == "":
        return redirect(request.url)

    if not allowed_doc(filename):
        return redirect(request.url)

    readDoc(files)
    
    return filename


@app.route("/", methods=['POST', 'GET'])
def hello_world():

    return render_template("index.html")


# if __name__ == '__main__':
#     app.run()

# {% ... %} for Statements

# {{ ... }} for Expressions to print to the template output

# {# ... #} for Comments not included in the template output