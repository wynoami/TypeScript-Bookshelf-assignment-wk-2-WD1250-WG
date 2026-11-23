/**
 * bookshelf.ts
 *
 * The data layer for the Bookshelf app: the book types, the Book class
 * hierarchy, and the Bookshelf collection (including saving to localStorage).
 * Nothing in this file touches the page's HTML. That lives in main.ts.
 */

// ─── Types ────────────────────────────────────────────────────────────────

/** The two kinds of book the app supports. A union of string literals. */
export type BookType = "fiction" | "non-fiction";

/** Fields every book has, whatever its type. */
export interface BaseBookData {
    id: string;
    title: string;
    author: string;
    pages: number;
}

/** A fiction book as a plain object (the shape saved to localStorage). */
export interface FictionBookData extends BaseBookData {
    type: "fiction";
    theme: string;
}

/** A non-fiction book as a plain object (the shape saved to localStorage). */
export interface NonFictionBookData extends BaseBookData {
    type: "non-fiction";
    subject: string;
}

/**
 * Any saved book. Both members have a `type` field with a different literal
 * value, so TypeScript can tell them apart. This is called a discriminated union.
 */
export type BookData = FictionBookData | NonFictionBookData;

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Creates a unique id for a new book. */
function generateId(): string {
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
export abstract class Book {
    private readonly _id: string;
    private readonly _title: string;
    private readonly _author: string;
    private readonly _pages: number;

    /**
     * @param id Only passed when rebuilding a saved book. New books get a fresh id.
     */
    constructor(title: string, author: string, pages: number, id: string = generateId()) {
        this._id = id;
        this._title = title;
        this._author = author;
        this._pages = pages;
    }

    public get id(): string {
        return this._id;
    }

    public get title(): string {
        return this._title;
    }

    public get author(): string {
        return this._author;
    }

    public get pages(): number {
        return this._pages;
    }

    /** The type-specific part of the summary, e.g. "Adventure - Fiction". */
    public abstract getTypeDetail(): string;

    /** Converts the book into a plain object so it can be saved as JSON. */
    public abstract toData(): BookData;

    /** One-line description, e.g. "Dune by Frank Herbert, 412 pages, Politics - Fiction". */
    public getSummary(): string {
        return `${this._title} by ${this._author}, ${this._pages} pages, ${this.getTypeDetail()}`;
    }

    /** The fields every book shares. `protected`: only subclasses can call it. */
    protected getBaseData(): BaseBookData {
        return { id: this._id, title: this._title, author: this._author, pages: this._pages };
    }
}

export class FictionBook extends Book {
    private readonly _theme: string;

    constructor(title: string, author: string, pages: number, theme: string, id?: string) {
        super(title, author, pages, id);
        this._theme = theme;
    }

    public get theme(): string {
        return this._theme;
    }

    public override getTypeDetail(): string {
        return `${this._theme} - Fiction`;
    }

    public override toData(): FictionBookData {
        return { ...this.getBaseData(), type: "fiction", theme: this._theme };
    }
}

export class NonFictionBook extends Book {
    private readonly _subject: string;

    constructor(title: string, author: string, pages: number, subject: string, id?: string) {
        super(title, author, pages, id);
        this._subject = subject;
    }

    public get subject(): string {
        return this._subject;
    }

    public override getTypeDetail(): string {
        return `${this._subject} - Non-Fiction`;
    }

    public override toData(): NonFictionBookData {
        return { ...this.getBaseData(), type: "non-fiction", subject: this._subject };
    }
}

// ─── Type guards ──────────────────────────────────────────────────────────

/** True if the value is exactly "fiction" or "non-fiction". */
export function isBookType(value: unknown): value is BookType {
    return value === "fiction" || value === "non-fiction";
}

/**
 * Checks that an unknown value (e.g. something parsed from localStorage)
 * really has the shape of a saved book before we trust it.
 */
export function isBookData(value: unknown): value is BookData {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const candidate = value as Record<string, unknown>;
    const hasBaseFields =
        typeof candidate.id === "string" &&
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
export function isFictionBook(book: Book): book is FictionBook {
    return book instanceof FictionBook;
}

/** Narrows a Book to a NonFictionBook. */
export function isNonFictionBook(book: Book): book is NonFictionBook {
    return book instanceof NonFictionBook;
}

/** Turns a saved plain object back into a real FictionBook or NonFictionBook. */
export function createBookFromData(data: BookData): Book {
    switch (data.type) {
        case "fiction":
            return new FictionBook(data.title, data.author, data.pages, data.theme, data.id);
        case "non-fiction":
            return new NonFictionBook(data.title, data.author, data.pages, data.subject, data.id);
        default: {
            // If a new BookType is ever added and not handled above, this line
            // stops compiling. That's TypeScript reminding us to handle it.
            const unhandled: never = data;
            throw new Error(`Unknown book type: ${JSON.stringify(unhandled)}`);
        }
    }
}

// ─── Bookshelf ────────────────────────────────────────────────────────────

const DEFAULT_STORAGE_KEY = "typescript-bookshelf:books";

/** Holds the books and keeps them saved in localStorage. */
export class Bookshelf {
    private books: Book[] = [];

    constructor(private readonly storageKey: string = DEFAULT_STORAGE_KEY) {}

    /** Total number of books on the shelf. */
    public get count(): number {
        return this.books.length;
    }

    /** A copy of the books, so outside code can't change the shelf by accident. */
    public getBooks(): Book[] {
        return [...this.books];
    }

    public addBook(book: Book): void {
        this.books.push(book);
        this.save();
    }

    /** Removes the book with this id. Returns true if a book was removed. */
    public removeBook(id: string): boolean {
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
    public search(query: string): Book[] {
        const needle = query.trim().toLowerCase();
        if (needle === "") {
            return this.getBooks();
        }
        return this.books.filter(
            (book) =>
                book.title.toLowerCase().includes(needle) ||
                book.author.toLowerCase().includes(needle)
        );
    }

    public getBooksByAuthor(author: string): Book[] {
        return this.books.filter((book) => book.author === author);
    }

    /** The book with the most pages, or `undefined` if the shelf is empty. */
    public getLongestBook(): Book | undefined {
        if (this.books.length === 0) {
            return undefined;
        }
        return this.books.reduce((longest, current) =>
            current.pages > longest.pages ? current : longest
        );
    }

    /** Average page count, rounded. 0 for an empty shelf (instead of NaN). */
    public getAveragePages(): number {
        if (this.books.length === 0) {
            return 0;
        }
        const totalPages = this.books.reduce((total, book) => total + book.pages, 0);
        return Math.round(totalPages / this.books.length);
    }

    public getBookSummaries(): string[] {
        return this.books.map((book) => book.getSummary());
    }

    /**
     * Loads saved books from localStorage and returns how many loaded.
     * Missing or damaged data is skipped with a console warning, never thrown.
     */
    public load(): number {
        let raw: string | null;
        try {
            raw = localStorage.getItem(this.storageKey);
        } catch (error) {
            console.warn("Bookshelf: couldn't read from localStorage.", error);
            return 0;
        }

        if (raw === null) {
            return 0; // nothing saved yet
        }

        let parsed: unknown;
        try {
            parsed = JSON.parse(raw);
        } catch {
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
    private save(): void {
        try {
            const data: BookData[] = this.books.map((book) => book.toData());
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (error) {
            // `error` is `unknown` in TypeScript, so narrow it before reading .message
            const message = error instanceof Error ? error.message : String(error);
            console.error(`Bookshelf: couldn't save books (${message}).`);
        }
    }
}
