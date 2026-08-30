import Vue from 'vue'
import {
  Autocomplete,
  Button,
  Checkbox,
  Dialog,
  Dropdown,
  Field,
  Icon,
  Input,
  Loading,
  Menu,
  Message,
  Modal,
  Notification,
  Select,
  Switch,
  Table,
  Tabs,
  Tag,
  Taginput,
  Toast,
  Upload
} from 'buefy'

/**
 * Buefy, registered one component at a time rather than as the whole library.
 *
 * WHY THIS IS NOT `Vue.use(Buefy)`: that registers all ~40 Buefy components whether or
 * not a screen uses them. This app uses 24 tags, which map to the 21 plugins below. The
 * whole-library import put first-load JS at 312 KB gzipped, over the 300 KB budget in
 * CLAUDE.md → Performance.
 *
 * 🔴 ADDING A NEW `b-*` TAG TO A TEMPLATE? REGISTER IT HERE FIRST.
 * An unregistered Buefy component does not error — Vue renders nothing and the screen is
 * silently short of a control. If you add `<b-datepicker>` to a page, add `Datepicker` to
 * the import and to the list below, or it will not appear.
 *
 * Each plugin registers its own sub-components, so these 21 cover all 24 tags in use:
 * Table → b-table + b-table-column · Tabs → b-tabs + b-tab-item ·
 * Dropdown → b-dropdown + b-dropdown-item · Menu → b-menu + b-menu-list + b-menu-item ·
 * Tag → b-tag + b-taglist.
 *
 * Dialog and Toast are registered for their programmatic APIs (`this.$buefy.dialog`,
 * `this.$buefy.toast`), not for any tag in a template.
 *
 * Buefy's defaults (including `defaultIconPack: 'mdi'`, which pairs with the @mdi/font
 * stylesheet in nuxt.config.js) live in its own config module and apply either way — the
 * former `Vue.use(Buefy)` passed no options, so behaviour is unchanged.
 */
const components = [
  Autocomplete,
  Button,
  Checkbox,
  Dialog,
  Dropdown,
  Field,
  Icon,
  Input,
  Loading,
  Menu,
  Message,
  Modal,
  Notification,
  Select,
  Switch,
  Table,
  Tabs,
  Tag,
  Taginput,
  Toast,
  Upload
]

components.forEach(component => Vue.use(component))
