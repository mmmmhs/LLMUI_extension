document.addEventListener('DOMContentLoaded', () => {
    // const querybtn = document.getElementById('query');
    // const findbtn = document.getElementById('find');
    const input = document.getElementById('input');
    const output = document.getElementById('output'); 
    const s1 = document.getElementById('s1');
    const s2 = document.getElementById('s2');
    const kwtext = document.getElementById('kw');
    const host = 'http://localhost:8000';
    // const host = 'http://localhost:8080';
    const ask_button = document.getElementById('ask_button');
    const input_question = document.getElementById('input_question');
    const highlight_title = document.getElementById('highlight_title');
    
    // read from local storage
    chrome.storage.local.get(['keywords'], function(result) {
        if (result.keywords != undefined) {
            console.log('keywords in local storage currently is ' + result.keywords);

            highlight_title.className = 'visible';

            var keywords = result.keywords;
            for (var i = 0; i < keywords.length; i++)
            {
                var kw = keywords[i];
                kwtext.innerHTML += "<li class='fw-medium btn btn-light shadow-sm m-1 border' role='button' id='li_" + i + "'><a>" + kw + "</a></li>";
                // TODO
                var li = document.getElementById('li_' + i);
                li.addEventListener('click', () => {
                    // remove highlight
                    console.log(li.id, li.innerHTML);
                    if (highlight != '') {
                        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                            chrome.scripting.executeScript({
                                target : {tabId : tabs[0].id},
                                func : remove_highlight,
                                args : [highlight]
                            });
                        });
                    }
                    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                        chrome.scripting.executeScript({
                            target : {tabId : tabs[0].id},
                            func : find_in_text_node,
                            args : [kw]
                        });
                    });
                    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                        chrome.scripting.executeScript({
                            target : {tabId : tabs[0].id},
                            func : find_in_title,
                            args : [kw]
                        });
                    });
                    highlight = kw;
                });
            }
        }
    });

    var highlight = '';
    
    // check if suggestion is stored in local storage
    chrome.storage.local.get(['s1'], function(result){
        if (result.s1 != undefined && result.s1 != 'Loading...') {
            console.log('suggested question one in local storage currently is ' + result.s1);
            s1.innerHTML = result.s1;
            s1.addEventListener('click', () => {
                input.value = s1.innerHTML;
            });
        }
    });

    chrome.storage.local.get(['s2'], function(result){
        if (result.s2 != undefined && result.s2 != 'Loading...') {
            console.log('suggested question one in local storage currently is ' + result.s2);
            s2.innerHTML = result.s2;
            s2.addEventListener('click', () => {
                input.value = s2.innerHTML;
            });
        }
    });

    // check if input_question is stored in local storage
    chrome.storage.local.get(['input_question'], function(result) {
        if (result.input_question != undefined) {
            console.log('input_question in local storage currently is ' + result.input_question);
            input_question.innerHTML = result.input_question;
        }
    });

    // check if output is stored in local storage
    chrome.storage.local.get(['output'], function(result) {
        if (result.output != undefined) {
            console.log('output in local storage currently is ' + result.output);
            output.innerHTML = result.output;
        }
    });
    
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

                    // set output in local storage
                    chrome.storage.local.set({'s1': response['questions'][0]}, function() {
                        console.log('suggested question one in localstorage is set to ' + response['questions'][0]);
                    });
                    chrome.storage.local.set({'s2': response['questions'][1]}, function() {
                        console.log('suggested question two in localstorage is set to ' + response['questions'][1]);
                    });

                    s1.addEventListener('click', () => {
                        input.value = s1.innerHTML;
                    });
                    s2.addEventListener('click', () => {
                        input.value = s2.innerHTML;
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
        const host = 'http://localhost:8000';
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

            // 获取之前保存的 URL
        chrome.storage.local.get(['savedUrl'], function(result) {
            if (result.savedUrl !== url) {
                // 如果 URL 不同，清空 'input_question' 和 'output' 和 'keywords'
                chrome.storage.local.set({ 'input_question': '', 'output': '', 's1':'Loading...', 's2':'Loading', 'keywords': '' });
                s1.innerHTML = 'Loading...';
                s2.innerHTML = 'Loading...';
                input_question.innerHTML = '';
                output.innerHTML = '';
                kwtext.innerHTML = '';
                highlight_title.className = 'invisible'; // hide highlight title

                // 可选：更新保存的 URL
                chrome.storage.local.set({ 'savedUrl': url });
            }
        });
        chrome.storage.local.get(['output'], function(result) {
            if (result.output == undefined || result.output == ''){
                chrome.storage.local.set({'input_question': ''});
                input_question.innerHTML = '';
            }
        });
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
                    // re_2 = new RegExp('(<[^>]*>)'+ node_value +'(</[^>]*>)', 'g')
                    // new_value = node_value.replace(re, "<mark class='hlmask_"+ value.replace(/ /g, "_") + "'>" + value +"</mark>")
                    // new_html = node_html.replace(node_value, new_value)
                    // node.innerHTML = new_html;
                    node.style.backgroundColor = "yellow";
                }
            } catch (e) {
                console.log(e);
                console.log(node_value)
            }
        }
    }

    function find_in_title_node(value) {
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
                // if (node.childNodes.length == 1 && node.nodeType == 1 && node.childNodes[0].nodeType == 3) {
                all_nodes.push(node);
                // }
            }
        }
        console.log(all_nodes.length)
        for (var i = 0; i < all_nodes.length; i++) {
            node = all_nodes[i];
            node_html = node.innerHTML;
            // text node
            var re = new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), 'g');
            node_value = node.childNodes[0].nodeValue;
            outer_html = node.outerHTML
            var re = new RegExp('^<a[^>]*title="[^>]*' + value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + '[^>]*"[^>]*>.*?</a>$', 'g');
            try {
                if (outer_html.match(re)) {
                    // re_2 = new RegExp('(<[^>]*>)'+ node_value +'(</[^>]*>)', 'g')
                    // new_value = node_value.replace(re, "<mark class='hlmask_"+ value.replace(/ /g, "_") + "'>" + value +"</mark>")
                    // new_html = node_html.replace(node_value, new_value)
                    // node.innerHTML = new_html;
                    console.log(node)
                    node.childNodes[0].style.backgroundColor = "yellow";
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
    
    function reset_highlight() {
        const allElements = document.querySelectorAll("body *");
    
        allElements.forEach((element) => {
            // Remove the inline background color style
            element.style.backgroundColor = "";
        });
    }
    
    function kw_click(kw) {
        if (highlight != '') {
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                chrome.scripting.executeScript({
                    target : {tabId : tabs[0].id},
                    func : reset_highlight,
                });
            });
        }
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.scripting.executeScript({
                target : {tabId : tabs[0].id},
                func : find_in_text_node,
                args : [kw]
            });
        });
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.scripting.executeScript({
                target : {tabId : tabs[0].id},
                func: find_in_title_node,
                args : [kw]
            });
        });
        highlight = kw;
    }

    function query_mock(url) {
        var li = Array();
        var response = {}
        response['basis'] = ["文件", "保存", "缩小"]
        for (var i = 0; i < 3; i++)
        {
            var kw = response['basis'][i];
            kwtext.innerHTML += "<li class='text' id='li_" + i + "' style='margin-left: 1em;'>" + kw + "</li>";
            var new_li = document.getElementById('li_' + i);
            li.push(new_li)
        }
        document.getElementById('li_0').addEventListener('click', () => {
            kw_click(li[0].innerHTML)
        });
        document.getElementById('li_1').addEventListener('click', () => {
            kw_click(li[1].innerHTML)
        });
        document.getElementById('li_2').addEventListener('click', () => {
            kw_click(li[2].innerHTML)
        });
    }
    
    function query(url) {
        var li = Array();
        var xhr = new XMLHttpRequest();
        xhr.open('GET', host+'/assistant_qa?question=' + input.value + "&url=" + url, true);
        var loadingIndicator = document.getElementById('loadingIndicator');
        loadingIndicator.style.display = 'block';
        kwtext.innerHTML = ""

        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4) {
                loadingIndicator.style.display = 'none';
                if (xhr.status == 200) {
                    var response = JSON.parse(xhr.responseText);
                    output.innerHTML = response['answer'];
                    console.log(response['basis'])
                    // set output in local storage
                    chrome.storage.local.set({'output': response['answer']}, function() {
                        console.log('output in localstorage is set to ' + response['answer']);
                    });

                    // store keywords in local storage
                    chrome.storage.local.set({'keywords': response['basis']}, function() {
                        console.log('keywords in localstorage is set to ' + response['basis']);
                    });
                    for (var i = 0; i < 3; i++)
                    {
                        var kw = response['basis'][i];
                        kwtext.innerHTML += "<li class='fw-medium btn btn-light shadow-sm m-1 border' role='button' id='li_" + i + "'>" + kw + "</li>";
                        var new_li = document.getElementById('li_' + i);
                        li.push(new_li)
                    }
                    document.getElementById('li_0').addEventListener('click', () => {
                        kw_click(li[0].innerHTML)
                    });
                    document.getElementById('li_1').addEventListener('click', () => {
                        kw_click(li[1].innerHTML)
                    });
                    document.getElementById('li_2').addEventListener('click', () => {
                        kw_click(li[2].innerHTML)
                    });
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
                output.innerHTML = ''; // clear output
                var url = tabs[0].url;
                chrome.scripting.executeScript({
                    target : {tabId : tabs[0].id},
                    func : resetHighlight,
                });
                console.log(`query with url ${url} and input value ${input.value}`)
                query(url);
                // query_mock(url);
                input_question.innerHTML = input.value;
                // store input_question in local storage
                chrome.storage.local.set({'input_question': input.value}, function() {
                    console.log('input_question in localstorage  is set to ' + input.value);
                    input.value = '';
                });

            });
        }
    });

    // when ask_button is clicked
    ask_button.addEventListener('click', () => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            output.innerHTML = ''; // clear output
            var url = tabs[0].url;
            chrome.scripting.executeScript({
                target : {tabId : tabs[0].id},
                func : resetHighlight,
            });
            query(url);
            // query_mock(url);
            input_question.innerHTML = input.value;
            // store input_question in local storage
            chrome.storage.local.set({'input_question': input.value}, function() {
                console.log('input_question in localstorage is set to ' + input.value);
                input.value = '';
            });
        });
    });
});