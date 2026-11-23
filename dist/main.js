/**
 * main.ts
 *
 * Connects the Bookshelf data layer to the page: finds the HTML elements,
 * handles events, validates the form, and draws the book list.
 */
import { Bookshelf, FictionBook, NonFictionBook, isBookType, isFictionBook, } from "./bookshelf.js";
// ─── Finding elements ─────────────────────────────────────────────────────
/**
 * A querySelector that never returns null. If an element is missing from the
 * HTML, we stop right away with a clear message instead of failing later.
 */
function getElement(selector) {
    const element = document.querySelector(selector);
    if (element === null) {
        throw new Error(`Bookshelf: required element "${selector}" is missing from index.html.`);
    }
    return element;
}
const form = getElement("#book-form");
const titleInput = getElement("#title-input");
const authorInput = getElement("#author-input");
const pagesInput = getElement("#pages-input");
const fictionRadio = getElement("#fiction-radio");
const nonFictionRadio = getElement("#non-fiction-radio");
const themeField = getElement("#theme-field");
const themeInput = getElement("#theme-input");
const subjectField = getElement("#subject-field");
const subjectInput = getElement("#subject-input");
const formError = getElement("#form-error");
const searchInput = getElement("#search-input");
const bookCounter = getElement("#book-counter");
const shelfStats = getElement("#shelf-stats");
const emptyMessage = getElement("#empty-message");
const bookList = getElement("#book-list");
// ─── App state ────────────────────────────────────────────────────────────
const bookshelf = new Bookshelf();
/** Id of the book added most recently, so only that row plays the "added" animation. */
let newlyAddedId = null;
/** Must match the transition time for `.book.is-removing` in style.css. */
const REMOVE_ANIMATION_MS = 200;
// ─── Small helpers ────────────────────────────────────────────────────────
function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}
/** "1 book", "3 books" */
function pluralize(count, word) {
    return `${count} ${word}${count === 1 ? "" : "s"}`;
}
/**
 * Creates an element with a class. The return type follows the tag:
 * createElement("li", ...) gives an HTMLLIElement, "button" an HTMLButtonElement, and so on.
 */
function createElement(tag, className) {
    const element = document.createElement(tag);
    element.className = className;
    return element;
}
/**
 * Reads a text field from FormData. `data.get()` can return a string, a File,
 * or null, so we narrow to a string and fall back to "".
 */
function readText(data, name) {
    const value = data.get(name);
    return typeof value === "string" ? value.trim() : "";
}
function getSelectedType() {
    return nonFictionRadio.checked ? "non-fiction" : "fiction";
}
// ─── Form: theme / subject switching ──────────────────────────────────────
/** Shows the theme field for fiction, or the subject field for non-fiction. */
function showFieldsFor(type) {
    const isFiction = type === "fiction";
    setFieldVisible(themeField, themeInput, isFiction);
    setFieldVisible(subjectField, subjectInput, !isFiction);
}
function setFieldVisible(wrapper, input, visible) {
    wrapper.classList.toggle("is-hidden", !visible); // CSS animates the change
    wrapper.inert = !visible; // hidden fields can't be reached with Tab
    input.disabled = !visible; // disabled inputs are left out of FormData
    if (!visible) {
        input.value = "";
        input.removeAttribute("aria-invalid");
    }
}
// ─── Form: validation ─────────────────────────────────────────────────────
function validateForm(data) {
    const rawType = data.get("type");
    const type = isBookType(rawType) ? rawType : "fiction";
    const detailName = type === "fiction" ? "theme" : "subject";
    const title = capitalize(readText(data, "title"));
    const author = capitalize(readText(data, "author"));
    const pagesText = readText(data, "pages");
    const pages = Number(pagesText);
    const detail = capitalize(readText(data, detailName));
    const errors = [];
    if (title === "") {
        errors.push({ field: "title", message: "Please enter a title." });
    }
    if (author === "") {
        errors.push({ field: "author", message: "Please enter an author." });
    }
    if (pagesText === "") {
        errors.push({ field: "pages", message: "Please enter the number of pages." });
    }
    else if (!Number.isInteger(pages) || pages < 1) {
        errors.push({ field: "pages", message: "Pages must be a whole number of 1 or more." });
    }
    if (detail === "") {
        errors.push({ field: "detail", message: `Please enter a ${detailName}.` });
    }
    if (errors.length > 0) {
        return { ok: false, errors };
    }
    return { ok: true, values: { title, author, pages, type, detail } };
}
/** Which input on the page goes with each field name. */
function inputFor(field) {
    switch (field) {
        case "title":
            return titleInput;
        case "author":
            return authorInput;
        case "pages":
            return pagesInput;
        case "detail":
            return getSelectedType() === "fiction" ? themeInput : subjectInput;
    }
}
function showErrors(errors) {
    const list = document.createElement("ul");
    for (const error of errors) {
        const item = document.createElement("li");
        item.textContent = error.message;
        list.append(item);
        inputFor(error.field).setAttribute("aria-invalid", "true");
    }
    formError.replaceChildren(list);
    formError.hidden = false;
    const firstError = errors[0];
    if (firstError !== undefined) {
        inputFor(firstError.field).focus();
    }
}
function clearErrors() {
    formError.hidden = true;
    formError.replaceChildren();
    for (const input of form.querySelectorAll("[aria-invalid]")) {
        input.removeAttribute("aria-invalid");
    }
}
function createBook(values) {
    return values.type === "fiction"
        ? new FictionBook(values.title, values.author, values.pages, values.detail)
        : new NonFictionBook(values.title, values.author, values.pages, values.detail);
}
// ─── Rendering ────────────────────────────────────────────────────────────
/**
 * Returns the text with every match of the query wrapped in <mark>.
 * Built with DOM nodes, not innerHTML, so typed text can never become HTML.
 */
