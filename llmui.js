document.addEventListener('DOMContentLoaded', () => {
    // const querybtn = document.getElementById('query');
    // const findbtn = document.getElementById('find');
    const input = document.getElementById('input');
    const answer_title = document.getElementById('answer');
    const output = document.getElementById('output'); 
    const s1 = document.getElementById('s1');
    const s2 = document.getElementById('s2');
    const kwtext = document.getElementById('kw');
    const host = 'http://localhost:8080';
    // const host = 'http://localhost:8000';
    const ask_button = document.getElementById('ask_button');
    
    kwtext.innerHTML = '';
    var highlight = '';
    // send request to local server
    function get_suggestion(url) {
        var xhr = new XMLHttpRequest();
        // xhr.withCredentials = true;
        xhr.open('GET', host+'/assistant_suggestion?url=' + url, true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4) {
                if (xhr.status == 200) {
                    // set text of s1 and s2
                    console.log(xhr.responseText);
                    var response = JSON.parse(xhr.responseText);
                    console.log(response);
                    // console.log(typeof(response["questions"]));
                    s1.innerHTML = response["questions"][0];
                    s2.innerHTML = response["questions"][1];
                    s1.addEventListener('click', () => {
                        input.value = s1.innerHTML;
                        query(url);
                    });
                    s2.addEventListener('click', () => {
                        input.value = s2.innerHTML;
                        query(url);
                    });
                }
            }
        }
        xhr.send();
        console.log("suggestion", url);
    }

    function upload_html(url) {
        var htmlContent = document.documentElement.outerHTML;
        var formData = new FormData();
        const host = 'http://localhost:8080';
        formData.append('html', htmlContent);
        var xhr = new XMLHttpRequest();
        xhr.open('POST', host + '/upload?url=' + url, true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4) {
                if (xhr.status == 200) {
                    console.log(xhr.responseText);
                } else {
                    reject('Upload failed with status: ' + xhr.status);  // 拒绝Promise表示出错
                }
            }
        }
        xhr.send(formData);
    }

    chrome.tabs.query({active: true, currentWindow: true}).then((tabs) => {
        var url = tabs[0].url;
        chrome.scripting.executeScript({
            target : {tabId : tabs[0].id},
            func : upload_html,
            args : [url],
        })
    }).then(() => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            var url = tabs[0].url;
            get_suggestion(url);
        }
    )});

    // chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    //     var url = tabs[0].url;
    //     get_suggestion(url);
    // });

    function find(value) {
        var res = window.find(value, false, false, true);
        console.log(res);
    }

    // function escapeRegExp(string) {
    //     return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    //     //$&表示整个被匹配的字符串
    // }

    function find_in_text_node(value) {
        // go through all nodes 
        var queue = [];
        var all_nodes = [];
        var node = document.documentElement;
        queue.push(node);
        while (queue.length > 0) {
            // console.log(queue.length)
            node = queue.shift();
            if (node.childNodes.length > 0) {
                node.childNodes.forEach((child) => {
                    queue.push(child);
                });
                if (node.childNodes.length == 1 && node.nodeType == 1 && node.childNodes[0].nodeType == 3) {
                    all_nodes.push(node);
                }
            }
        }
        console.log(all_nodes.length)
        for (var i = 0; i < all_nodes.length; i++) {
            node = all_nodes[i];
            node_html = node.innerHTML;
            // text node
            var re = new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), 'g');
            node_value = node.childNodes[0].nodeValue;
            try {
                if (node_value.match(value)) {
                    re_2 = new RegExp('(<[^>]*>)'+ node_value +'(</[^>]*>)', 'g')
                    new_value = node_value.replace(re, "<mark class='hlmask_"+ value.replace(/ /g, "_") + "'>" + value +"</mark>")
                    new_html = node_html.replace(node_value, new_value)
                    node.innerHTML = new_html;
                }
            } catch (e) {
                console.log(e);
                console.log(node_value)
            }
        }
    }
    
    function find_in_title(value) {
        var all_html = document.documentElement.innerHTML;
        // match <a ... title="... value ...">...</a>
        // add <span style="background-color:yellow"> ... </span> to each match
        var re = new RegExp('(<a[^>]*title="[^>]*' + value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + '[^>]*"[^>]*>)(.*?)(</a>)', 'g');
        all_html = all_html.replace(re, "$1<div class='hlmask_"+ value.replace(/ /g, "_") + "' style='height:100%;width:100%;background:rgba(255,255,0,0.5);'>$2</div>$3");
        document.documentElement.innerHTML = all_html;
    }

    function remove_highlight(value) {
        // find all elements with class hlmask
        var all_elements = document.getElementsByClassName('hlmask_'+ value.replace(/ /g, "_"));
        for (var i = 0; i < all_elements.length; i++) {
            var element = all_elements[i];
            children = element.childNodes;
            parent = element.parentNode;
            for (var j = 0; j < children.length; j++) {
                parent.insertBefore(children[j], element);
            }
            parent.removeChild(element);
        }
    }

    function highlight(searchTexts) {
        const allElements = document.querySelectorAll("body *");
    
        // Function to check and highlight an element based on searchText
        const highlightIfMatch = (element, searchText) => {
            const textContent = element.innerText || "";
            const title = element.getAttribute("title") || "";
    
            if (textContent === searchText || title.includes(searchText)) {
            element.style.backgroundColor = "yellow";
            }
        };
    
        // Iterate over each element in the document
        allElements.forEach((element) => {
            // Check each search text for a match
            searchTexts.forEach((searchText) => {
            highlightIfMatch(element, searchText);
            });
        });
    }
    
    function resetHighlight() {
        const allElements = document.querySelectorAll("body *");
    
        allElements.forEach((element) => {
            // Remove the inline background color style
            element.style.backgroundColor = "";
        });
    }
    

    function query(url) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', host+'/assistant_qa?question=' + input.value + "&url=" + url, true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4) {
                if (xhr.status == 200) {
                    var response = JSON.parse(xhr.responseText);
                    answer_title.innerHTML = "Answer: "
                    output.innerHTML = response['answer'];
                    kwtext.innerHTML = ""
                    for (var i = 0; i < response['basis'].length; i++)
                    {
                        var kw = response['basis'][i];
                        kwtext.innerHTML += "<li class='text' id='li_" + i + "'><a href='javascript:void(0);'>" + kw + "</a></li>";
                        var li = document.getElementById('li_' + i);
                        li.addEventListener('click', () => {
                            // remove highlight
                            console.log(li.id, li.innerHTML);
                            if (highlight != '') {
                                chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                                    chrome.scripting.executeScript({
                                        target : {tabId : tabs[0].id},
                                        func : resetHighlight,
                                        // args : [highlight]
                                    });
                                });
                            }
                            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                                chrome.scripting.executeScript({
                                    target : {tabId : tabs[0].id},
                                    func : highlight,
                                    args : [kw]
                                });
                            });
                            // chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                            //     chrome.scripting.executeScript({
                            //         target : {tabId : tabs[0].id},
                            //         func : find_in_text_node,
                            //         args : [kw]
                            //     });
                            // });
                            highlight = kw;
                        });
                    }
                }
            }
        }
        xhr.send();
        console.log(`query with url ${url} and input value ${input.value}`)
    }

    // input enter
    input.addEventListener('keyup', (event) => {
        if (event.key == 'Enter') {
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                var url = tabs[0].url;
                chrome.scripting.executeScript({
                    target : {tabId : tabs[0].id},
                    func : resetHighlight,
                });
                console.log(`query with url ${url} and input value ${input.value}`)
                query(url);
                input.value = '';
            });
        }
    });

    // when ask_button is clicked
    ask_button.addEventListener('click', () => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            var url = tabs[0].url;
            query(url);
            input.value = '';
        });
    });
});