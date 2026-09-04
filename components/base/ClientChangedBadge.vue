<script>
/**
 * ClientChangedBadge — the `client` provenance badge beside a figure the client changed
 * since the advisor's version (design/features/business-entity-reports.md §5, D4).
 *
 * Screens built on SliderField show it through the slider's badge slot. Screens that
 * keep plain inputs (Eight Levers, the decision-class models) have no slot, so the badge
 * sits in the label — and with a dozen sites per screen, one line each is the difference
 * between a template that reads and one that does not. Renders ProvenanceBadge in its
 * `client` state with the two labels it does not need blanked.
 */
import ProvenanceBadge from '~/components/base/ProvenanceBadge.vue'

export default {
  name: 'ClientChangedBadge',

  components: { ProvenanceBadge },

  props: {
    /** The badge word, resolved by the caller (`clientReports.saved.badge`). */
    label: { type: String, required: true }
  },

  render (h) {
    return h(ProvenanceBadge, {
      props: { source: 'client', size: 'sm', spaced: true, fileLabel: '', enteredLabel: '', clientLabel: this.label }
    })
  }
}
</script>
