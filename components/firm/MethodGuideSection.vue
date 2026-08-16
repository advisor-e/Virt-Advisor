<template lang="pug">
//- ONE renderer for every shape the thirteen method guides take. It draws whatever
//- the walker found and names nothing itself — which is why a section nobody
//- anticipated still appears in full, and why this file never needs editing when a
//- guide gains a field. See server/utils/methodGuides.js for the walk.
.mg-node(:class="'mg-depth-' + depth")
  //- A single authored line.
  template(v-if="node.kind === 'text'")
    span.mg-label {{ node.label }}
    b-input(
      :value="valueAt(node.path)"
      v-autogrow
      type="textarea"
      rows="2"
      :aria-label="node.label"
      @input="v => $emit('change', { path: node.path, value: v })"
    )

  //- Structure rather than words — a stage number, a step index. Shown so the
  //- screen matches what the AI reads, and NOT offered as a box to type into:
  //- the backend refuses a changed one, so an editable field here would be an
  //- edit the save then rejects.
  template(v-else-if="node.kind === 'fixed'")
    span.mg-label {{ node.label }}
    p.mg-fixed {{ node.value }}

  //- A bullet list. Every entry is its own editable line, addressed by position,
  //- so rewording one cannot disturb the others.
  template(v-else-if="node.kind === 'list'")
    span.mg-label {{ node.label }}
    ul.mg-list
      li(v-for="(entry, i) in node.values" :key="i")
        b-input(
          :value="valueAt(node.path.concat([i]))"
          v-autogrow
          type="textarea"
          rows="1"
          :aria-label="node.label + ' ' + (i + 1)"
          @input="v => $emit('change', { path: node.path.concat([i]), value: v })"
        )

  //- A section, or one item of a sequence. The document's own name for it is the
  //- heading; the rows below it are whatever it happens to hold.
  template(v-else)
    p.mg-heading {{ node.label }}
    .mg-children
      method-guide-section(
        v-for="(child, i) in node.children"
        :key="i"
        :node="child"
        :content="content"
        :depth="depth + 1"
        @change="payload => $emit('change', payload)"
      )
</template>

<script>
import { autogrow } from '~/utils/textareaDirectives'

/**
 * One node of a walked method guide, rendered and made editable (item 4.16 F).
 *
 * RECURSIVE BY NAME. `name` is what lets the template reference itself, which is
 * how a guide of unknown depth renders — the Santa Claus sequence inside the
 * conflict guide is an array of question objects inside a coaching stage inside the
 * document, and nothing here counts levels.
 *
 * IT OWNS NO STATE. Every value is read out of the `content` object it is given and
 * every edit is emitted upward as `{ path, value }`. The parent holds the single
 * editable copy, so what is saved is what is on screen — there is no second
 * representation for the two to drift apart in.
 *
 * Approved artefact: design/METHOD-GUIDES-SCREEN.md §5, design/mockups/method-guides.html.
 */
export default {
  name: 'MethodGuideSection',

  directives: { autogrow },

  props: {
    /** One node from methodGuides.walkGuide: { kind, key, label, path, ... }. */
    node: {
      type: Object,
      required: true,
      validator: n => ['text', 'fixed', 'list', 'group', 'items'].includes(n.kind)
    },
    /** The editable guide content every path is resolved against. */
    content: { type: Object, required: true },
    /** Nesting level, for the heading weight only. */
    depth: { type: Number, default: 0 }
  },

  methods: {
    /**
     * The live value at a walked path, e.g. `['stages', 0, 'key_principle']`.
     * Reads from `content` rather than from the node so an edit made anywhere is
     * what is shown here — the walk describes the shape, never the current text.
     * @param {Array<string|number>} path
     * @returns {string}
     */
    valueAt (path) {
      let cursor = this.content
      for (const key of path) {
        if (cursor === null || typeof cursor !== 'object') { return '' }
        cursor = cursor[key]
      }
      if (typeof cursor === 'string') { return cursor }
      return (cursor === null || cursor === undefined) ? '' : String(cursor)
    }
  }
}
</script>

<style scoped>
.mg-node { min-width: 0; }
.mg-label {
  display: block;
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
  color: #8a94a3;
  margin-bottom: 0.3rem;
}
.mg-node + .mg-node { margin-top: 0.75rem; }
.mg-heading {
  font-size: 0.95rem;
  font-weight: 700;
  color: #1f2733;
  margin: 0 0 0.5rem;
}
/* Each level steps in and grows a rule, so a reader can see at a glance which
   stage a nested block belongs to. */
.mg-depth-1 > .mg-children,
.mg-depth-2 > .mg-children,
.mg-depth-3 > .mg-children,
.mg-depth-4 > .mg-children {
  border-left: 2px solid #dfe4ea;
  padding-left: 0.75rem;
}
.mg-depth-1 > .mg-heading { font-size: 1.02rem; }
.mg-depth-2 > .mg-heading { font-size: 0.92rem; color: #3273dc; }
.mg-depth-3 > .mg-heading,
.mg-depth-4 > .mg-heading { font-size: 0.85rem; color: #404b5a; }
.mg-fixed {
  margin: 0;
  font-size: 0.9rem;
  color: #404b5a;
  background: #f4f6f9;
  border: 1px solid #dfe4ea;
  border-radius: 4px;
  padding: 0.25rem 0.55rem;
  display: inline-block;
}
.mg-list { list-style: none; margin: 0; padding: 0; }
.mg-list li { margin-bottom: 0.3rem; }
.mg-node >>> textarea { resize: vertical; }
</style>
