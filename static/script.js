const faqs = document.querySelectorAll(".faq-item");
let textarea = document.querySelector("#user-input-hidden")
let textareaUser = document.querySelector("#user-input")
let maxChar = document.querySelector('.maximal-characters')
let dropArea;
let isDoc = false;
let isDrag = false;
let file; //this is a global variable and we'll use it inside multiple functions
let jsonResponse;
let offset;
let lengths;

suggestionText();
limitText();
placeholder();
textFormatBtn();

function textFormatBtnContent() {
    navigator.clipboard.writeText(textareaUser.innerText)
        .catch(err => {
            console.error('Could not copy text to clipboard: ', err);
            // alert('Failed to copy text to clipboard.');
    });
}

function textFormatBtnContent2() {
    textareaUser.innerText = '';
    textarea.value = '';
}

function textFormatBtn() {
    document.querySelector('.copy-btn').addEventListener('click', textFormatBtnContent);
    document.querySelector('.delete-btn').addEventListener('click', textFormatBtnContent2);

}

function limitinnerText(event) {
    const content = textareaUser.innerText;
    const key = event.key;

    // Allow delete and backspace events
    if (key === 'Delete' || key === 'Backspace') {
        return true;
    }

    // Prevent input if the maximum character limit is reached
    if (content.length >= 20000) {
        event.preventDefault();
        return false;
    }
}

function limitinnerText2(event) {
    // Prevent pasting more than 20,000 characters
    event.preventDefault();

    const clipboardData = event.clipboardData || window.clipboardData;
    const pastedText = clipboardData.getData('text/plain');
    
    // Calculate the remaining characters allowed
    const remainingChars = 20000 - textareaUser.innerText.length;

    // Truncate the pasted text if it exceeds the remaining characters allowed
    const truncatedText = pastedText.slice(0, remainingChars);

    // Append the truncated text to the existing content
    textareaUser.innerText += truncatedText;

    textCount();

    textarea.value = textareaUser.innerText
    sendInputToFlask(textarea.value);
}

function limitText() {
    textareaUser.addEventListener('keydown', limitinnerText);

    textareaUser.addEventListener('paste', limitinnerText2);
}

function placeholderContent() {
    // Remove the placeholder when the div is focused
    if (textareaUser.innerText === 'Type here...') {
        textareaUser.innerText = '';
    }
}

function placeholderContent2() {
    // Add the placeholder back if the div is empty
    if (textareaUser.innerText.trim() === '') {
        textareaUser.innerText = 'Type here...';
    }
}

function placeholder() {
    textareaUser.addEventListener('focus', placeholderContent);
    
    textareaUser.addEventListener('blur', placeholderContent2);
}

$(document).ready(function() {    

    $("#grammar-check-form").submit(function(event) {
        event.preventDefault(); // Prevent the default form submission

        // Get the form data
        textarea.value = textareaUser.innerText
        let formData = $(this).serialize();
        // Create URLSearchParams object from the current URL
        const urlParams = new URLSearchParams(window.location.search);

        if (isDoc) {
            // Get the selected file from the input element

            if (file) {
                // Create a new FormData object and append the file to it
                const formData2 = new FormData();
                formData2.append("file", file);

                // Make the asynchronous POST request to the server using AJAX
                $.ajax({
                    url: "/correctiondoc",
                    type: "POST",
                    data: formData2,
                    processData: false, // Prevent jQuery from processing the data
                    contentType: false, // Prevent jQuery from setting the content type
                    success: function(response) {
                        // Handle the response from the server
                        // alert("success");
                        window.location.href = "http://localhost:5000/download/" + response
                    },
                    error: function(error) {
                        console.error("Error:", error);
                    }
                });
            } else {
                // Display an error message if no file is selected
                alert("Please select a file.");
            }
        } else {
            // Send the POST request using jQuery AJAX
            $.ajax({
                url: "/correction",  // Replace with the URL of your Flask server route
                type: "POST",
                data: formData,
                success: function(response) {
                    // Display the response data in the result div
                    textarea.value = response;
                    textareaUser.innerText = response;
                    sendInputToFlask(textarea.value);
                },
                error: function(error) {
                    alert(formData)
                    // Handle any errors that occurred during the AJAX request
                    console.log('error auto correction');
                }
            });
        }
    });

});

