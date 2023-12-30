document.addEventListener('DOMContentLoaded', () => {
    // const querybtn = document.getElementById('query');
    // const findbtn = document.getElementById('find');
    const input = document.getElementById('input');
    const output = document.getElementById('output'); 
    const s1 = document.getElementById('s1');
    const s2 = document.getElementById('s2');
    const kwtext = document.getElementById('kw');
    const host = 'http://localhost:8000';
    
    kwtext.innerHTML = '';
    var highlight = '';

    // send request to local server
    function get_suggestion(url) {
        var xhr = new XMLHttpRequest();
        xhr.withCredentials = true;
        xhr.open('GET', host+'/suggestion?url=' + url, true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4) {
                if (xhr.status == 200) {
                    // set text of s1 and s2
                    response = JSON.parse(xhr.responseText);
                    s1.innerHTML = response["questions"].split('\n')[0];
                    s2.innerHTML = response["questions"].split('\n')[1];
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
    }

    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        var url = tabs[0].url;
        get_suggestion(url);
    });

    function find(value) {
        var res = window.find(value, false, false, true);
        console.log(res);
    }

    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        //$&表示整个被匹配的字符串
    }

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
            var re = new RegExp(escapeRegExp(value), 'g');
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
        var re = new RegExp('(<a[^>]*title="[^>]*' + escapeRegExp(value) + '[^>]*"[^>]*>)(.*?)(</a>)', 'g');
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


    function query(url) {
        var xhr = new XMLHttpRequest();
        xhr.withCredentials = true;
        xhr.open('GET', host+'/web_qa?question=' + input.value + "&url=" + url, true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4) {
                if (xhr.status == 200) {
                    response = JSON.parse(xhr.responseText);
                    output.innerHTML = response['answer'];
                    for (var i = 0; i < response['basis'].length; i++)
                    {
                        kw = response['basis'][i];
                        kwtext.innerHTML += "<li class='text' id='li_" + i + "'><a href=''>" + kw + "</a></li>";
                        var li = document.getElementById('li_' + i);
                        li.addEventListener('click', () => {
                            // remove highlight
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
                                    func : find_in_title,
                                    args : [kw]
                                });
                            });
                            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                                chrome.scripting.executeScript({
                                    target : {tabId : tabs[0].id},
                                    func : find_in_text_node,
                                    args : [kw]
                                });
                            });
                            highlight = kw;
                        });
                    }
                }
            }
        }
        xhr.send();
    }

    function upload_html() {
        // 获取当前页面的 HTML
        var htmlContent = document.documentElement.outerHTML;

        // 创建一个要发送的对象
        var data = { html: htmlContent };

        // 使用 fetch 发送 POST 请求
        fetch(host+'/upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => {
            console.log('Success:', data);
        })
        .catch((error) => {
            console.error('Error:', error);
        });
    }

    // input enter
    input.addEventListener('keyup', (event) => {
        if (event.key == 'Enter') {
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                var url = tabs[0].url;
                query(url);
            });
        }
    });
});