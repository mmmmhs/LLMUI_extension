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