function filesize(elem) {
    document.cookie = `filesize=${elem.files[0].size}`;
}


faqs.forEach(faq => {
    faq.addEventListener("click", () => {
        faq.classList.toggle("active");
    })
})

var contentContainer = document.querySelector(".main-content");

document.addEventListener("DOMContentLoaded", function() {
    let docBtn = document.getElementById("check_document_btn");
    let txtBtn = document.getElementById("check_text_btn");

    docBtn.addEventListener("click", function() {
        if(textareaUser != null) {
            textareaUser.removeEventListener('keydown', limitinnerText);
            textareaUser.removeEventListener('paste', limitinnerText2);
            textareaUser.removeEventListener('focus', placeholderContent);
            textareaUser.removeEventListener('blur', placeholderContent2);
            textareaUser.removeEventListener('input', suggestioninnerText);
            document.querySelector('.copy-btn').removeEventListener('click', textFormatBtnContent);
            document.querySelector('.delete-btn').removeEventListener('click', textFormatBtnContent2);
        }
        
        contentContainer.innerHTML = `
            <label for="document-input" id="lbl-document" class="h-full flex items-center justify-center flex-col bg-white p-4 my-4 rounded-lg min-h-[558px]">
                <img src="static/assets/upload.png" class="h-1/6 pb-3 object-contain">
                <p class="text-2xl font-medium text-[#0F0F0F] font-poppins">Drag & drop files or Browse</p>
                <p class="text-sm text-[#676767] font-poppins">Supported formates: Word & Txt</p>
            </label>
            <input oninput="filesize(this)" type="file" accept=".doc,.docx" name="document" id="document-input">
        `;
        isDoc = true;
        docBtn.classList.add("active");
        txtBtn.classList.remove("active");
        document.querySelector('.text-format').style.visibility = 'hidden'
        document.querySelector(".suggestions-box").innerHTML = `
            <p class="text-grammara1 text-lg font-medium">Suggestion for your text will appear here</p>
            <img src="static/assets/suggestions.png" class="w-9/12 m-auto mr-0"></img>
        `;

        draganddrop();
        clickfile();
    });
        
    txtBtn.addEventListener("click", function() {
        dropArea = document.querySelector("#lbl-document")
        
        if(dropArea != null) {
            dropArea.removeEventListener("dragover", draganddropContent);
            dropArea.removeEventListener("dragleave", draganddropContent2);
            dropArea.removeEventListener("drop", draganddropContent3);
            document.getElementById('document-input').removeEventListener('change', clickfileContent);
        }
        
        contentContainer.innerHTML = `
            <textarea id="user-input-hidden" name="user-input" style="resize:none" maxlength="20000" placeholder="Input text" rows="22" cols="119" class="my-4 p-4 rounded-lg" hidden></textarea>
            <div id="user-input" class="my-4 p-4 rounded-lg border-b-[1px] border-b-[#ccc] min-h-[558px] max-h-[558px] bg-[#FFFFFF] overflow-y-scroll" style="resize:none;" contenteditable="true" required></div>
            <p class="maximal-characters text-right text-grammara1 text-xl font-medium">0/20000 Characters</p>
        `;

        textarea = document.querySelector("#user-input-hidden")
        textareaUser = document.querySelector("#user-input")
        maxChar = document.querySelector('.maximal-characters')
        document.querySelector('.text-format').style.visibility = 'visible'
        isDoc = false;
        docBtn.classList.remove("active");
        txtBtn.classList.add("active");
        
        suggestionText();
        limitText();
        placeholder();
        textFormatBtn();
    });
});

function clickfileContent (event) {
    if(!isDrag) {
        const fileInput = document.getElementById("document-input");
        file = fileInput.files[0];
        finishUpload();
    }
}
    
function clickfile() {
    document.getElementById('document-input').addEventListener('change', clickfileContent);
}

function draganddropContent(event) {
    event.preventDefault(); //preventing from default behaviour
    dropArea.classList.add("active");
}

function draganddropContent2 () {
    dropArea.classList.remove("active");
}

