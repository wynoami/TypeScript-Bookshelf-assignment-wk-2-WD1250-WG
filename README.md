# Assignment: TypeScript Bookshelf

## Introduction

You previously built a JavaScript-based bookshelf application that allowed users to add and display books. Now that you've learned TypeScript, you'll enhance that application by converting it to TypeScript and adding new features. This assignment will reinforce your understanding of TypeScript types, classes, and DOM manipulation while building something practical.

### Starter Files

Begin with your completed Bookshelf project (or use the provided solution code) which includes:

- HTML interface for adding books
- CSS styling
- JavaScript classes and DOM manipulation code

## Requirements

Convert the existing Bookshelf application to TypeScript and add new functionality:

### Part 1: TypeScript Conversion

#### Create a new TypeScript project:

- Initialize npm project with `package.json`
- Install TypeScript and required dependencies
- Create a `tsconfig.json` with appropriate settings
- Set up compilation to output to a `/dist` directory

#### Convert existing classes to TypeScript:

- Add proper type annotations to all class properties
- Use access modifiers (`public`/`private`) appropriately
- Implement proper method return types
- Create interfaces for `Book` types if needed
- Ensure proper typing for inheritance between `Book` classes

#### Convert DOM manipulation code:

- Add proper type annotations for DOM elements
- Use correct event types for event listeners
- Implement error handling for null checks
- Properly type form data handling

### Part 2: New Features

#### Implement a Search/Filter System

- Add a search input field to the UI
- Create a search function that filters books by:
    - Title (partial matches)
    - Author (partial matches)
- Update the display in real-time as user types
- Highlight matching text in search results

> **Hint**: When thinking of how to implement this search functionality, consider using the [JavaScript `.filter()` method](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter).

#### Add Additional Functionality

- Implement a book counter that shows total books
- Add ability to remove books from shelf

### Required TypeScript Features

Your implementation must use:

- Proper type annotations for all variables and functions
- Interfaces for defining object shapes
- Class property access modifiers
- Union types where appropriate
- Type narrowing for DOM elements
- Proper event typing
- Error handling for null/undefined values

## Stretch Goals

If you find yourself with extra time, consider adding the following optional functionality:

- Add sorting functionality (by title, author, or pages)
- Implement book categories/tags with filtering
- Add book rating system
- Create custom type guards for book types
- Store books in localStorage with proper typing

## Submission

Submit the following:

- All TypeScript source files
- Compiled JavaScript output
- Updated HTML and CSS files
- README documenting setup and build process

## Conclusion

In this assignment, we successfully transformed a JavaScript application into a type-safe TypeScript implementation while adding new search functionality. By converting the Bookshelf application, we put into practice key TypeScript concepts including class typing, DOM manipulation with proper type annotations, and interface definitions.This project represents an important milestone in your journey with TypeScript, demonstrating how static typing can improve code reliability and maintainability in real-world applications.