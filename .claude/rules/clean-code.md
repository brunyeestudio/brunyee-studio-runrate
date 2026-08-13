# clean-code

## Clean Code Best Practices

| Principle   | Description                    |
| ----------- | ------------------------------ |
| Readability | Code is read more than written |
| Simplicity  | Simple is better than complex  |
| Consistency | Follow established patterns    |
| Testability | Write code that's easy to test |

- (standard) Use descriptive names
- (standard) Use consistent naming patterns
- (standard) Don't repeat yourself, extract common logic
- (standard) Use SOLID principles, single responsibility, dependency inversion
- (functions) Keep functions small and focused
- (functions) Use early returns
- (errors) Use specific errors
- (errors) Handle errors at the right level
- (comments) Code should be self-documenting
- (comments) Use comments for Why, not What
- (structure) Group related code
- (structure) Conform to the repository's project structure

## Simplicity First

Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

## Surgical Changes

Touch only what you must. Clean up only your own mess.

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

The test: Every changed line should trace directly to the user's request
