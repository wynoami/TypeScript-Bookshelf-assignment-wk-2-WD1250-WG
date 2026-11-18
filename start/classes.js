class Book {
    #title;
    #author;
    #pages;

    constructor(title, author, pages) {
        this.#title = title;
        this.#author = author;
        this.#pages = pages;
    }

    getSummary() {
        return `${this.#title} by ${this.#author}, ${this.#pages} pages`;
    }

    get author() {
        return this.#author;
    }

    get pages() {
        return this.#pages;
    }
}

class FictionBook extends Book {
    #theme;

    constructor(title, author, pages, theme) {
        super(title, author, pages);
        this.#theme = theme;
    }

    getSummary() {
        return `${super.getSummary()}, ${this.#theme} - Fiction`;
    }
}

class NonFictionBook extends Book {
    #subject;

    constructor(title, author, pages, subject) {
        super(title, author, pages);
        this.#subject = subject;
    }

    getSummary() {
        return `${super.getSummary()}, ${this.#subject} - Non-Fiction`;
    }
}

class Bookshelf {
    #books;

    constructor() {
        this.#books = [];
    }

    addBook(book) {
        this.#books.push(book);
    }

    getBooksByAuthor(author) {
        return this.#books.filter((book) => book.author === author);
    }

    getLongestBook() {
        return this.#books.reduce((longest, current) => {
            return current.pages > longest.pages ? current : longest;
        }, this.#books[0]);
    }

    getAveragePages() {
        const totalPages = this.#books.reduce(
            (acc, current) => acc + current.pages,
            0
        );

        return Math.round(totalPages / this.#books.length);
    }

    getBookSummaries() {
        return this.#books.map((book) => book.getSummary());
    }
}