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

export default ({ app }) => {
  app.i18n = new VueI18n({
    locale: 'en',
    fallbackLocale: 'en',
    messages: { en: enMessages, fr, es, de, pt, it, nl, pl }
  })
}
