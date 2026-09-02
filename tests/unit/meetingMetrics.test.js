'use strict'

/**
 * The mechanical measures behind My Coaching Notes.
 *
 * 🔴 WHY THESE EARN A TEST WHEN UAT LOOKS AT THE SAME SCREEN. Every figure here is a number an
 * advisor is invited to draw a conclusion from — *"you spoke for 78% of a discovery meeting"* —
 * and the approved drawing prints "none of these can be wrong" underneath them. A person in UAT
 * sees a plausible percentage and has no way to know it is the wrong one. The arithmetic is
 * exactly the class of thing CLAUDE.md says a test must catch and a human tester cannot.
 *
 * Design: `design/features/meeting-review.md` P9, §3.
 */

const {
  asClock,
  usableSegments,
  talkTime,
  longestMonologue,
  questionsIn,
  isOpenQuestion,
  questionMix,
  pauseAfterAsking,
  meetingLength,
  computeMetrics
} = require('../../server/utils/meetingMetrics')

const seg = (role, start, end, text) => ({ role, start, end, text: text || '' })

describe('meetingMetrics — reading the transcript', () => {
  it('drops segments whose timings cannot be trusted rather than defaulting them', () => {
    const rows = usableSegments({
      segments: [
        seg('advisor', 0, 5, 'good'),
        seg('client', 'x', 9, 'bad start'),
        seg('client', 9, 4, 'ends before it begins'),
        seg('advisor', -1, 3, 'negative start'),
        null,
        seg('client', 6, 8, 'good')
      ]
    })
    expect(rows).toHaveLength(2)
    // A zero-length turn admitted here would silently deflate every ratio below it.
    expect(rows.every(r => r.end > r.start)).toBe(true)
  })

  it('sorts by start time, so an out-of-order transcript measures the same', () => {
    const rows = usableSegments({ segments: [seg('client', 10, 12), seg('advisor', 0, 5)] })
    expect(rows.map(r => r.start)).toEqual([0, 10])
  })

  it('treats an unknown role as neither party', () => {
    const rows = usableSegments({ segments: [seg('nobody', 0, 5)] })
    expect(rows[0].role).toBe('unknown')
  })
})

describe('meetingMetrics — who spoke', () => {
  it('measures share of SPEECH, not of the clock', () => {
    // 20s of speech inside a 100s meeting: the 80s of silence belongs to neither party.
    const rows = usableSegments({ segments: [seg('advisor', 0, 15), seg('client', 95, 100)] })
    const split = talkTime(rows)
    expect(split.advisorPercent).toBe(75)
    expect(split.clientPercent).toBe(25)
  })

  it('always returns two shares that sum to 100', () => {
    const rows = usableSegments({ segments: [seg('advisor', 0, 10), seg('client', 10, 13)] })
    const split = talkTime(rows)
    expect(split.advisorPercent + split.clientPercent).toBe(100)
  })

  it('reports null shares rather than 0% when nobody was attributed', () => {
    const split = talkTime(usableSegments({ segments: [seg('unknown', 0, 30)] }))
    expect(split.advisorPercent).toBeNull()
    expect(split.clientPercent).toBeNull()
  })
})

describe('meetingMetrics — the longest stretch', () => {
  it('is not broken by a short client interjection', () => {
    const rows = usableSegments({
      segments: [seg('advisor', 0, 10), seg('client', 10, 11, 'mm'), seg('advisor', 11, 20)]
    })
    expect(longestMonologue(rows).seconds).toBe(20)
  })

  it('IS broken by a real client turn', () => {
    const rows = usableSegments({
      segments: [seg('advisor', 0, 10), seg('client', 10, 25, 'a real answer'), seg('advisor', 25, 30)]
    })
    // Ten, not thirty: the client genuinely had the floor in between.
    expect(longestMonologue(rows).seconds).toBe(10)
  })

  it('is zero when the advisor never spoke', () => {
    expect(longestMonologue(usableSegments({ segments: [seg('client', 0, 40)] })).seconds).toBe(0)
  })

  it('renders as m:ss', () => {
    expect(asClock(252)).toBe('4:12')
    expect(asClock(9)).toBe('0:09')
    expect(asClock(0)).toBe('0:00')
  })
})

