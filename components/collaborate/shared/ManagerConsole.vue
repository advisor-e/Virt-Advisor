<template lang="pug">
  section.section
    .container
      .section-banner.section-banner--firm
        span.ico 🧭
        h1 {{ pageTitle }}
        span.firm-chip(v-if="c") {{ scopeChip }}

      //- Show-home preview affordance: a ribbon + a tier switcher. Dev-only pages;
      //- in production the console is ONE page, shown to the right person by login.
      template(v-if="preview")
        b-message.preview-msg(type="is-warning") {{ $t('console.previewRibbon') }}
        p.preview-nav
          span.has-text-grey {{ $t('console.previewNav') }}&nbsp;
          nuxt-link(to="/firm") {{ $t('console.titles.firm_manager') }}
          span.sep ·
          nuxt-link(to="/group") {{ $t('console.titles.group_manager') }}
          span.sep ·
          nuxt-link(to="/global") {{ $t('console.titles.global_manager') }}
          span.sep ·
          nuxt-link(to="/mentor") {{ $t('console.titles.mentor') }}

      b-message(v-if="loading" type="is-info") Loading…
      b-message(v-else-if="!c" type="is-danger") {{ $t('firm.loadFailed') }}
      template(v-else)
        p.has-text-grey.mb-4 {{ pageSubtitle }}

        //- At a glance — the tiles roll up the levels beneath this manager.
        .fm-tiles
          .fm-tile(v-for="t in tiles" :key="t.key")
            .k {{ t.label }}
            .v {{ t.value }}
          .fm-tile(v-if="isFirm")
            .k {{ $t('firm.crossFirm') }}
            .v
              span.tag.is-medium(:class="postureOpen ? 'is-success is-light' : 'is-danger is-light'") {{ postureOpen ? $t('firm.open') : $t('firm.closed') }}

        //- Cross-org collaboration toggle — each manager tier sets its OWN level
        //- (Firm→branch, Group→country, Global→brand). A lower level may only
        //- tighten; a stricter level above CAPS an Open choice, which we show
        //- rather than hide (owner's Option A). Ceiling model lives in the backend.
        .box(v-if="crossOrg")
          p.label {{ $t('firm.collabTitle') }}
          p.has-text-grey.is-size-7.mb-3 {{ $t('firm.collabSub') }}
          //- The ceiling handed down from the level(s) above (read-only context).
          p.co-ceiling.mb-2(v-if="hasCeiling")
            span.has-text-grey.is-size-7 {{ $t('console.crossOrg.ceilingLabel') }}
            span.tag.ml-2(:class="crossOrg.ceiling === 'open' ? 'is-success is-light' : 'is-danger is-light'") {{ crossOrg.ceiling === 'open' ? $t('firm.open') : $t('firm.closed') }}
          .buttons.has-addons.mb-1
            b-button(:type="ownOpen ? 'is-success' : ''" :loading="savingPosture === 'open'" @click="setPosture('open')") {{ $t('firm.open') }}
            b-button(:type="!ownOpen ? 'is-danger' : ''" :loading="savingPosture === 'closed'" @click="setPosture('closed')") {{ $t('firm.closed') }}
          //- Option A: if a stricter level above is overriding an Open choice, say
          //- so plainly instead of disabling the control.
          b-message.co-capped.mt-2(v-if="crossOrg.cappedBy" type="is-warning") {{ cappedNote }}
          p.has-text-grey.is-size-7(v-else) {{ ownOpen ? $t('console.crossOrg.hintOpen') : $t('console.crossOrg.hintClosed') }}

        .columns
          .column.is-two-thirds
            //- Firm tier: the flat adviser table (search + view-as). Higher tiers:
            //- the cascading roll-up (global group → country → firm → adviser).
            .box(v-if="isFirm")
              .is-flex.is-align-items-center.is-justify-content-space-between.mb-1
                p.label.mb-0 {{ $t('firm.advisersTitle') }}
                span.has-text-grey.is-size-7 {{ $t('firm.showing', { shown: filteredAdvisers.length, total: c.advisers.length }) }}
              p.has-text-grey.is-size-7.mb-2 {{ advisersSub }}
              b-input.mb-3(v-model="advSearch" :placeholder="$t('firm.searchAdvisers')" size="is-small" rounded)
              //- Bulk-invite bar — appears once advisers are ticked (FEAT-BULKINVITE).
              .bulk-bar.mb-3(v-if="selectedIds.length")
                span.has-text-grey.is-size-7 {{ $t('firm.selectedCount', { n: selectedIds.length }) }}
                b-button.is-small.is-link(:disabled="preview" @click="openBulkInvite") {{ $t('firm.inviteSelected') }} ({{ selectedIds.length }})
                b-button.is-small.is-light(@click="clearSelection") {{ $t('common.cancel') }}
              p.has-text-grey.is-size-7(v-if="!filteredAdvisers.length") {{ $t('firm.noAdviserMatch') }}
              .table-wrap(v-else)
                table.table.is-fullwidth.is-hoverable
                  thead
                    tr
                      th.fm-check
                        b-checkbox(:value="allSelected" :disabled="preview" @input="toggleAll")
                      th {{ $t('firm.colAdviser') }}
                      th {{ $t('firm.colStatus') }}
                      th {{ $t('firm.colGroups') }}
                      th {{ $t('firm.colActive') }}
                      th {{ $t('firm.colAction') }}
                  tbody
                    tr(v-for="a in filteredAdvisers" :key="a.id")
                      td.fm-check
                        b-checkbox(:value="selectedIds.includes(a.id)" :disabled="preview" @input="toggleSelect(a.id)")
                      td
                        .who
                          .avatar.fm-av(:style="avatarStyle(a)") {{ initials(a.name) }}
                          div
                            span {{ a.name }}
                            span.tag.is-light.ml-2(v-if="a.isMe") {{ $t('firm.you') }}
                            span.tag.is-warning.is-light.ml-2(v-if="a.blocked") 🔒 {{ $t('firm.blockedTag') }}
                            p.has-text-grey.is-size-7 {{ a.title }}
                      td
                        span.tag(:class="a.available ? 'is-success is-light' : 'is-light'") {{ a.available ? $t('common.available') : $t('firm.unavailable') }}
                      td {{ a.groupCount }}
                      td.has-text-grey.is-size-7 {{ a.lastActive || '—' }}
                      td.has-text-right
                        b-button.is-small.is-light(v-if="!a.isMe && !a.blocked" :disabled="preview" :loading="viewingId === a.id" @click="viewAs(a)") {{ $t('firm.viewAs') }}
                        span.has-text-grey.is-size-7(v-else-if="a.blocked") 🔒
            .box(v-else)
              p.label.mb-1 {{ $t('console.breakdownTitle') }}
              p.has-text-grey.is-size-7.mb-3 {{ breakdownSub }}
              .cnode-tree(v-if="c.tree && c.tree.children")
                console-node(v-for="n in c.tree.children" :key="n.level + ':' + n.value" :node="n" :preview="preview" :preview-tier="previewTier")

          //- Pending approvals
          .column
            .box
              p.label {{ $t('firm.approvalsTitle') }}
              p.has-text-grey.is-size-7.mb-3 {{ $t('firm.approvalsSub') }}
              p.has-text-grey.is-size-7(v-if="!c.approvals.length") {{ $t('firm.noApprovals') }}
              .fm-req(v-for="r in c.approvals" :key="r.id")
                .who
                  .avatar.fm-av(:style="avatarStyle(r.advisor)") {{ initials(r.advisor.name) }}
                  div
                    p {{ r.advisor.name }}
                    p.has-text-grey.is-size-7 {{ $t('firm.wantsToJoin') }} · {{ r.groupName }}
                .buttons.mt-2.mb-0
                  b-button(type="is-success" size="is-small" :disabled="preview" @click="respondApproval(r, true)") {{ $t('firm.approve') }}
                  b-button(size="is-small" :disabled="preview" @click="respondApproval(r, false)") {{ $t('firm.decline') }}

        //- Activity / audit
        .box
          p.label {{ $t('firm.activityTitle') }}
          p.has-text-grey.is-size-7.mb-3 {{ $t('firm.activitySub') }}
          p.has-text-grey.is-size-7(v-if="!c.activity.length") {{ $t('firm.noActivity') }}
          .fm-ev(v-for="(e, i) in c.activity" :key="i")
            span.fm-when {{ formatWhen(e.at) }}
            span
              span.has-text-weight-semibold {{ e.actorName }}
              |  {{ humanize(e.action) }}
              span.fm-code {{ e.action }}
          //- Full network audit log — platform super-admin (Mentor) only.
          p.mt-3(v-if="isAdminTier")
            nuxt-link(to="/audit") {{ $t('console.viewFullAudit') }}

        //- Bulk-invite group picker (FEAT-BULKINVITE): invite the ticked advisers
        //- into one of the manager's groups. Each invitee still accepts individually.
        b-modal(v-model="bulkOpen" has-modal-card)
          .modal-card
            header.modal-card-head
              p.modal-card-title {{ $t('firm.bulkInviteTitle', { n: selectedIds.length }) }}
            section.modal-card-body
              template(v-if="myGroups.length")
                b-field(:label="$t('firm.bulkInvitePick')")
                  b-select(v-model="bulkGroupId" expanded)
                    option(v-for="g in myGroups" :key="g.id" :value="g.id") {{ g.name }}
                p.has-text-grey.is-size-7.mt-2 {{ $t('firm.bulkInviteNote') }}
              p.has-text-grey.is-size-7(v-else) {{ $t('firm.bulkNoGroups') }}
            footer.modal-card-foot
              b-button(type="is-link" :disabled="!bulkGroupId || bulkSending" :loading="bulkSending" @click="sendBulkInvites") {{ $t('firm.sendInvitations') }}
              b-button(@click="bulkOpen = false") {{ $t('common.cancel') }}
