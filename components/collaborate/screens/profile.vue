<template lang="pug">
  section.section
    .container
      .section-banner.section-banner--profile
        span.ico 👤
        h1 {{ $t('profile.title') }}
        page-help(help-key="profile")
      b-message(v-if="loading" type="is-info") Loading…
      template(v-else)
        .box
          p.heading {{ $t('profile.fromAdvisory') }}
          p.is-size-5.has-text-weight-semibold {{ advisorProfile.name }} · {{ advisorProfile.title }} · {{ advisorProfile.firm }}
          p {{ advisorProfile.city }}, {{ advisorProfile.country }} · {{ advisorProfile.timezone }}
          p(v-if="advisorProfile.email")
            span.contact-ico ✉️
            a(:href="'mailto:' + advisorProfile.email") {{ advisorProfile.email }}
          p(v-if="advisorProfile.phone")
            span.contact-ico ☎️
            a(:href="'tel:' + advisorProfile.phone") {{ advisorProfile.phone }}
          p(v-if="advisorProfile.linkedin")
            span.contact-ico 🔗
            a(:href="advisorProfile.linkedin" target="_blank" rel="noopener") {{ advisorProfile.linkedin }}

        .box.crossorg(v-if="advisorProfile.crossOrgPosture")
          p.heading {{ $t('profile.crossOrg') }}
          p
            b-tag(:type="advisorProfile.crossOrgPosture === 'open' ? 'is-success' : 'is-warning'")
              | {{ advisorProfile.crossOrgPosture === 'open' ? $t('profile.crossOrgOpen') : $t('profile.crossOrgClosed') }}
          p.has-text-grey.is-size-7.mt-1 {{ $t('profile.crossOrgNote') }}

        //- Advisor-controlled privacy: block a firm manager from opening this
        //- account and seeing it "as" this advisor (Stage 3). Default off = visible.
        .box
          p.heading {{ $t('profile.firmManagerHeading') }}
          b-switch(v-model="advisorProfile.blockFirmManagerView") {{ $t('profile.blockFirmManagerView') }}
          p.has-text-grey.is-size-7.mt-1 {{ $t('profile.blockFirmManagerNote') }}

        b-field(:label="$t('profile.availability')")
          b-switch(v-model="advisorProfile.available") {{ $t('profile.availableToggle') }}
        b-field(:label="$t('profile.strengths')")
          b-taginput(v-model="advisorProfile.strengths" ellipsis :placeholder="$t('profile.addTag')")
        b-field(:label="$t('profile.industries')")
          b-taginput(v-model="advisorProfile.industries" ellipsis :placeholder="$t('profile.addTag')")
        b-field(:label="$t('profile.topics')")
          b-taginput(v-model="advisorProfile.topics" ellipsis :placeholder="$t('profile.addTag')")
        b-field(:label="$t('profile.about')")
          .about-row
            b-input.about-input(type="textarea" v-model="advisorProfile.about")
            button.button.is-light.mic(
              v-if="speechSupported"
              @click="toggleProfileListening('about')"
              :class="{ 'is-danger': profileRecordingField === 'about' }"
              title="Voice input"
            ) 🎤

        .buttons
          b-button(type="is-primary" :loading="saving" @click="save") {{ $t('profile.save') }}
          span.has-text-success.is-align-self-center(v-if="saved") ✓
</template>

<script>
import speechMixin from '~/mixins/collaborate/speechMixin'

export default {
  name: 'ProfilePage',
  mixins: [speechMixin],
  data () {
    return {
      advisorProfile: {
        name: '',
        title: '',
        firm: '',
        city: '',
        country: '',
        timezone: '',
        linkedin: '',
        available: false,
        blockFirmManagerView: false,
        strengths: [],
        industries: [],
        topics: [],
        about: ''
      },
      loading: true,
      saving: false,
      saved: false
    }
  },
  async mounted () {
    try {
      const res = await fetch('/api/people/me')
      if (!res.ok) { throw new Error('HTTP ' + res.status) }
      this.advisorProfile = await res.json()
    } catch (e) {
      // Keep the blank default profile so the form still renders on failure.
      this.$buefy.toast.open({ message: this.$t('toast.loadProfile'), type: 'is-danger' })
    } finally {
      this.loading = false
    }
  },
  methods: {
    async save () {
      this.saving = true
      this.saved = false
      try {
        const body = {
          available: this.advisorProfile.available,
          blockFirmManagerView: this.advisorProfile.blockFirmManagerView,
          strengths: this.advisorProfile.strengths,
          industries: this.advisorProfile.industries,
          topics: this.advisorProfile.topics,
          about: this.advisorProfile.about
        }
        const res = await fetch('/api/people/me', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
        if (!res.ok) { throw new Error('HTTP ' + res.status) }
        this.advisorProfile = await res.json()
        this.saved = true
      } catch (e) {
        this.$buefy.toast.open({ message: this.$t('toast.saveFailed'), type: 'is-danger' })
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.about-row { display: flex; align-items: flex-start; gap: 0.5rem; width: 100%; }
.about-input { flex: 1; }
.mic { font-size: 1.1rem; }
.contact-ico { display: inline-block; width: 1.5rem; }
</style>
