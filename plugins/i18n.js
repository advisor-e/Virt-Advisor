import Vue from 'vue'
import VueI18n from 'vue-i18n'
import en from '../locales/en.json'
import fr from '../locales/fr.json'
import es from '../locales/es.json'
import de from '../locales/de.json'
import pt from '../locales/pt.json'
import it from '../locales/it.json'
import nl from '../locales/nl.json'
import pl from '../locales/pl.json'
import collaborateEn from '../locales/collaborate/en.json'
import { mergeSections, COLLABORATE_SECTIONS } from '../utils/i18nMessages'

Vue.use(VueI18n)

// Collaborate's wording joins English only. Its file has no other translations,
// and `fallbackLocale: 'en'` already means a French reader sees the English
// string rather than a raw key — the same behaviour as any of our own untranslated
// keys, so nothing new is needed here when the other seven locales catch up.
const enMessages = mergeSections(en, collaborateEn, COLLABORATE_SECTIONS)

/**
 * Date formats for `$d(date, 'long')`.
 *
 * 🔴 THERE WERE NONE UNTIL 2026-09-07, AND `$d` RETURNS AN EMPTY STRING WHEN THE FORMAT IT
 * IS ASKED FOR DOES NOT EXIST. It failed silently: `runMeta` reads "Run {run} · researched
 * {date} · …" and had been rendering as "Run 1 · researched · 17 sources" — on the advisor's
 * screen AND in the client's printed funding pack, where the date the research was made is
 * the whole basis of the assessment. Found by a live run, not by a test: the component tests
 * stub `$d`, so they agreed with the fault.
 *
 * The options are one object shared by every locale on purpose — `Intl` writes the month in
 * each language from the same instruction, which is the point of using `$d` rather than
 * assembling a date in a component.
 */
const LONG_DATE = { year: 'numeric', month: 'long', day: 'numeric' }
const LOCALES = ['en', 'fr', 'es', 'de', 'pt', 'it', 'nl', 'pl']
const dateTimeFormats = LOCALES.reduce((out, locale) => {
  out[locale] = { long: LONG_DATE }
  return out
}, {})

export default ({ app }) => {
  app.i18n = new VueI18n({
    locale: 'en',
    fallbackLocale: 'en',
    messages: { en: enMessages, fr, es, de, pt, it, nl, pl },
    dateTimeFormats
  })
}

export { dateTimeFormats, LOCALES }