</template>

<script>
/**
 * ManagerConsole — the shared management console for the role hierarchy (Q-ROLES).
 *
 * ONE component renders the console for EVERY manager tier; the backend returns the
 * correctly-scoped payload (a Firm Manager sees their firm, a Group Manager their
 * country, Global/Mentor everyone), and this component labels itself from
 * `c.scope.tier`. This IS the single production page — in production it is shown
 * once, gated by the Advisory login. The per-tier preview pages (/group, /global,
 * /mentor) render it with `preview` on, against the dev-only preview endpoint.
 *
 * Props:
 *   endpoint — the console API to read (default the real, role-gated /api/people/firm).
 *   preview  — show-home mode: adds the preview ribbon + tier switcher and disables
 *              the interactive actions (view-as / approvals / posture live only on
 *              the real, logged-in page).
 */
// Display names for the demo country codes (fallback: the raw code).
const COUNTRY_NAMES = { DE: 'Germany', IE: 'Ireland', CH: 'Switzerland', IT: 'Italy', GB: 'United Kingdom', US: 'United States', FR: 'France', ES: 'Spain' }

export default {
  name: 'ManagerConsole',
  props: {
    endpoint: { type: String, default: '/api/people/firm' },
    preview: { type: Boolean, default: false }
  },
  data () {
    return {
      c: null,
      loading: true,
      savingPosture: null,
      advSearch: '',
      viewingId: null,
      // Bulk-invite (FEAT-BULKINVITE): ticked adviser ids + the group-picker modal.
      selectedIds: [],
      bulkOpen: false,
      myGroups: [],
      bulkGroupId: '',
      bulkSending: false
    }
  },
  computed: {
    // The resolved tier drives the title/subtitle/scope chip. Defaults to the Firm
    // tier if the payload predates the scope field (defensive).
    tier () { return (this.c && this.c.scope && this.c.scope.tier) || 'firm_manager' },
    isFirm () { return this.tier === 'firm_manager' },
    // The platform super-admin (Mentor) — the only tier that sees the whole-network
    // audit log link (lower tiers get their own scope's activity feed above).
    isAdminTier () { return this.tier === 'mentor' },
    // The preview tier key ('group'/'global'/'mentor') taken from the preview
    // endpoint, so the tree's lazy adviser loader hits the matching dev endpoint.
    previewTier () {
      if (!this.preview) { return '' }
      const m = this.endpoint.match(/preview\/([^/?]+)/)
      return m ? m[1] : ''
    },
    pageTitle () { return this.$t('console.titles.' + this.tier) },
    pageSubtitle () { return this.$t('console.subtitles.' + this.tier) },
    countryName () {
      const code = this.c && this.c.scope && this.c.scope.country
      return code ? (COUNTRY_NAMES[code] || code) : ''
    },
    // The scope pill next to the title: firm name / country / all-countries / network.
    scopeChip () {
      if (!this.c) { return '' }
      if (this.tier === 'group_manager') { return '🌍 ' + this.countryName }
      if (this.tier === 'global_manager') { return '🌐 ' + this.$t('console.allCountries') }
      if (this.tier === 'mentor') { return '⭐ ' + this.$t('console.wholeNetwork') }
      return '🏢 ' + (this.c.firm || '')
    },
    // "Everyone in {scope}" — scoped to the tier.
    advisersSub () {
      if (!this.c) { return '' }
      if (this.tier === 'firm_manager') { return this.$t('firm.advisersSub', { firm: this.c.firm }) }
      if (this.tier === 'group_manager') { return this.$t('console.advisersScopeCountry', { country: this.countryName }) }
      return this.$t('console.advisersScopeAll')
    },
    // The stat tiles for this tier — each counts a level within the manager's scope.
    tiles () {
      if (!this.c) { return [] }
      const s = this.c.stats
      const def = {
        globalGroups: { key: 'globalGroups', label: this.$t('console.tiles.globalGroups'), value: s.globalGroups },
        groups: { key: 'groups', label: this.$t('console.tiles.groups'), value: s.orgGroups },
        firms: { key: 'firms', label: this.$t('console.tiles.firms'), value: s.firms },
        advisers: { key: 'advisers', label: this.$t('console.tiles.advisers'), value: s.advisers },
        specialtyGroups: { key: 'specialtyGroups', label: this.$t('console.tiles.specialtyGroups'), value: s.groups },
        pendingApprovals: { key: 'pendingApprovals', label: this.$t('console.tiles.pendingApprovals'), value: s.pendingApprovals }
      }
      const sets = {
        mentor: ['globalGroups', 'groups', 'firms', 'advisers'],
        global_manager: ['groups', 'firms', 'advisers', 'pendingApprovals'],
        group_manager: ['firms', 'advisers', 'pendingApprovals'],
        firm_manager: ['advisers', 'specialtyGroups', 'pendingApprovals'] // + the cross-firm tile
      }
      return (sets[this.tier] || sets.firm_manager).map(k => def[k])
    },
    // "Roll-up by {top level} — click a row to drill down."
    breakdownSub () {
      const top = (this.c && this.c.tree && this.c.tree.children && this.c.tree.children[0] && this.c.tree.children[0].level) || 'firm'
      return this.$t('console.breakdownSub', { level: this.$t('console.levelPlural.' + top) })
    },
    postureOpen () { return !!this.c && this.c.stats.crossOrgPosture === 'open' },
    // The three-level cross-org control state (own level / inherited ceiling /
    // effective / cappedBy) for THIS manager's tier. Null if the payload predates it.
    crossOrg () { return (this.c && this.c.crossOrg) || null },
    // The toggle reflects the manager's OWN choice (which may sit under a cap).
    // Falls back to the effective posture for payloads without the crossOrg block.
    ownOpen () { return this.crossOrg ? this.crossOrg.own === 'open' : this.postureOpen },
    // Firm + Group tiers inherit a ceiling from above; Global/Mentor sit at the top.
    hasCeiling () { return !!this.crossOrg && this.crossOrg.level !== 'global' },
    // Option-A note: which level above is currently overriding an Open choice.
    cappedNote () {
      if (!this.crossOrg || !this.crossOrg.cappedBy) { return '' }
      return this.$t('console.crossOrg.capped', {
        scope: this.$t('console.crossOrg.scopeName.' + this.crossOrg.level),
        above: this.$t('console.crossOrg.aboveName.' + this.crossOrg.cappedBy)
      })
    },
    // Client-side search so a large scope (100+ advisers) stays navigable. For very
    // large sets this becomes server-side search + pagination — a repository seam
    // (the console endpoint would take q/offset/limit); the list stays scrollable.
    filteredAdvisers () {
      if (!this.c) { return [] }
      const q = (this.advSearch || '').trim().toLowerCase()
      if (!q) { return this.c.advisers }
      return this.c.advisers.filter((a) => {
        return (a.name + ' ' + (a.title || '')).toLowerCase().includes(q)
      })
    },
    // All currently-visible advisers are ticked (drives the header select-all box).
    allSelected () {
      return this.filteredAdvisers.length > 0 && this.filteredAdvisers.every(a => this.selectedIds.includes(a.id))
    }
  },
  async mounted () {
    await this.load()
  },
  methods: {
    async load () {
      this.loading = true
      try {
        const res = await fetch(this.endpoint)
        if (res.ok) { this.c = await res.json() }
      } catch (e) {
        // leave c null -> error state
      } finally {
        this.loading = false
      }
    },
    initials (name) {
      return (name || '').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
    },
    avatarStyle (a) {
      const colors = ['#6C5CE7', '#00C2A8', '#FF6B9D', '#14B8D8', '#FFB020', '#FF7A59']
      let h = 0
      const id = a.id || ''
      for (let i = 0; i < id.length; i++) { h = (h * 31 + id.charCodeAt(i)) >>> 0 }
      const col = colors[h % colors.length]
      return { background: 'linear-gradient(135deg, ' + col + ', ' + col + 'cc)' }
    },
    // Turn an audit action code ('group.shared_page_added') into readable words.
    // The code itself stays visible as a tag for exact-event auditing.
    humanize (action) {
      return (action || '').replace(/[._]/g, ' ')
    },
    formatWhen (at) {
      if (!at) { return '' }
      const d = new Date(at)
      return isNaN(d.getTime()) ? '' : d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    },
    async setPosture (posture) {
      // Compare against the manager's OWN choice — they may set Open even while
      // capped by a stricter level above (Option A), so don't gate on effective.
      if (this.savingPosture || (posture === 'open') === this.ownOpen) { return }
      this.savingPosture = posture
      try {
        const res = await fetch('/api/people/firm/posture', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ posture })
        })
        const data = await res.json()
        if (data.success) {
          this.$set(this.c.stats, 'crossOrgPosture', data.crossOrgPosture)
          if (data.crossOrg) { this.$set(this.c, 'crossOrg', data.crossOrg) }
          this.$buefy.toast.open({ message: this.$t('firm.postureUpdated'), type: 'is-success' })
        } else {
          this.$buefy.toast.open({ message: this.$t('firm.actionFailed'), type: 'is-warning' })
        }
      } catch (e) {
        this.$buefy.toast.open({ message: this.$t('firm.actionFailed'), type: 'is-danger' })
      } finally {
        this.savingPosture = null
      }
    },
    // Isolated so tests can stub the reload without a jsdom navigation error.
    reloadTo (url) { window.location.href = url },
    // Assume an adviser's view. The server validates (a manager, within scope, not
    // blocked) and sets the view-as cookie; a full reload re-fetches the whole app
    // as that adviser. The persistent banner (layout) offers the way back.
    async viewAs (a) {
      this.viewingId = a.id
      try {
        const res = await fetch('/api/people/firm/view-as', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ advisorId: a.id })
        })
        const data = await res.json()
        if (data.success) {
          this.reloadTo('/')
        } else {
          const msg = data.error && data.error.message ? data.error.message : this.$t('firm.actionFailed')
          this.$buefy.toast.open({ message: msg, type: 'is-warning' })
          this.viewingId = null
        }
      } catch (e) {
        this.$buefy.toast.open({ message: this.$t('firm.actionFailed'), type: 'is-danger' })
        this.viewingId = null
      }
    },
    // Reuse the existing group-join approve/decline endpoints, then refresh.
    async respondApproval (r, accept) {
      const verb = accept ? 'accept' : 'decline'
      try {
        const res = await fetch('/api/people/group-requests/' + r.id + '/' + verb, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
        })
        if (res.ok) {
          this.$buefy.toast.open({
            message: accept ? this.$t('firm.approvedToast') : this.$t('firm.declinedToast'),
            type: accept ? 'is-success' : 'is-light'
          })
          await this.load()
        }
      } catch (e) {
        this.$buefy.toast.open({ message: this.$t('firm.actionFailed'), type: 'is-danger' })
      }
    },
    // ── Bulk-invite (FEAT-BULKINVITE) ────────────────────────────────────────
    toggleSelect (id) {
      const i = this.selectedIds.indexOf(id)
      if (i === -1) { this.selectedIds.push(id) } else { this.selectedIds.splice(i, 1) }
    },
    toggleAll (on) {
      this.selectedIds = on ? this.filteredAdvisers.map(a => a.id) : []
    },
    clearSelection () { this.selectedIds = [] },
    // Open the group picker + load the manager's groups (the invite targets).
    async openBulkInvite () {
      this.bulkGroupId = ''
      this.bulkOpen = true
      try {
        const res = await fetch('/api/people/my-groups')
        if (res.ok) { this.myGroups = await res.json() }
      } catch (e) {
        this.myGroups = []
      }
    },
    // Send the invitations. Each invitee still accepts individually (consent) — the
    // backend skips anyone already in the group and reports it in the summary.
    async sendBulkInvites () {
      if (!this.bulkGroupId || this.bulkSending) { return }
      this.bulkSending = true
      try {
        const res = await fetch('/api/people/groups/' + this.bulkGroupId + '/invite-many', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ advisorIds: this.selectedIds })
        })
        const data = await res.json()
        if (data.success) {
          const n = data.invited.length
          const s = data.skipped.length
          const msg = s
            ? this.$t('firm.bulkSomeSkipped', { n, s })
            : this.$t('firm.bulkInvited', { n })
          this.$buefy.toast.open({ message: msg, type: 'is-success' })
          this.bulkOpen = false
          this.clearSelection()
        } else {
          this.$buefy.toast.open({ message: this.$t('firm.actionFailed'), type: 'is-warning' })
        }
      } catch (e) {
        this.$buefy.toast.open({ message: this.$t('firm.actionFailed'), type: 'is-danger' })
      } finally {
        this.bulkSending = false
      }
    }
  }
}
</script>

