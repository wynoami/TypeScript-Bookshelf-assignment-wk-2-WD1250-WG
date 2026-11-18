const button = document.querySelector("input[type=button]");
const fictionRadioButton = document.querySelector("#fiction-radio");
const nonFictionRadioButton = document.querySelector("#non-fiction-radio");
const themeLabel = document.querySelector("#theme-label");
const subjectLabel = document.querySelector("#subject-label");
const themeInput = document.querySelector("#theme-input");
const subjectInput = document.querySelector("#subject-input");
const form = document.querySelector("form");
const ul = document.querySelector("ul");
const bookshelf = new Bookshelf();

button.addEventListener("click", () => {
    const { title, author, pages, type, theme, subject } = form;
    let book;

    if (type.value === "fiction") {
        book = new FictionBook(
            capitalize(title.value.trim()),
            capitalize(author.value.trim()),
            pages.value.trim(),
            capitalize(theme.value.trim())
        );
    } else {
        book = new NonFictionBook(
            capitalize(title.value.trim()),
            capitalize(author.value.trim()),
            pages.value.trim(),
            capitalize(subject.value.trim())
        );
    }

    // either wipe our default or remove all nodes from ul
    if (ul.children.length === 0) {
        // wipe out default text
        ul.textContent = "";
    } else {
        while (ul.hasChildNodes()) {
            ul.removeChild(ul.lastChild);
        }
    }

    bookshelf.addBook(book);

    // loop through bookshelf and add li items based on bookshelf entries
    for (const summary of bookshelf.getBookSummaries()) {
        const li = document.createElement("li");
        li.textContent = summary;
        ul.appendChild(li);
    }
});

fictionRadioButton.addEventListener("click", () => {
    subjectLabel.style.display = "none";
    subjectInput.style.display = "none";
    subjectInput.value = "";
    themeLabel.style.display = "block";
    themeInput.style.display = "block";
});

nonFictionRadioButton.addEventListener("click", () => {
    themeLabel.style.display = "none";
    themeInput.style.display = "none";
    themeInput.value = "";
    subjectLabel.style.display = "block";
    subjectInput.style.display = "block";
});

const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};
