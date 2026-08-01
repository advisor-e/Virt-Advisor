<template lang="pug">
  section.section
    .container
      a.back-link(@click="$router.back()") ‹ {{ $t('common.back') }}
      .section-banner.section-banner--groups
        span.ico ✨
        h1 {{ $t('group.createTitle') }}
        page-help(help-key="groupNew")
      .box
        b-field(:label="$t('group.name')")
          b-input(v-model="form.name" :placeholder="$t('group.namePlaceholder')")
        button.button.is-light.is-small.mb-4(
          v-if="speechSupported"
          @click="toggleVoiceInput('form.name')"
          :class="{ 'is-danger': voiceField === 'form.name' }"
          title="Voice input"
        ) 🎤
        b-field(:label="$t('group.icon')" :message="$t('group.iconHint')")
          b-input.icon-input(v-model="form.icon" maxlength="2")
        b-field(:label="$t('group.summaryLabel')")
          b-input(type="textarea" v-model="form.summary" :placeholder="$t('group.summaryPlaceholder')")
        button.button.is-light.is-small.mb-4(
          v-if="speechSupported"
          @click="toggleVoiceInput('form.summary')"
          :class="{ 'is-danger': voiceField === 'form.summary' }"
          title="Voice input"
        ) 🎤
        b-field(:label="$t('group.tags')")
          b-taginput(v-model="form.tags" ellipsis :placeholder="$t('profile.addTag')")
        b-field(:label="$t('group.visibility')")
          b-select(v-model="form.visibility" expanded)
            option(value="listed") {{ $t('group.listed') }}
            option(value="unlisted") {{ $t('group.unlisted') }}
        .buttons.mt-4
          b-button(type="is-warning" :loading="saving" @click="create") {{ $t('group.create') }}
          nuxt-link.button(to="/discover") {{ $t('common.cancel') }}
</template>

<script>
import speechMixin from '~/mixins/collaborate/speechMixin'

export default {
  name: 'CreateGroupPage',
  mixins: [speechMixin],
  data () {
    return {
      form: { name: '', icon: '✨', summary: '', tags: [], visibility: 'listed' },
      saving: false
    }
  },
  methods: {
    async create () {
      if (!this.form.name.trim()) {
        this.$buefy.toast.open({ message: this.$t('group.name') + '?', type: 'is-warning' })
        return
      }
      this.saving = true
      try {
        const res = await fetch('/api/people/groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.form)
        })
        const g = await res.json()
        if (g && g.id) {
          this.$buefy.toast.open({ message: this.$t('toast.groupCreated'), type: 'is-success' })
          this.$router.push('/groups/' + g.id)
        }
      } catch (e) {
        this.$buefy.toast.open({ message: this.$t('toast.createGroupFailed'), type: 'is-danger' })
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.icon-input { max-width: 6rem; }
</style>