<style scoped>
.section-banner--firm { background: #123a76; }
.firm-chip { margin-left: auto; background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.24); color: #fff; padding: .35rem .8rem; border-radius: 999px; font-size: .82rem; }

.preview-msg { margin-bottom: .5rem; }
.preview-nav { margin-bottom: 1.25rem; font-size: .9rem; }
.preview-nav .sep { color: var(--muted); margin: 0 .4rem; }

.bulk-bar { display: flex; align-items: center; gap: .6rem; background: #f4f7ff; border: 1px solid #e2e8ff; border-radius: 10px; padding: .5rem .7rem; }
.fm-check { width: 2.2rem; text-align: center; }

.fm-tiles { display: grid; gap: .9rem; grid-template-columns: repeat(4, 1fr); margin-bottom: 1.25rem; }
@media (max-width: 720px) { .fm-tiles { grid-template-columns: repeat(2, 1fr); } }
.fm-tile { background: #fff; border: 1px solid #eee; border-left: 4px solid #123a76; border-radius: 14px; padding: .9rem 1rem; box-shadow: var(--shadow); }
.fm-tile .k { font-size: .72rem; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); }
.fm-tile .v { font-size: 1.9rem; font-weight: 300; margin-top: .25rem; }

/* Scroll a large adviser list inside the panel (100+ advisers). */
.table-wrap { overflow-x: auto; max-height: 30rem; overflow-y: auto; }
.table-wrap thead th { position: sticky; top: 0; background: var(--surface, #fff); z-index: 1; }
.who { display: flex; align-items: center; gap: .6rem; }
.fm-av { width: 32px; height: 32px; border-radius: 9px; margin: 0; font-size: .72rem; color: #fff; display: grid; place-items: center; flex: none; }

.fm-req { padding: .5rem 0; border-bottom: 1px solid #eee; }
.fm-req:last-child { border-bottom: 0; }

.fm-ev { display: flex; gap: .7rem; align-items: baseline; padding: .5rem 0; border-bottom: 1px solid #eee; font-size: .88rem; }
.fm-ev:last-child { border-bottom: 0; }
.fm-when { color: var(--muted); font-size: .76rem; white-space: nowrap; min-width: 6.5rem; }
.fm-code { font-size: .68rem; color: var(--muted); background: #f4f4f8; border: 1px solid #eee; border-radius: 6px; padding: 0 .35rem; margin-left: .45rem; }
</style>
