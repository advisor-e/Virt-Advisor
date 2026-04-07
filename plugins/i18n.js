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

Vue.use(VueI18n)

export default ({ app }) => {
  app.i18n = new VueI18n({
    locale: 'en',
    fallbackLocale: 'en',
    messages: { en, fr, es, de, pt, it, nl, pl }
  })
}
