# Console Statement Removal Guide for Agents

## CRITICAL: Proper Console Statement Removal

When removing console statements, follow these rules to avoid syntax errors:

### 1. Complete Statement Removal
**NEVER remove just `console.log` and leave the arguments.**

❌ WRONG:
```javascript
console.log('Debug:', data);
// Becomes:
('Debug:', data);  // SYNTAX ERROR!
```

✅ CORRECT:
```javascript
console.log('Debug:', data);
// Remove entire line or statement
```

### 2. Multi-line Console Statements
**Remove ALL lines of a multi-line console statement, including closing parentheses.**

❌ WRONG:
```javascript
console.log('SQL Schema:', `
  CREATE TABLE users (
    id UUID PRIMARY KEY
  );
`);
// Becomes:
  CREATE TABLE users (
    id UUID PRIMARY KEY
  );
`);  // SYNTAX ERROR!
```

✅ CORRECT:
```javascript
// Remove entire multi-line statement including all content and closing );
```

### 3. Console Statements in Conditionals
**When console is the only statement in a conditional, remove the entire block or add a placeholder.**

❌ WRONG:
```javascript
if (error) {
  console.error('Error:', error);
}
// Becomes:
if (error) {
  );  // SYNTAX ERROR!
}
```

✅ CORRECT:
```javascript
if (error) {
  // Console statement removed
}
// OR remove entire if block if it serves no other purpose
```

### 4. Chained Console Statements
**Remove the entire chain, not just the console part.**

❌ WRONG:
```javascript
data
  .filter(item => item.active)
  .forEach(item => console.log(item));
// Becomes:
data
  .filter(item => item.active)
  .forEach(item => );  // SYNTAX ERROR!
```

✅ CORRECT:
```javascript
data
  .filter(item => item.active)
  .forEach(item => {
    // Console statement removed
  });
```

### 5. Console with Side Effects
**Be careful with console statements that include expressions with side effects.**

```javascript
console.log('Counter:', counter++);
// Should become:
counter++;  // Preserve the side effect
```

### 6. Template Literals
**Remove the entire template literal if it's only used for console.**

❌ WRONG:
```javascript
console.log(`User ${user.name} logged in`);
// Becomes:
(`User ${user.name} logged in`);  // SYNTAX ERROR!
```

✅ CORRECT:
```javascript
// Remove entire line
```

## Detection Patterns

### Find Console Statements
```regex
console\.(log|error|warn|debug|info|trace|dir|table|time|timeEnd|assert|count|group|groupEnd|groupCollapsed)\s*\(
```

### Multi-line Detection
Look for console statements that span multiple lines by checking for:
1. Opening `console.` followed by method name and `(`
2. Find the matching closing `)` (accounting for nested parentheses)
3. Remove everything from `console.` to the final `;` or end of statement

## Verification Steps

After removing console statements:

1. **Check for orphaned syntax:**
   - Standalone `;`
   - Orphaned `);`
   - Template literals without context
   - Empty function bodies that now only have comments

2. **Run syntax check:**
   ```bash
   npx eslint . --ext .js,.jsx,.ts,.tsx
   ```

3. **Test build:**
   ```bash
   npm run build
   ```

## Common Problem Areas

1. **API Routes**: Often have debug logging that spans multiple lines
2. **Error Handlers**: Console.error statements in catch blocks
3. **Development Checks**: Console statements inside development-only conditions
4. **Database Queries**: Multi-line SQL logging
5. **Object Logging**: Pretty-printed object logging that spans many lines

## Safe Removal Process

1. **Parse the AST** if possible to identify complete console statement nodes
2. **Match parentheses** to find complete statements
3. **Check context** to ensure removal won't break surrounding code
4. **Preserve side effects** if the console statement includes them
5. **Clean up empty blocks** left after removal
6. **Verify syntax** after each file is processed

## Example Problem Code

```javascript
// Complex nested console that often breaks
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info:', {
    user: currentUser,
    permissions: currentUser?.permissions || [],
    timestamp: new Date().toISOString()
  });
}

// After BAD removal:
if (process.env.NODE_ENV === 'development') {
  ('Debug info:', {
    user: currentUser,
    permissions: currentUser?.permissions || [],
    timestamp: new Date().toISOString()
  });  // SYNTAX ERROR!
}

// After GOOD removal:
if (process.env.NODE_ENV === 'development') {
  // Debug logging removed
}
```

## Implementation Notes for Agents

1. **Use AST parsing** when possible instead of regex
2. **Process one file at a time** and verify syntax before moving on
3. **Keep track of line numbers** as they change during removal
4. **Test the build** after processing to catch any errors
5. **Have a rollback plan** in case of errors
6. **Consider using a proper JavaScript parser** like Babel or Acorn

## Testing Your Removal

```bash
# After removing console statements
npm run lint
npm run build
npm run test
```

If any of these fail, review the changed files for syntax errors.