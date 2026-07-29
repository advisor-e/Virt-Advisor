<template lang="pug">
section.cpd-record
  .cpd-head
    h3.cpd-title {{ $t('cpd.title') }}
    p.cpd-sub {{ $t('cpd.subtitle') }}

  .cpd-loading(v-if="loading")
    .cpd-spinner

  //- `error` holds an i18n KEY, not a sentence — see load().
  .cpd-error(v-else-if="error")
    p.cpd-error-msg {{ $t(error) }}
    button.btn-cpd-retry(type="button" @click="load()") {{ $t('advisorProgress.retry') }}

  template(v-else)
    p.cpd-total {{ $t('cpd.totalRecorded', { time: formatMinutes(totalMinutes) }) }}

    //- A write that failed is said out loud. An advisor who is not told their pledge
    //- failed will believe they have declared something they have not. Suppressed while
    //- either box is open, because each carries the same message inside itself — where
    //- the advisor is actually looking.
    p.cpd-write-error(v-if="writeError && !pledgeOpen && !withdrawOpen") {{ $t(writeError) }}

    p.cpd-empty(v-if="!templates.length") {{ $t('cpd.empty') }}

    .cpd-template(v-for="tpl in templates" :key="tpl.title")
      .cpd-template-title {{ tpl.title }}
      .cpd-activity(v-for="act in tpl.activities" :key="act.activity")
        .cpd-activity-main
          span.cpd-activity-label {{ activityLabel(act) }}
          //- Repeats COUNT (owner ruling): an advisor who watched a video three times
          //- has done the work three times, so this is a tally, never a tick.
          span.cpd-activity-claimed(v-if="act.claimedCount")
            | {{ $tc('cpd.recorded', act.claimedCount, { n: act.claimedCount, minutes: act.claimedMinutes }) }}
        .cpd-activity-actions
          //- No Record button where the export no longer offers the activity: it can
          //- still be shown as history, but it cannot be claimed again.
          button.btn-cpd-record(
            v-if="act.minutes !== null"
            type="button"
            :disabled="busy"
            @click="openPledge(tpl, act)"
          ) {{ $t('cpd.record') }}
          button.btn-cpd-withdraw(
            v-if="act.claimedCount"
            type="button"
            :disabled="busy"
            @click="openWithdraw(act)"
          ) {{ $t('cpd.withdraw') }}

  //- The pledge. Nothing is ever recorded without the advisor first reading the exact
  //- declaration they are making — a CPD claim may be submitted to a professional body,
  //- so it must never be a one-click accident.
  b-modal(v-model="pledgeOpen" has-modal-card trap-focus)
    .modal-card.cpd-modal(v-if="pledge")
      header.modal-card-head
        p.modal-card-title {{ pledge.templateTitle }}
        button.delete(type="button" @click="closePledge")
      section.modal-card-body
        p.cpd-modal-activity {{ activityLabel(pledge.activity) }}
        p.cpd-modal-pledge {{ $t(pledge.activity.pledgeKey) }}
        p.cpd-modal-declaration {{ $t('cpd.declaration') }}
        p.cpd-write-error(v-if="writeError") {{ $t(writeError) }}
      footer.modal-card-foot
        b-button(type="is-primary" :loading="busy" @click="confirmPledge") {{ $t('cpd.record') }}
        b-button(:disabled="busy" @click="closePledge") {{ $t('cpd.cancel') }}

  //- Withdrawing was one press on a professional record. This box stands between the
  //- button and the write; the write itself is unchanged. Its own `v-if` matters as much
  //- as the pledge's: with nothing pending, neither modal puts a card in the DOM, so the
  //- two can never be confused for one another.
  b-modal(v-model="withdrawOpen" has-modal-card trap-focus)
    .modal-card.cpd-modal.cpd-withdraw-modal(v-if="withdrawTarget")
      header.modal-card-head
        p.modal-card-title {{ $t('cpd.withdrawTitle') }}
        button.delete(type="button" @click="closeWithdraw")
      section.modal-card-body
        p.cpd-modal-pledge {{ $t('cpd.withdrawQuestion') }}
        p.cpd-modal-declaration {{ $t('cpd.withdrawNote') }}
        p.cpd-write-error(v-if="writeError") {{ $t(writeError) }}
      footer.modal-card-foot
        b-button(type="is-primary" :loading="busy" @click="confirmWithdraw") {{ $t('cpd.withdraw') }}
        b-button(:disabled="busy" @click="closeWithdraw") {{ $t('cpd.cancel') }}
