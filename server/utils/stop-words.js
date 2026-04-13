/**
 * Shared stop-words set — used by templates.js and summaries.js for keyword filtering.
 * Defined once here to prevent divergence between the two files.
 */

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'has',
  'her', 'was', 'one', 'our', 'out', 'day', 'get', 'him', 'his',
  'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who',
  'with', 'have', 'this', 'will', 'your', 'from', 'they', 'know', 'want',
  'been', 'good', 'much', 'some', 'time', 'very', 'when', 'come', 'here',
  'just', 'like', 'long', 'make', 'many', 'more', 'only', 'over', 'such',
  'take', 'than', 'them', 'well', 'were', 'what', 'help', 'need', 'their',
  'about', 'client', 'clients', 'business', 'advisor', 'template'
])

module.exports = { STOP_WORDS }
