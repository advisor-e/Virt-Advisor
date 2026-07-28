/**
 * Two small Vue 2 directives for the firm-editable tables (Domain Support and
 * Logic Tables). Both operate on the <textarea> inside a Buefy `b-input` and are
 * client-only — they no-op during SSR and where the browser lacks the API.
 *
 * v-autogrow
 *   Makes a field grow to fit its text so a long value (e.g. a template or
 *   branch name) is always fully readable without a scrollbar or manual drag.
 *   Answers the "the name is cut off / must auto adjust" requirement.
 *
 * v-resize-persist="'<stable-key>'"
 *   Lets the user drag a box to a height they like and remembers it, restoring
 *   it whenever that box is shown again. The size is a personal display
 *   preference, so it lives in this browser's localStorage — never in the firm's
 *   saved content (which is what the AI reads). The bound value is the storage
 *   key; make it stable per box, e.g. 'ds:' + domainId + ':summary:' + rowIndex.
 *
 * Node 14 / Vue 2 note: plain functions and browser APIs only; no optional
 * chaining is required and no Node-16+ syntax is used.
 */

const RP_PREFIX = 'rp:'

/** The resizable/growable element inside a b-input, or null. */
function fieldOf (el) {
  return (el && el.querySelector) ? el.querySelector('textarea') : null
}

/** Size a textarea to fit its content. */
function grow (ta) {
  ta.style.resize = 'none'
  ta.style.overflowY = 'hidden'
  ta.style.height = 'auto'
  ta.style.height = ta.scrollHeight + 'px'
}

export const autogrow = {
  inserted (el) {
    if (typeof window === 'undefined') { return }
    const ta = fieldOf(el)
    if (!ta) { return }
    grow(ta)
    if (!ta._autogrowBound) {
      ta._autogrowListener = function () { grow(ta) }
      ta.addEventListener('input', ta._autogrowListener)
      ta._autogrowBound = true
    }
  },
  // Re-fit when the bound value changes (e.g. a different domain is opened and
  // the same reused element now holds a different name).
  componentUpdated (el) {
    if (typeof window === 'undefined') { return }
    const ta = fieldOf(el)
    if (ta) { grow(ta) }
  },
  unbind (el) {
    const ta = fieldOf(el)
    if (ta && ta._autogrowListener) {
      ta.removeEventListener('input', ta._autogrowListener)
      delete ta._autogrowListener
      delete ta._autogrowBound
    }
  }
}

/** Apply the height saved under `key` to the textarea (or clear to default). */
function applySaved (ta, key) {
  ta.style.resize = 'vertical'
  try {
    const saved = window.localStorage.getItem(key)
    ta.style.height = saved || ''
  } catch (e) { /* storage blocked — keep the default size */ }
}

export const resizePersist = {
  inserted (el, binding) {
    if (typeof window === 'undefined') { return }
    const ta = fieldOf(el)
    if (!ta) { return }
    el._rpKey = RP_PREFIX + String(binding.value || '')
    applySaved(ta, el._rpKey)
    if (typeof ResizeObserver !== 'undefined') {
      el._rpObserver = new ResizeObserver(function () {
        const h = ta.style.height
        if (h && h.slice(-2) === 'px') {
          try { window.localStorage.setItem(el._rpKey, h) } catch (e) { /* ignore */ }
        }
      })
      el._rpObserver.observe(ta)
    }
  },
  // When the same element is reused for a different box (v-for + domain switch),
  // the key changes — re-point storage and restore that box's own saved size.
  componentUpdated (el, binding) {
    if (typeof window === 'undefined') { return }
    const nextKey = RP_PREFIX + String(binding.value || '')
    if (nextKey !== el._rpKey) {
      el._rpKey = nextKey
      const ta = fieldOf(el)
      if (ta) { applySaved(ta, nextKey) }
    }
  },
  unbind (el) {
    if (el._rpObserver) {
      el._rpObserver.disconnect()
      delete el._rpObserver
    }
  }
}
