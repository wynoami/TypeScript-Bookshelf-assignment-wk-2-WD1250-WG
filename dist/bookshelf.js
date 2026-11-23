/**
 * bookshelf.ts
 *
 * The data layer for the Bookshelf app: the book types, the Book class
 * hierarchy, and the Bookshelf collection (including saving to localStorage).
 * Nothing in this file touches the page's HTML. That lives in main.ts.
 */
// ─── Helpers ──────────────────────────────────────────────────────────────
/** Creates a unique id for a new book. */
function generateId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    // Fallback for older browsers that don't have crypto.randomUUID.
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
// ─── Book classes ─────────────────────────────────────────────────────────
/**
 * The shared parent of every book. It's `abstract`, so you can't create a
 * plain Book. You always create a FictionBook or a NonFictionBook.
 */
export class Book {
    _id;
    _title;
    _author;
    _pages;
    /**
     * @param id Only passed when rebuilding a saved book. New books get a fresh id.
     */
    constructor(title, author, pages, id = generateId()) {
        this._id = id;
        this._title = title;
        this._author = author;
        this._pages = pages;
    }
    get id() {
        return this._id;
    }
    get title() {
        return this._title;
    }
    get author() {
        return this._author;
    }
    get pages() {
        return this._pages;
    }
    /** One-line description, e.g. "Dune by Frank Herbert, 412 pages, Politics - Fiction". */
    getSummary() {
        return `${this._title} by ${this._author}, ${this._pages} pages, ${this.getTypeDetail()}`;
    }
    /** The fields every book shares. `protected`: only subclasses can call it. */
    getBaseData() {
        return { id: this._id, title: this._title, author: this._author, pages: this._pages };
    }
}
export class FictionBook extends Book {
    _theme;
    constructor(title, author, pages, theme, id) {
        super(title, author, pages, id);
        this._theme = theme;
    }
    get theme() {
        return this._theme;
    }
    getTypeDetail() {
        return `${this._theme} - Fiction`;
    }
    toData() {
        return { ...this.getBaseData(), type: "fiction", theme: this._theme };
    }
}
export class NonFictionBook extends Book {
    _subject;
    constructor(title, author, pages, subject, id) {
        super(title, author, pages, id);
        this._subject = subject;
    }
    get subject() {
        return this._subject;
    }
    getTypeDetail() {
        return `${this._subject} - Non-Fiction`;
    }
    toData() {
        return { ...this.getBaseData(), type: "non-fiction", subject: this._subject };
    }
}
// ─── Type guards ──────────────────────────────────────────────────────────
/** True if the value is exactly "fiction" or "non-fiction". */
export function isBookType(value) {
    return value === "fiction" || value === "non-fiction";
}
/**
 * Checks that an unknown value (e.g. something parsed from localStorage)
 * really has the shape of a saved book before we trust it.
 */