</template>

<script>
import { fetchWithTimeout } from '~/utils/fetchWithTimeout'

/**
 * The three claimable activities, as i18n key suffixes under `cpd.activityName.*`.
 * A LIST, not a map of English — the wording lives in the locale files. Mirrors
 * `server/utils/cpdCatalogue.js` ACTIVITIES; an activity absent from this list falls
 * back to its own code rather than rendering blank, so a fourth activity added to the
 * export is visibly unlabelled rather than invisible.
 */
const KNOWN_ACTIVITIES = ['video', 'reading', 'rehearsal']

/** Minutes in an hour — named so the two divisions below read as time, not arithmetic. */
const MINUTES_PER_HOUR = 60

export default {
  name: 'CpdRecord',

  props: {
    // Verified login pass (JWT). Defaults to the safe local-dev bypass token, matching
    // the parent screen. The server derives the advisor from it and never trusts a
    // client-supplied identity, so this component never sends an advisor id.
    apiToken: { type: String, default: 'dev-local-bypass' }
  },

  data () {
    return {
      loading: true,
      /** i18n KEY for a failed READ, or null. Never a sentence — see load(). */
      error: null,
      /** i18n KEY for a failed WRITE, or null. Separate: a read may be fine while a
       *  claim fails, and the two must not overwrite each other's message. */
      writeError: null,
      /** True while a claim is being recorded or withdrawn — disables every button so
       *  a double-click cannot record a second, unintended claim. */
      busy: false,
      totalMinutes: 0,
      templates: [],
      /** The claim awaiting the advisor's pledge: { templateTitle, activity }. */
      pledge: null,
      pledgeOpen: false,
      /** The activity whose most recent recording is awaiting confirmation. */
      withdrawTarget: null,
      withdrawOpen: false
    }
  },

  watch: {
    /**
     * Clear the pending pledge whenever the modal closes — including via Escape or a
     * click outside, which Buefy handles itself and which no method of ours sees.
     * Without this a failed claim's error message would still be on screen the next
     * time the advisor opened a different pledge.
     *
     * @param {boolean} open - the modal's new state.
     */
    pledgeOpen (open) {
      if (!open) {
        this.pledge = null
        this.writeError = null
      }
    },

    /**
     * The same clean-up for the withdrawal box, for the same reason — Escape and a
     * click outside are Buefy's to handle and no method of ours sees them.
     *
     * @param {boolean} open - the modal's new state.
     */
    withdrawOpen (open) {
      if (!open) {
        this.withdrawTarget = null
        this.writeError = null
      }
    }
  },

  mounted () {
    this.load()
  },

  methods: {
    /**
     * Load this advisor's own CPD record.
     *
     * Identity (advisor + firm) is derived server-side from the bearer pass and is
     * never sent in the request, so an advisor can only ever read their own record —
     * and can only ever be offered templates their own work has used.
     *
     * A failed read sets `error` rather than leaving zeros on screen: an unreachable
     * record and an advisor who has genuinely recorded nothing must not look the same.
     * `error` holds an i18n KEY, not a sentence, so no user-facing wording lives here.
     *
     * @param {boolean} [silent] - refresh in place, keeping the current content on
     *   screen instead of replacing it with the spinner. Used after a write, where
     *   blanking the section would read as though the record had been lost.
     * @returns {Promise<void>}
     */
    async load (silent) {
      if (!silent) { this.loading = true }
      this.error = null
      try {
        const res = await fetchWithTimeout('/api/activity/cpd', {
          headers: { Authorization: `Bearer ${this.apiToken}` }
        })
        if (!res.ok) {
          this.error = 'cpd.loadFailed'
          return
        }
        const data = await res.json()
        if (data.success) {
          this.totalMinutes = data.totalMinutes || 0
          this.templates = data.templates || []
        } else {
          this.error = 'cpd.loadFailed'
        }
      } catch (e) {
        this.error = 'advisorProgress.connectFailed'
      } finally {
        this.loading = false
      }
    },

    /**
     * Whole minutes as time an advisor would write on a CPD return: "4h 20m".
     *
     * Built from locale keys rather than string concatenation, so the h/m abbreviations
     * are translatable. Zero renders as "0m" rather than being hidden — a record with
     * nothing in it should say so.
     *
     * @param {number} minutes @returns {string}
     */
    formatMinutes (minutes) {
      const total = Number(minutes)
      const whole = Number.isFinite(total) && total > 0 ? Math.round(total) : 0
      const h = Math.floor(whole / MINUTES_PER_HOUR)
      const m = whole % MINUTES_PER_HOUR
      if (h && m) { return this.$t('cpd.hoursMinutes', { h, m }) }
      if (h) { return this.$t('cpd.hoursOnly', { h }) }
      return this.$t('cpd.minutesOnly', { m })
    },

    /**
     * One activity's label: its name, with the time it is worth in brackets.
     *
     * An activity the export no longer offers carries no minutes (`null`) and is
     * labelled by name alone — it is history, not an offer.
     *
     * @param {object} act - one activity from the backend's record.
     * @returns {string}
     */
    activityLabel (act) {
      const name = KNOWN_ACTIVITIES.includes(act.activity)
        ? this.$t(`cpd.activityName.${act.activity}`)
        : act.activity
      if (act.minutes === null || act.minutes === undefined) { return name }
      return this.$t('cpd.activityWithTime', { name, n: act.minutes })
    },

    /**
     * Open the pledge for one activity. Nothing is written at this point.
     *
     * @param {object} tpl - the template row the activity belongs to.
     * @param {object} act - the activity being claimed.
     */
    openPledge (tpl, act) {
      this.writeError = null
      this.pledge = { templateTitle: tpl.title, activity: act }
      this.pledgeOpen = true
    },

    /** Dismiss the pledge without recording anything. */
    closePledge () {
      this.pledgeOpen = false
    },

    /**
     * Record the pledged claim.
     *
     * The request names only the template and the activity: the minutes, the template's
     * real title and the wording of the pledge are all resolved server-side from the
     * master export, so nothing that gives the claim its value comes from this screen.
     *
     * On success the whole record is re-read rather than adjusted locally — the total
     * an advisor may declare is the server's figure, never one this screen computed.
     *
     * @returns {Promise<void>}
     */
    async confirmPledge () {
      if (!this.pledge || this.busy) { return }
      const body = {
        templateTitle: this.pledge.templateTitle,
        activity: this.pledge.activity.activity
      }
      this.busy = true
      this.writeError = null
      try {
        const res = await fetchWithTimeout('/api/activity/cpd/record', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiToken}`
          },
          body: JSON.stringify(body)
        })
        const data = res.ok ? await res.json() : null
        if (!data || !data.success) {
          this.writeError = 'cpd.recordFailed'
          return
        }
        this.pledgeOpen = false
        await this.load(true)
      } catch (e) {
        this.writeError = 'cpd.recordFailed'
      } finally {
        this.busy = false
      }
    },

    /**
     * Ask before withdrawing. Nothing is written at this point.
     *
     * @param {object} act - the activity to withdraw from.
     */
    openWithdraw (act) {
      this.writeError = null
      this.withdrawTarget = act
      this.withdrawOpen = true
    },

    /** Dismiss the confirmation without withdrawing anything. */
    closeWithdraw () {
      this.withdrawOpen = false
    },

    /**
     * Withdraw the most recent standing claim on one activity (owner ruling: a single
     * Withdraw, taking back the latest recording, rather than a line per claim).
     *
     * The row is not deleted — the server stamps it withdrawn, because a figure may
     * already have gone into a real CPD submission and a record that vanishes is worse
     * than one showing a claim made and later withdrawn.
     *
     * A failure leaves the confirmation open with the reason on it, exactly as a failed
     * pledge does: an advisor told nothing would believe the recording had gone.
     *
     * @returns {Promise<void>}
     */
    async confirmWithdraw () {
      if (!this.withdrawTarget || this.busy) { return }
      const claim = this.latestStandingClaim(this.withdrawTarget)
      // Nothing standing to withdraw. Can only happen if the record changed underneath
      // this screen; re-reading is more honest than reporting a failure that isn't one.
      // The box closes with it — leaving it open would invite a second press at nothing.
      if (!claim) { this.withdrawOpen = false; await this.load(true); return }

      this.busy = true
      this.writeError = null
      try {
        const res = await fetchWithTimeout('/api/activity/cpd/withdraw', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiToken}`
          },
          body: JSON.stringify({ claimId: claim.id })
        })
        const data = res.ok ? await res.json() : null
        if (!data || !data.success) {
          this.writeError = 'cpd.withdrawFailed'
          return
        }
        this.withdrawOpen = false
        await this.load(true)
      } catch (e) {
        this.writeError = 'cpd.withdrawFailed'
      } finally {
        this.busy = false
      }
    },

    /**
     * The newest claim on an activity that has not already been withdrawn.
     *
     * Ordered by when it was claimed, with the higher id breaking a tie — two claims
     * can share a timestamp (the same minute, or a date column with no sub-second
     * precision), and "most recent" must still resolve to exactly one row.
     *
     * @param {object} act - one activity from the backend's record.
     * @returns {object|null} the claim to withdraw, or null when none is standing.
     */
    latestStandingClaim (act) {
      const standing = (act.claims || []).filter(c => c && !c.withdrawnAt)
      if (!standing.length) { return null }
      return standing.reduce((best, c) => {
        const bt = this.claimTime(best)
        const ct = this.claimTime(c)
        if (ct > bt) { return c }
        if (ct === bt && Number(c.id) > Number(best.id)) { return c }
        return best
      })
    },

    /**
     * A claim's timestamp as a number for ordering. A missing or unreadable date sorts
     * oldest rather than newest, so a row with no date can never be mistaken for the
     * latest one and withdrawn in place of it.
     *
     * @param {object} claim @returns {number}
     */
    claimTime (claim) {
      const t = claim && claim.claimedAt ? new Date(claim.claimedAt).getTime() : NaN
      return Number.isFinite(t) ? t : -Infinity
    }
  }
}
</script>