function draganddropContent3 (event) {
    event.preventDefault(); //preventing from default behaviour
    //getting user select file and [0] this means if user select multiple files then we'll select only the first one
    file = event.dataTransfer.files[0];
    isDrag = true;
    finishUpload();
}

function draganddrop() {
    //selecting all required elements
    dropArea = document.querySelector("#lbl-document")

    //If user Drag File Over DropArea
    dropArea.addEventListener("dragover", draganddropContent);
    
    //If user leave dragged File from DropArea
    dropArea.addEventListener("dragleave", draganddropContent2);
    
    //If user drop File on DropArea
    dropArea.addEventListener("drop", draganddropContent3);
}

function finishUpload() {
    contentContainer.innerHTML = `
        <div class="flex flex-col h-full items-center w-full bg-white my-4 p-4 rounded-lg justify-center">
            <img src="static/assets/checkmark.png" class="w-1/6 p-4">
            <p class="text-2xl font-medium text-[#10B981] font-poppins text-center">Document Uploaded, Click the Auto Correct Button to Proceed</p>
        </div>
    `;
}

function textCount() {
    maxChar.innerHTML = textareaUser.innerText.length + '/20000 Characters'
}

function suggestioninnerText() {
    let timeoutId

    textCount();

    clearTimeout(timeoutId);
    timeoutId = setTimeout(function() {
        textarea.value = textareaUser.innerText
        sendInputToFlask(textarea.value);
    }, 3000);
}

function suggestionText() {
    textareaUser.addEventListener('input', suggestioninnerText);
}

function sendInputToFlask(inputText) {
    // console.log(inputText)

    $.ajax({
        url: '/suggestion',
        type: 'POST',
        data: { textData: inputText },
        success: function(response) {
            jsonResponse = response;
            document.querySelector(".suggestions-box").innerHTML = generateSuggestions(response, inputText);
            clickSuggestions();
            // resultElement.innerText = response.result;
        }, error: function(error) {
            // alert(formData)
            // Handle any errors that occurred during the AJAX request
            console.log('error send input to flask');
        }
    });
}

let suggestionsSum = [0,];

function generateSuggestions(data, text) {
    let html = '';
    let sum = 0;

    for (let i = 0; i < data["matches"].length; i++) {
        offset = data["matches"][i]["offset"]
        lengths = data["matches"][i]["length"]
        let replacementCount = data["matches"][i]["replacements"].length

        html += `<ul class="suggestions-list flex flex-col rounded-lg p-2 border-2 cursor-pointer">`
        html += '<p class="text-xl">' + text.substring(offset, offset + lengths) + '</p>'
        html += '<p class="text-sm">' + data["matches"][i]["message"] + '</p>'
        html += `<div class="suggestions-items flex gap-8 mt-2">`
        for (let j = 0; j <= 3; j++) {
            if(j == replacementCount || j == 3) {
                sum += (j);
                suggestionsSum.push(sum);
                break
            }
            html += `<li class="suggestions-item text-white bg-grammara1 px-4 py-1 rounded-lg cursor-pointer">`;
            html += data["matches"][i]["replacements"][j]["value"];
            html += `</li>`
        }
        html += `</div>`
        html += `
            <div class="suggestions-button mt-5 mx-auto mr-0">
                <li class="ignore-button text-white bg-[#DC2626] px-4 py-1 rounded-lg w-fit cursor-pointer">Ignore</li>
                <li class="done-button text-white bg-[#22C55E] px-4 py-1 rounded-lg w-fit cursor-pointer">Done</li>
            </div>
        `
        html += '</ul>';
    }

    // console.log(suggestionsSum)
    return html; 
}

// let suggestionIndex = 0
// let newWordsLength = 0
// let oldWordsLength = 0
let suggestionLists;
let itemsContainer;
let items;
let suggestionsBox;
let doneBtns;
let ignoreBtns;
let suggestionsBtn;
let text;
let textLength;
let oldText;