export function isBookData(value) {
    if (typeof value !== "object" || value === null) {
        return false;
    }
    const candidate = value;
    const hasBaseFields = typeof candidate.id === "string" &&
        typeof candidate.title === "string" &&
        typeof candidate.author === "string" &&
        typeof candidate.pages === "number" &&
        Number.isFinite(candidate.pages);
    if (!hasBaseFields) {
        return false;
    }
    if (candidate.type === "fiction") {
        return typeof candidate.theme === "string";
    }
    if (candidate.type === "non-fiction") {
        return typeof candidate.subject === "string";
    }
    return false;
}
/** Narrows a Book to a FictionBook. */
export function isFictionBook(book) {
    return book instanceof FictionBook;
}
/** Narrows a Book to a NonFictionBook. */
export function isNonFictionBook(book) {
    return book instanceof NonFictionBook;
}
/** Turns a saved plain object back into a real FictionBook or NonFictionBook. */
export function createBookFromData(data) {
    switch (data.type) {
        case "fiction":
            return new FictionBook(data.title, data.author, data.pages, data.theme, data.id);
        case "non-fiction":
            return new NonFictionBook(data.title, data.author, data.pages, data.subject, data.id);
        default: {
            // If a new BookType is ever added and not handled above, this line
            // stops compiling. That's TypeScript reminding us to handle it.
            const unhandled = data;
            throw new Error(`Unknown book type: ${JSON.stringify(unhandled)}`);
        }
    }
}
// ─── Bookshelf ────────────────────────────────────────────────────────────
const DEFAULT_STORAGE_KEY = "typescript-bookshelf:books";
/** Holds the books and keeps them saved in localStorage. */
export class Bookshelf {
    storageKey;
    books = [];
    constructor(storageKey = DEFAULT_STORAGE_KEY) {
        this.storageKey = storageKey;
    }
    /** Total number of books on the shelf. */
    get count() {
        return this.books.length;
    }
    /** A copy of the books, so outside code can't change the shelf by accident. */
    getBooks() {
        return [...this.books];
    }
    addBook(book) {
        this.books.push(book);
        this.save();
    }
    /** Removes the book with this id. Returns true if a book was removed. */
    removeBook(id) {
        const countBefore = this.books.length;
        this.books = this.books.filter((book) => book.id !== id);
        const removed = this.books.length < countBefore;
        if (removed) {
            this.save();
        }
        return removed;
    }
    /**
     * Books whose title or author contains the query. Case-insensitive and
     * partial ("harr" matches "Harry Potter"). An empty query returns every book.
     */
    search(query) {
        const needle = query.trim().toLowerCase();
        if (needle === "") {
            return this.getBooks();
        }
        return this.books.filter((book) => book.title.toLowerCase().includes(needle) ||
            book.author.toLowerCase().includes(needle));
    }
    getBooksByAuthor(author) {
        return this.books.filter((book) => book.author === author);
    }
    /** The book with the most pages, or `undefined` if the shelf is empty. */
    getLongestBook() {
        if (this.books.length === 0) {
            return undefined;
        }
        return this.books.reduce((longest, current) => current.pages > longest.pages ? current : longest);
    }
    /** Average page count, rounded. 0 for an empty shelf (instead of NaN). */
    getAveragePages() {
        if (this.books.length === 0) {
            return 0;
        }
        const totalPages = this.books.reduce((total, book) => total + book.pages, 0);
        return Math.round(totalPages / this.books.length);
    }
    getBookSummaries() {
        return this.books.map((book) => book.getSummary());
    }
    /**
     * Loads saved books from localStorage and returns how many loaded.
     * Missing or damaged data is skipped with a console warning, never thrown.
     */
    load() {
        let raw;
        try {
            raw = localStorage.getItem(this.storageKey);
        }
        catch (error) {
            console.warn("Bookshelf: couldn't read from localStorage.", error);
            return 0;
        }
        if (raw === null) {
            return 0; // nothing saved yet
        }
        let parsed;
        try {
            parsed = JSON.parse(raw);
        }
        catch {
            console.warn("Bookshelf: saved data isn't valid JSON, so starting with an empty shelf.");
            return 0;
        }
        if (!Array.isArray(parsed)) {
            console.warn("Bookshelf: saved data isn't a list, so starting with an empty shelf.");
            return 0;
        }
        const validBooks = parsed.filter(isBookData);
        if (validBooks.length < parsed.length) {
            console.warn(`Bookshelf: skipped ${parsed.length - validBooks.length} damaged saved book(s).`);
        }
        this.books = validBooks.map(createBookFromData);
        return this.books.length;
    }
    /** Saves every book to localStorage as plain JSON objects. */
    save() {
        try {
            const data = this.books.map((book) => book.toData());
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        }
        catch (error) {
            // `error` is `unknown` in TypeScript, so narrow it before reading .message
            const message = error instanceof Error ? error.message : String(error);
            console.error(`Bookshelf: couldn't save books (${message}).`);
        }
    }
}
//# sourceMappingURL=bookshelf.js.map