function highlightMatches(text, query) {
    const fragment = document.createDocumentFragment();
    const needle = query.trim().toLowerCase();
    if (needle === "") {
        fragment.append(text);
        return fragment;
    }
    const lowerText = text.toLowerCase();
    let cursor = 0;
    let matchIndex = lowerText.indexOf(needle);
    while (matchIndex !== -1) {
        if (matchIndex > cursor) {
            fragment.append(text.slice(cursor, matchIndex)); // text before the match
        }
        const mark = document.createElement("mark");
        mark.textContent = text.slice(matchIndex, matchIndex + needle.length); // keeps original capitals
        fragment.append(mark);
        cursor = matchIndex + needle.length;
        matchIndex = lowerText.indexOf(needle, cursor);
    }
    if (cursor < text.length) {
        fragment.append(text.slice(cursor)); // text after the last match
    }
    return fragment;
}
/** Builds the <li> for one book. */
function createBookItem(book, query) {
    const item = createElement("li", "book");
    item.classList.add(isFictionBook(book) ? "book--fiction" : "book--non-fiction");
    if (book.id === newlyAddedId) {
        item.classList.add("is-new");
    }
    item.dataset.id = book.id;
    const title = createElement("span", "book-title");
    title.append(highlightMatches(book.title, query));
    const author = createElement("span", "book-author");
    author.append(highlightMatches(book.author, query));
    const heading = createElement("p", "book-heading");
    heading.append(title, " by ", author);
    const meta = createElement("p", "book-meta");
    meta.textContent = `${book.pages} pages · ${book.getTypeDetail()}`;
    const info = createElement("div", "book-info");
    info.append(heading, meta);
    const removeButton = createElement("button", "remove-button");
    removeButton.type = "button";
    removeButton.dataset.action = "remove";
    removeButton.textContent = "Remove";
    removeButton.setAttribute("aria-label", `Remove ${book.title}`);
    item.append(info, removeButton);
    return item;
}
function renderStats() {
    const longest = bookshelf.getLongestBook(); // Book | undefined
    if (longest === undefined) {
        shelfStats.hidden = true;
        return;
    }
    shelfStats.hidden = false;
    shelfStats.textContent =
        `Average length: ${bookshelf.getAveragePages()} pages · ` +
            `Longest: ${longest.title} (${longest.pages} pages)`;
}
/** Redraws the list, counter, stats and empty message from the current state. */
function render() {
    const query = searchInput.value;
    const isSearching = query.trim() !== "";
    const results = bookshelf.search(query);
    const total = bookshelf.count;
    bookList.replaceChildren(...results.map((book) => createBookItem(book, query)));
    newlyAddedId = null; // the animation has been applied; don't replay it next render
    bookCounter.textContent = isSearching
        ? `Showing ${results.length} of ${pluralize(total, "book")}`
        : `${pluralize(total, "book")} on the shelf`;
    renderStats();
    if (total === 0) {
        emptyMessage.textContent = "No items in the bookshelf";
        emptyMessage.hidden = false;
    }
    else if (results.length === 0) {
        emptyMessage.textContent = `No books match "${query.trim()}".`;
        emptyMessage.hidden = false;
    }
    else {
        emptyMessage.hidden = true;
    }
}
// ─── Removing books ───────────────────────────────────────────────────────
function removeBookWithAnimation(item, button, id) {
    button.disabled = true; // stop double-clicks
    item.classList.add("is-removing");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => {
        bookshelf.removeBook(id);
        render();
    }, reduceMotion ? 0 : REMOVE_ANIMATION_MS);
}
// ─── Event listeners ──────────────────────────────────────────────────────
form.addEventListener("submit", (event) => {
    event.preventDefault(); // stop the page from reloading
    const result = validateForm(new FormData(form));
    if (!result.ok) {
        showErrors(result.errors);
        return;
    }
    clearErrors();
    const book = createBook(result.values);
    bookshelf.addBook(book);
    newlyAddedId = book.id;
    // Clear the form but keep the chosen book type for the next entry.
    const { type } = result.values;
    form.reset();
    (type === "fiction" ? fictionRadio : nonFictionRadio).checked = true;
    showFieldsFor(type);
    searchInput.value = ""; // make sure the new book is visible
    render();
    titleInput.focus();
});
// One listener on the form handles both radio buttons.
form.addEventListener("change", (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.name === "type" && isBookType(target.value)) {
        showFieldsFor(target.value);
    }
});
// Clear a field's red error outline as soon as the user starts fixing it.
form.addEventListener("input", (event) => {
    if (event.target instanceof HTMLInputElement) {
        event.target.removeAttribute("aria-invalid");
    }
});
// Real-time search: redraw on every keystroke.
searchInput.addEventListener("input", () => {
    render();
});
// One listener on the list handles every Remove button (event delegation).
bookList.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
        return;
    }
    const button = event.target.closest('button[data-action="remove"]');
    const item = button?.closest("li[data-id]");
    const id = item?.dataset.id;
    if (!button || !item || id === undefined) {
        return;
    }
    removeBookWithAnimation(item, button, id);
});
// ─── Start up ─────────────────────────────────────────────────────────────
bookshelf.load();
showFieldsFor(getSelectedType());
render();
//# sourceMappingURL=main.js.map