<style scoped>
/* Matches the surrounding My Progress screen (hand-styled cards), not the Buefy
   tables of the Firm Manager Hub — this section sits inside that screen. */
.cpd-record { padding: 0 24px 24px; }

.cpd-head { margin-bottom: 10px; }
.cpd-title { font-size: 14px; font-weight: 600; color: #374151; margin: 0 0 2px; }
.cpd-sub { font-size: 11px; color: #9ca3af; margin: 0; }

/* ── Loading / error ── */
.cpd-loading { padding: 20px 0; text-align: center; }
.cpd-spinner {
  width: 22px; height: 22px;
  border: 3px solid #e5e7eb;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: cpd-spin 0.8s linear infinite;
  margin: 0 auto;
}
@keyframes cpd-spin { to { transform: rotate(360deg); } }

.cpd-error { padding: 16px 0; }
.cpd-error-msg { color: #ef4444; font-size: 13px; margin: 0 0 10px; }
.btn-cpd-retry {
  background: #f3f4f6; border: 1px solid #d1d5db;
  border-radius: 6px; padding: 5px 12px;
  font-size: 12px; cursor: pointer; color: #374151;
}
.btn-cpd-retry:hover { background: #e5e7eb; }

.cpd-write-error { color: #ef4444; font-size: 12px; margin: 0 0 10px; }

/* ── Total + empty state ── */
.cpd-total {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 12px;
}
.cpd-empty {
  margin: 0;
  padding: 14px 16px;
  background: #f9fafb;
  border: 1px solid #f3f4f6;
  border-radius: 8px;
  font-size: 12px;
  color: #6b7280;
}

/* ── One template, with its activities ── */
.cpd-template {
  background: #fff;
  border: 1px solid #f3f4f6;
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 8px;
}
.cpd-template-title {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 8px;
}
.cpd-activity {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  border-top: 1px solid #f9fafb;
}
.cpd-activity:first-of-type { border-top: none; }
.cpd-activity-main { flex: 1; min-width: 0; }
.cpd-activity-label { font-size: 12px; color: #374151; display: block; }
.cpd-activity-claimed { font-size: 11px; color: #16a34a; display: block; margin-top: 2px; }
.cpd-activity-actions { display: flex; gap: 6px; flex-shrink: 0; }

.btn-cpd-record, .btn-cpd-withdraw {
  border-radius: 6px;
  padding: 4px 12px;
  font-size: 12px;
  cursor: pointer;
}
.btn-cpd-record { background: #4f46e5; border: 1px solid #4f46e5; color: #fff; }
.btn-cpd-record:hover:not(:disabled) { background: #4338ca; }
.btn-cpd-withdraw { background: #fff; border: 1px solid #d1d5db; color: #6b7280; }
.btn-cpd-withdraw:hover:not(:disabled) { background: #f9fafb; color: #374151; }
.btn-cpd-record:disabled, .btn-cpd-withdraw:disabled { opacity: 0.5; cursor: default; }

/* ── The pledge ── */
.cpd-modal { max-width: 480px; }
.cpd-modal-activity { font-size: 13px; color: #6b7280; margin-bottom: 10px; }
.cpd-modal-pledge { font-size: 15px; color: #111827; font-weight: 600; margin-bottom: 10px; }
.cpd-modal-declaration { font-size: 12px; color: #6b7280; }
</style>