function clickSuggestions() {
    let suggestionIndex = 0
    let newWordsLength = 0
    let oldWordsLength = 0

    suggestionsBox = document.querySelector(".suggestions-box")
    suggestionLists = document.querySelectorAll(".suggestions-box .suggestions-list")
    itemsContainer = document.querySelectorAll(".suggestions-box .suggestions-list .suggestions-items")
    items = document.querySelectorAll(".suggestions-box .suggestions-list .suggestions-items .suggestions-item")
    doneBtns = document.querySelectorAll(".suggestions-box .suggestions-list .done-button")
    ignoreBtns = document.querySelectorAll(".suggestions-box .suggestions-list .ignore-button")
    suggestionsBtns = document.querySelectorAll(".suggestions-box .suggestions-list .suggestions-button")
    oldWordsLength = textarea.value.length;

    suggestionLists.forEach((element, index) => {
        element.addEventListener("click", () => {
            // console.log("suggestionsIndex: " + suggesti  onIndex)

            itemsContainer[suggestionIndex].classList.remove("active")
            suggestionsBtns[suggestionIndex].classList.remove("active")
            suggestionLists[suggestionIndex].classList.remove("active")
            suggestionIndex = index
            setTimeout(() => {
                itemsContainer[suggestionIndex].classList.add("active")
                suggestionsBtns[suggestionIndex].classList.add("active")
                suggestionLists[suggestionIndex].classList.add("active")
                offset = jsonResponse["matches"][suggestionIndex]["offset"]
                lengths = jsonResponse["matches"][suggestionIndex]["length"]
            }, 1)
        })
    });
    
    text = textarea.value
    textLength = text.length
    oldText = text

    items.forEach((element, index) => {
        element.addEventListener("click", () => {
            let tempIndex = index - suggestionsSum[suggestionIndex];

            // console.log("text: " + text + " " + textLength)
            // console.log("oldlength: " + oldWordsLength)
            // console.log("newlength: " + newWordsLength)
            // console.log("---------------------------")
            
            textarea.value = substring_replace(text, jsonResponse["matches"][suggestionIndex]["replacements"][tempIndex]["value"], offset, lengths)
            textareaUser.innerText = textarea.value
            lengths = jsonResponse["matches"][suggestionIndex]["length"].length
            // console.log("index: " + index)
            // console.log("offset: " + offset)
            // console.log("length: " + lengths)
        })
    });

    doneBtns.forEach((element, index) => {
        element.addEventListener("click", () => {
            text = textarea.value
            textLength = text.length
            newWordsLength = (textLength - oldWordsLength)
            oldWordsLength = textLength

            suggestionsBox.childNodes[index].classList.add("removed");
            // suggestionsBox.removeChild(suggestionsBox.children[index])

            let tempLength = jsonResponse["matches"].length;

            for(let i = 0; i < tempLength; i++) {
                let tempOffset = jsonResponse["matches"][i]["offset"]
                
                if(tempOffset > offset) {
                    jsonResponse["matches"][i]["offset"] += newWordsLength;
                }
            }

            oldText = text;
            
            if(suggestionsBox.childElementCount == document.querySelectorAll('.suggestions-list.removed').length) {
                document.querySelector(".suggestions-box").innerHTML = `
                    <p class="text-grammara1 text-lg font-medium">Suggestion for your text will appear here</p>
                    <img src="static/assets/suggestions.png" class="w-9/12 m-auto mr-0"></img>
                `;
                textarea.value = textareaUser.innerText
                sendInputToFlask(textarea.value);
            }
        })        
    })

    ignoreBtns.forEach((element, index) => {
        element.addEventListener("click", () => {
            suggestionsBox.childNodes[index].classList.add("removed");
            // suggestionsBox.removeChild(suggestionsBox.children[index])
            textarea.value = oldText
            textareaUser.innerText = oldText

            if(suggestionsBox.childElementCount == document.querySelectorAll('.suggestions-list.removed').length) {
                document.querySelector(".suggestions-box").innerHTML = `
                    <p class="text-grammara1 text-lg font-medium">Suggestion for your text will appear here</p>
                    <img src="static/assets/suggestions.png" class="w-9/12 m-auto mr-0"></img>
                `;
                textarea.value = textareaUser.innerText
                sendInputToFlask(textarea.value);
            }
        })
    })
}

function substring_replace(text, replacement, start, length) {
    let finalString = "";

    finalString += text.substring(0, start)
    finalString += replacement
    finalString += text.substring(start + length, text.length)

    
    return finalString;
}