/**
 * Preprocesses raw AI response text before markdown-it rendering.
 *
 * Handles three real-world gpt-4o-mini output variants:
 * 1. Entire response wrapped in ```markdown ... ``` code fences
 * 2. **Bold labels** used instead of #### headings
 * 3. Partial opening fence present during streaming (stripped early so ``` never renders)
 */
export function preprocessAIResponse (text) {
  if (!text || typeof text !== 'string') return ''

  let processed = text.trim()

  // Strip complete code fence — handles ```markdown, ```md, ``` (no lang), case-insensitive
  const fenceMatch = processed.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```\s*$/i)
  if (fenceMatch) {
    processed = fenceMatch[1].trim()
  } else if (processed.startsWith('```')) {
    // Partial fence present during streaming — strip the opening line so raw ``` never shows
    const firstNewline = processed.indexOf('\n')
    if (firstNewline !== -1 && firstNewline < 20) {
      processed = processed.slice(firstNewline + 1).trim()
    }
  }

  // Convert **bold labels** to #### headings (gpt-4o-mini prompt drift fix)
  processed = processed.replace(/^\*\*([^*\n]{3,80}?)\*\*:?\s*$/gm, '#### $1')

  // Ensure blank line before headings — markdown-it needs it to parse h4 correctly
  processed = processed.replace(/([^\n])\n(#### )/g, '$1\n\n$2')

  return processed
}
