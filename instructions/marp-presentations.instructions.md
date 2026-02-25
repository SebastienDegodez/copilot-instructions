---
applyTo: 'presentation/*.md'
---
# Marp Presentations Instructions

## Purpose

This instruction defines best practices and conventions for creating presentations using Marp in this repository. It applies to all presentations, regardless of theme.

## Structure

- Each presentation must be a Markdown file compatible with Marp (`marp: true` in front-matter).
- Use clear front-matter metadata: `author`, `theme` (if needed), and any custom classes.
- Organize slides with clear separation (`---`).
- Use headings to introduce topics and sections.
- Prefer concise, readable slide content.

## Formatting

- Use images with descriptive alt text and appropriate opacity/background settings.
- Code blocks should use language tags (e.g., `csharp`, `cmd`) for syntax highlighting.
- Use blockquotes for emphasis or citations.
- Use custom footers for author/contact info if relevant.
- Use lists for step-by-step instructions or key points.

## Best Practices

- Keep slides visually consistent and uncluttered.
- Use variables and CSS custom properties in theme files for colors and layout.
- Prefer vector images (SVG) for logos and icons.
- Ensure accessibility: readable contrast, alt text for images, and clear font choices.
- Document any custom theme or CSS in a separate file in the `themes/` directory.



## Output Formats

- Presentations should be exportable to HTML, PDF, and PPTX using Marp CLI or Docker.
- Store exported files in a `build/` directory.

## Example

```markdown
---
marp: true
author: Your Name
theme: custom-theme
---

# Title Slide

![bg opacity:.7](images/background.jpg)

---

## Section Title

- Key point 1
- Key point 2

```csharp
// Example code block
public class Example { }
```
```

---