describe('meetingMetrics — questions', () => {
  it('finds every question in one turn of speech', () => {
    expect(questionsIn('That is the position. What do you think? Shall we move on?')).toHaveLength(2)
  })

  it('treats a turn with a question mark but no sentence break as one question', () => {
    expect(questionsIn('so where does that leave the margin?')).toHaveLength(1)
  })

  it('finds none where there is no question at all', () => {
    expect(questionsIn('The margin fell to 18.5 per cent.')).toEqual([])
  })

  it('classifies open and closed by their opening word', () => {
    expect(isOpenQuestion('What worries you about that?')).toBe(true)
    expect(isOpenQuestion('How did that come about?')).toBe(true)
    expect(isOpenQuestion('Walk me through the renewals?')).toBe(true)
    expect(isOpenQuestion('Did that worry you?')).toBe(false)
    expect(isOpenQuestion('Is the margin acceptable?')).toBe(false)
  })

  it('ignores leading punctuation and case when classifying', () => {
    expect(isOpenQuestion('  "Why is that?"')).toBe(true)
  })

  it('counts only the ADVISER’s questions', () => {
    const rows = usableSegments({
      segments: [
        seg('advisor', 0, 5, 'What worries you? Is it the renewals?'),
        seg('client', 5, 9, 'Why would it be?')
      ]
    })
    const mix = questionMix(rows)
    // The client's question is not the advisor's practice and must not flatter it.
    expect(mix).toEqual({ open: 1, closed: 1, total: 2 })
  })
})

describe('meetingMetrics — the pause after asking', () => {
  it('measures only the silences the ADVISER filled themselves', () => {
    const rows = usableSegments({
      segments: [
        seg('advisor', 0, 5, 'What do you think?'),
        seg('advisor', 6, 8, 'Because I would say the margin.'),
        seg('advisor', 20, 25, 'And what about the renewals?'),
        seg('client', 27, 40, 'Well, they worry me.')
      ]
    })
    const pause = pauseAfterAsking(rows)
    // One occasion, not two: the question the client answered had no "before you spoke again".
    expect(pause.occasions).toBe(1)
    expect(pause.medianSeconds).toBe(1)
  })

  it('takes the median of several, not the mean, so one long think does not hide the habit', () => {
    const rows = usableSegments({
      segments: [
        seg('advisor', 0, 5, 'What do you think?'), seg('advisor', 5.5, 6),
        seg('advisor', 10, 15, 'And that?'), seg('advisor', 16, 17),
        seg('advisor', 20, 25, 'And this?'), seg('advisor', 55, 60)
      ]
    })
    // Gaps of 0.5, 1 and 30 — the median is 1, the mean would have been over ten.
    expect(pauseAfterAsking(rows).medianSeconds).toBe(1)
  })

  it('reports null rather than zero when the adviser always left space', () => {
    const rows = usableSegments({
      segments: [seg('advisor', 0, 5, 'What do you think?'), seg('client', 5, 20, 'A lot.')]
    })
    expect(pauseAfterAsking(rows)).toEqual({ medianSeconds: null, occasions: 0 })
  })

  it('ignores a gap too small to be a silence anybody experienced', () => {
    const rows = usableSegments({
      segments: [seg('advisor', 0, 5, 'What do you think?'), seg('advisor', 5.05, 8)]
    })
    expect(pauseAfterAsking(rows).occasions).toBe(0)
  })
})

describe('meetingMetrics — the whole set', () => {
  it('measures the meeting from first word to last', () => {
    const rows = usableSegments({ segments: [seg('advisor', 10, 20), seg('client', 30, 100)] })
    expect(meetingLength(rows).seconds).toBe(90)
  })

  it('treats a transcript that never recorded attribution as NOT confident', () => {
    // 🔴 The safe default for "we do not know whether we could tell the speakers apart" is
    // that we could not. §5 trap 1 — degraded attribution must fail visibly.
    const metrics = computeMetrics({ segments: [seg('advisor', 0, 5)] })
    expect(metrics.attributionConfident).toBe(false)
  })

  it('carries a confident flag through when the transcript recorded one', () => {
    const metrics = computeMetrics({ segments: [seg('advisor', 0, 5)], attributionConfident: true })
    expect(metrics.attributionConfident).toBe(true)
  })

  it('reports an empty transcript as unusable rather than as a meeting of zeroes', () => {
    const metrics = computeMetrics({ segments: [] })
    expect(metrics.usable).toBe(false)
    expect(metrics.segmentCount).toBe(0)
  })

  it('survives a transcript that is missing, null or the wrong shape', () => {
    expect(computeMetrics(null).usable).toBe(false)
    expect(computeMetrics(undefined).usable).toBe(false)
    expect(computeMetrics({}).usable).toBe(false)
    expect(computeMetrics({ segments: 'not an array' }).usable).toBe(false)
  })
})
