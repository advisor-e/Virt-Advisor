<template lang="pug">
label.pdz(
  :class="{ 'is-over': over, 'is-disabled': disabled }"
  @dragover.prevent="over = !disabled"
  @dragleave.prevent="over = false"
  @drop.prevent="dropped")
  input.pdz-input(type="file" accept="application/pdf,.pdf" :multiple="multiple" :disabled="disabled" @change="chosen")
  .pdz-big {{ big }}
  .pdz-small {{ small }}
</template>

<script>
/**
 * PdfDropZone — a place to drop PDFs, or click to choose them. It hands the files over and
 * decides nothing about them: whether a file is really a PDF, and how large it may be, is the
 * backend's check, made on the bytes rather than on what the browser says.
 */
export default {
  name: 'PdfDropZone',

  props: {
    /** The first line, in the zone's own words. */
    big: { type: String, required: true },
    /** The second line. */
    small: { type: String, default: '' },
    multiple: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false }
  },

  data () {
    return { over: false }
  },

  methods: {
    dropped (e) {
      this.over = false
      if (!this.disabled) { this.hand(e.dataTransfer && e.dataTransfer.files) }
    },

    chosen (e) {
      this.hand(e.target.files)
      // Cleared so choosing the same file again still fires.
      e.target.value = ''
    },

    hand (list) {
      const files = Array.from(list || [])
      if (!files.length) { return }
      // Payload: File[] in the order dropped or chosen — only the first when not `multiple`.
      this.$emit('files', this.multiple ? files : files.slice(0, 1))
    }
  }
}
</script>

<style scoped>
.pdz {
  display: block; border: 2px dashed #b9c7d6; border-radius: 8px; background: #f7fafd;
  padding: 26px 16px; text-align: center; cursor: pointer;
}
.pdz.is-over { border-color: #0070c0; background: #eef6fc; }
.pdz.is-disabled { opacity: 0.6; cursor: default; }
.pdz-input { display: none; }
.pdz-big { font-weight: 600; color: #002b64; }
.pdz-small { font-size: 12.5px; color: #6b7c93; margin-top: 4px; }
</style>
