/**
 * One-time extraction script.
 * Reads the mammoth-extracted Word doc and produces data/content-summaries.json.
 * Run: node scripts/extract-summaries.js
 */

const fs = require('fs')
const path = require('path')

const SRC = 'C:/Users/Mike Barnes/.claude/projects/e--Visual-Code-Projects-Virt-Advisor/dcfd04b7-a99a-41db-a7cf-312622a0a899/tool-results/b0e9rhcs7.txt'
const DEST = path.join(__dirname, '../data/content-summaries.json')

const text = fs.readFileSync(SRC, 'utf8')
const lines = text.split('\n')

// Clean markdown escape sequences and bold markers
function clean (s) {
  return s
    .replace(/\\([.\-\(\)\+\*\[\]!])/g, '$1') // unescape markdown
    .replace(/__/g, '')                          // remove bold markers
    .replace(/\s+/g, ' ')
    .trim()
}

// Map various field name variants to canonical names
function fieldKey (raw) {
  const r = raw.toLowerCase()
  if (r.includes('purpose') || r.includes('benefit')) return 'purpose'
  if (r.includes('business owner')) return 'helpsOwner'
  if (r.includes('helps the advisor') || r.includes('help the advisor')) return 'helpsAdvisor'
  if (r.includes('indicators') || r.includes('suitable for') || r.includes('best suited')) return 'indicators'
  return null
}

// Section headings (# lines like: # <a id="..."></a>Section Name)
const SECTION_RE = /^# .*?<\/a>(.+)$/
const TEMPLATE_RE = /^__\d+\\?\.\s*(.+)__$/
const FIELD_RE = /^- __([^:]+):__ (.+)$/

const results = []
let currentSection = 'General'
let currentTemplate = null

function saveTemplate () {
  if (currentTemplate && (currentTemplate.purpose || currentTemplate.helpsOwner)) {
    results.push({ ...currentTemplate })
  }
}

for (const rawLine of lines) {
  const line = rawLine.trim()

  // Section header
  const sectionMatch = line.match(SECTION_RE)
  if (sectionMatch) {
    const name = clean(sectionMatch[1])
    if (name && !name.includes('following summary') && name.length < 60) {
      saveTemplate()
      currentTemplate = null
      currentSection = name
    }
    continue
  }

  // Template name line: __N. Template Name__
  const tplMatch = line.match(TEMPLATE_RE)
  if (tplMatch) {
    saveTemplate()
    currentTemplate = {
      name: clean(tplMatch[1]),
      section: currentSection,
      purpose: '',
      helpsOwner: '',
      helpsAdvisor: '',
      indicators: ''
    }
    continue
  }

  // Field line: - __FieldName:__ content
  if (currentTemplate) {
    const fieldMatch = line.match(FIELD_RE)
    if (fieldMatch) {
      const key = fieldKey(fieldMatch[1])
      if (key) {
        currentTemplate[key] = clean(fieldMatch[2])
      }
    }
  }
}

saveTemplate()

console.log(`Extracted ${results.length} templates`)
fs.writeFileSync(DEST, JSON.stringify(results, null, 2))
console.log(`Saved to ${DEST}`)
