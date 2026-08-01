'use strict'

/**
 * Shape-validation for UNTRUSTED structured responses — an LLM completion or a
 * third-party API payload — before the app treats it as data.
 *
 * CLAUDE.md §Security: "Never trust LLM output as structured data — parse and
 * validate its shape before saving." §Testing requires 100% coverage of these
 * validators across valid / malformed / missing-field / wrong-type cases, so the
 * validator is a pure, dependency-free function.
 *
 * A schema node is `{ type, required?, fields?, of? }`:
 *   - type: 'string' | 'number' | 'boolean' | 'object' | 'array'
 *   - fields: for 'object', a map of key → child schema (mark `required: true`)
 *   - of: for 'array', the child schema every element must satisfy
 */

const TYPE_CHECKS = {
  string: v => typeof v === 'string',
  number: v => typeof v === 'number' && !Number.isNaN(v),
  boolean: v => typeof v === 'boolean',
  object: v => v !== null && typeof v === 'object' && !Array.isArray(v),
  array: v => Array.isArray(v)
}

function validateNode (value, schema, path, errors) {
  if (!schema || typeof schema !== 'object' || typeof schema.type !== 'string') {
    errors.push(path + ': invalid schema')
    return
  }
  const check = TYPE_CHECKS[schema.type]
  if (!check) { errors.push(path + ': unknown type "' + schema.type + '"'); return }
  if (!check(value)) { errors.push(path + ': expected ' + schema.type); return }

  if (schema.type === 'object' && schema.fields) {
    for (const key of Object.keys(schema.fields)) {
      const fieldSchema = schema.fields[key]
      if (!Object.prototype.hasOwnProperty.call(value, key)) {
        if (fieldSchema.required) { errors.push(path + '.' + key + ': required field missing') }
        continue
      }
      validateNode(value[key], fieldSchema, path + '.' + key, errors)
    }
  } else if (schema.type === 'array' && schema.of) {
    for (let i = 0; i < value.length; i++) {
      validateNode(value[i], schema.of, path + '[' + i + ']', errors)
    }
  }
}

/**
 * Validate an untrusted value against an expected shape.
 *
 * @param {*} value - the parsed, untrusted response
 * @param {Object} schema - the expected shape (see file header)
 * @returns {{ valid: boolean, errors: string[] }} valid=true only if errors is empty
 */
function validateAIResponse (value, schema) {
  const errors = []
  validateNode(value, schema, '$', errors)
  return { valid: errors.length === 0, errors }
}

module.exports = { validateAIResponse }
