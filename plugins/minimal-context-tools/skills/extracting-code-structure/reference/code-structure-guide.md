# Code Structure Exploration

**Goal: Get outline/index of large files without reading entire file.**

## Strategy: Tiered Approach

Try tools in this order (stop when you get what you need):
1. **ast-grep** - Targeted pattern extraction (highest priority, fastest when pattern known)
2. **Language-specific tools** - Best quality, language-aware
   - **Dart/Flutter analyzer** - Comprehensive structure extraction for .dart files
3. **ctags** - Universal fallback, simple
4. **Read file** - Last resort (but now you know it's worth it)

---

# Method 1: ast-grep (Targeted Extraction)

**Best when:** You know what patterns to look for - highest priority

## Dart/Flutter with ast-grep

### Basic Dart patterns
```bash
# List all class definitions
ast-grep -l dart -p 'class $NAME { $$$ }' file.dart

# List all function definitions
ast-grep -l dart -p '$TYPE $NAME($$$) { $$$ }' file.dart

# List all widget classes (Flutter)
ast-grep -l dart -p 'class $NAME extends StatefulWidget { $$$ }' file.dart
ast-grep -l dart -p 'class $NAME extends StatelessWidget { $$$ }' file.dart

# List all imports
ast-grep -l dart -p 'import $PATH' file.dart
ast-grep -l dart -p "import '$PATH';" file.dart

# List all exported declarations
ast-grep -l dart -p 'export $PATH' file.dart

# List all mixin definitions
ast-grep -l dart -p 'mixin $NAME on $SUPER { $$$ }' file.dart
ast-grep -l dart -p 'mixin $NAME { $$$ }' file.dart

# List all extension methods
ast-grep -l dart -p 'extension $NAME on $TYPE { $$$ }' file.dart
```

### Advanced Dart patterns
```bash
# List all async functions
ast-grep -l dart -p 'Future<$TYPE> $NAME($$$) async { $$$ }' file.dart
ast-grep -l dart -p 'Future<void> $NAME($$$) async { $$$ }' file.dart

# List all stream functions
ast-grep -l dart -p 'Stream<$TYPE> $NAME($$$) { $$$ }' file.dart

# List all constructor methods
ast-grep -l dart -p '$NAME($$$);' file.dart | grep -E "^\s*[A-Z]"

# List all static methods
ast-grep -l dart -p 'static $TYPE $NAME($$$) { $$$ }' file.dart

# List all private members (starts with underscore)
ast-grep -l dart -p '$TYPE _$NAME($$$) { $$$ }' file.dart

# Widget build methods
ast-grep -l dart -p 'Widget build(BuildContext context) { $$$ }' file.dart
```

---

# Method 2: Language-Specific Tools

**Best when:** Available and well-supported for the language

## Dart/Flutter Tools

### Using Dart Analyzer
```bash
# Get all symbols in a Dart file
dart analyze --format=machine lib/your_file.dart

# Or use dart pub global activate dartdoc for comprehensive documentation
dartdoc lib/your_file.dart

# List all exported classes/functions with signatures
dart format --set-exit-if-changed lib/your_file.dart
```



### Using ctags with Dart
```bash
# Generate tags for Dart files
ctags -f - --languages=Dart file.dart

# Filter by types
ctags -f - --languages=Dart file.dart | grep -E "\tc\t"  # Classes
ctags -f - --languages=Dart file.dart | grep -E "\tf\t"  # Functions
ctags -f - --languages=Dart file.dart | grep -E "\tm\t"  # Methods
```



---

# Method 3: ast-grep (Targeted Extraction for other languages)

**Best when:** You know what patterns to look for

## JavaScript/TypeScript

### List all exported functions
```bash
ast-grep -l typescript -p 'export function $NAME($$$)' file.ts
```

### List all class definitions
```bash
ast-grep -l typescript -p 'export class $NAME { $$$ }' file.ts
```

### List all interface definitions
```bash
ast-grep -l typescript -p 'interface $NAME { $$$ }' file.ts
```

### List all type definitions
```bash
ast-grep -l typescript -p 'type $NAME = $$$' file.ts
```

### Find all imports
```bash
ast-grep -l typescript -p 'import $WHAT from $WHERE' file.ts
```

### Combine patterns for full outline
```bash
# Get exports, classes, interfaces, types in one go
ast-grep -l typescript -p 'export function $NAME($$$)' file.ts
ast-grep -l typescript -p 'export class $NAME' file.ts
ast-grep -l typescript -p 'interface $NAME' file.ts
ast-grep -l typescript -p 'type $NAME' file.ts
```





---

# Method 3: Language-Specific Tools

**Best when:** Available and well-supported for the language



## JavaScript/TypeScript: Language Server (if available)

Some projects have LSP tooling that can extract symbols. Variable availability.

---

# Method 4: ctags/universal-ctags (Universal Fallback)

**Best when:** Need quick universal solution across languages

## Basic Usage

### Generate tags for single file
```bash
ctags -f - file.js
```
Output format: `symbol<tab>file<tab>line<tab>type`

### Common output (shows functions, classes, etc.)
```bash
ctags -f - file.ts | grep -v '^!' | cut -f1,4
```
Shows symbol names and types.

### Filter by type
```bash
# Functions only
ctags -f - file.dart --kinds-Dart=f
ctags -f - file.ts --kinds-TypeScript=f

# Classes only
ctags -f - file.dart --kinds-Dart=c
ctags -f - file.ts --kinds-TypeScript=c

# Functions and classes
ctags -f - file.dart --kinds-Dart=fc
ctags -f - file.ts --kinds-TypeScript=fc
```

### Language-specific kinds

Common types:
- `f` - functions
- `c` - classes
- `m` - methods
- `v` - variables
- `i` - interfaces (TypeScript/Dart)
- `t` - types (TypeScript/Dart)

### Pretty output
```bash
ctags -f - --fields=+n file.ts | grep -v '^!' | awk '{print $4 " " $1 " (line " $3 ")"}'
```
Shows: type, name, line number

## Limitations

- May miss some language-specific constructs
- Doesn't understand semantic context
- But works across many languages with simple interface

---

# Integration Strategy

## Use Case: Explore Large Unknown File

**Step 1: Get quick outline**
```bash
# Start with ast-grep (highest priority) - for any language
# For Dart/Flutter files:
ast-grep -l dart -p 'class $NAME { $$$ }' file.dart
ast-grep -l dart -p '$TYPE $NAME($$$) { $$$ }' file.dart

# For other files, try ast-grep with common patterns
ast-grep -l typescript -p 'export function $NAME' file.ts
ast-grep -l typescript -p 'export class $NAME' file.ts

# Or use ctags for quick overview
ctags -f - file.ts | grep -v '^!' | cut -f1,4 | sort -u
```

**Step 2: Decide what to investigate**
Based on names, pick interesting functions/classes.

**Step 3: Use ast-grep for targeted search**
```bash
# Found "processData" function, now see how it's called
ast-grep -l typescript -p 'processData($$$)' .
```

**Step 4: Read selectively**
Now read just the relevant sections, not the entire file.

## Use Case: "What does this file export?"

```bash
# Dart/Flutter (highest priority)
ast-grep -l dart -p 'export $PATH' file.dart
ast-grep -l dart -p 'class $NAME { $$$ }' file.dart  # Public classes
ast-grep -l dart -p '$TYPE $NAME($$$) { $$$ }' file.dart | grep -v '_.*('  # Non-private

# JavaScript/TypeScript
ast-grep -l typescript -p 'export $WHAT' file.ts
```

## Use Case: "What classes/interfaces are available?"

```bash
# Dart/Flutter (highest priority)
ast-grep -l dart -p 'class $NAME { $$$ }' file.dart
ast-grep -l dart -p 'mixin $NAME on $SUPER { $$$ }' file.dart
ast-grep -l dart -p 'class $NAME extends $SUPER { $$$ }' file.dart

# Flutter widget classes specifically
ast-grep -l dart -p 'class $NAME extends StatefulWidget { $$$ }' file.dart
ast-grep -l dart -p 'class $NAME extends StatelessWidget { $$$ }' file.dart

# TypeScript
ast-grep -l typescript -p 'interface $NAME { $$$ }' file.ts
ast-grep -l typescript -p 'class $NAME { $$$ }' file.ts
```

---

# Decision Flow

```
Need to understand large file?
│
├─ Know what patterns to look for? (exports, classes, etc.)
│  → Use ast-grep with specific patterns (highest priority)
│  → Fast, targeted, precise
│  → Includes comprehensive Dart/Flutter support
│
├─ Dart/Flutter file and need deeper analysis?
│  → Use Dart analyzer for comprehensive structure extraction
│  → Best quality, language-aware
│
├─ Need universal quick outline?
│  → Use ctags
│  → Simple, works across languages
│
├─ Need detailed understanding?
│  → Read file (selectively based on outline)
│  → Use outline to guide what sections to read
│
└─ Exploring multiple files?
   → Combine: get outline of each, identify relevant ones, read those
```

---

# Best Practices

## 1. Start with Cheapest Tool
```bash
# Fastest: ast-grep with known pattern (highest priority)
ast-grep -l dart -p 'class $NAME { $$$ }' file.dart
ast-grep -l typescript -p 'export function $NAME' file.ts

# Fast: Dart analyzer for .dart files (when deeper analysis needed)
dart analyze --format=machine lib/file.dart

# Medium: ctags for overview
ctags -f - file.ts | cut -f1

# Expensive: Read entire file
# Only after outline shows it's relevant
```

## 2. Combine with grep for Filtering
```bash
# Get all Dart functions, filter to public (non-underscore)
ast-grep -l dart -p '$TYPE $NAME($$$) { $$$ }' file.dart | grep -v '_.*('

# Get Flutter widget classes specifically
ast-grep -l dart -p 'class $NAME extends StatefulWidget { $$$ }' file.dart
ast-grep -l dart -p 'class $NAME extends StatelessWidget { $$$ }' file.dart

# Get ctags output, filter to public methods
ctags -f - file.ts | rg -e '\tm\t' | rg -e '^[^_]'
```

## 3. Use Outline to Guide Detailed Reading
Don't read blindly. Get outline, identify relevant sections, then read those.

## 4. Cache Results for Large Explorations
If exploring many files:
```bash
# Generate tags for entire directory
ctags -R -f .tags .

# Query as needed
grep 'functionName' .tags
```

## 5. Verify with Read When Needed
Outlines give structure but not implementation. When you need details, read the specific section.

---

# Common Workflows

## "What's in this 2000-line file?"
```bash
# Start with ast-grep (highest priority)
ast-grep -l dart -p 'class $NAME { $$$ }' large-file.dart
ast-grep -l dart -p '$TYPE $NAME($$$) { $$$ }' large-file.dart
ast-grep -l typescript -p 'export function $NAME' large-file.ts
ast-grep -l typescript -p 'export class $NAME' large-file.ts

# Or ctags
ctags -f - large-file.ts | grep -v '^!' | cut -f1,4 | sort
```

## "Find all API endpoints in this file"
```bash
# For Dart/Flutter (HTTP clients or server)
ast-grep -l dart -p 'Future<$TYPE> $NAME($$$) async { $$$ }' file.dart | grep -i "http\|api\|fetch\|request"
ast-grep -l dart -p "http.$METHOD($$$)" file.dart

# Express.js
ast-grep -l javascript -p 'router.$METHOD($$$)' routes.js

# Or search for specific pattern
ast-grep -l javascript -p 'app.get($$$)' app.js
```



## "What widgets are in this Flutter file?"
```bash
# All widgets (StatefulWidget/StatelessWidget)
ast-grep -l dart -p 'class $NAME extends StatefulWidget { $$$ }' file.dart
ast-grep -l dart -p 'class $NAME extends StatelessWidget { $$$ }' file.dart

# Custom widgets (not from flutter/material)
ast-grep -l dart -p 'class $NAME extends $SUPER { $$$ }' file.dart | grep -v "StatefulWidget\|StatelessWidget"

# Widget build methods
ast-grep -l dart -p 'Widget build(BuildContext context) { $$$ }' file.dart
```



---

# Limitations and Fallbacks

## When Tools Fail

**ast-grep**: Requires knowing patterns
- Fallback: Try ctags or Read

**ctags**: May miss complex constructs
- Fallback: Use ast-grep with specific patterns or Read

**Language tools**: May not be available
- Fallback: Try ctags or ast-grep

## When to Just Read

Sometimes reading is the right answer:
- File is <500 lines
- Outline doesn't give enough context
- Need to understand implementation
- Tools don't support the language/construct

**The outline told you it's worth reading** - that's still a win.

---

# Summary

**Primary strategy: ast-grep for targeted extraction (highest priority)**
```bash
ast-grep -l LANG -p 'export function $NAME' file
# For Dart/Flutter:
ast-grep -l dart -p 'class $NAME { $$$ }' file.dart
```

**Dart/Flutter analyzer (language-specific, comprehensive)**
```bash
dart analyze --format=machine lib/file.dart
```

**Universal fallback: ctags**
```bash
ctags -f - file | grep -v '^!' | cut -f1,4
```

**Key principle:**
**Get outline → Decide what's relevant → Read selectively**

**Don't read 1000-line files blind. Use structure tools to guide your reading.**
