/**
 * The meeting lengths an advisor chooses from — the Virtual Advisor's session-length picker
 * and the Strategy Planner's guided questions (item 15.31) read this one list, so the two
 * screens always offer the same choices.
 *
 * `OTHER` is the choice that asks for a typed number of minutes.
 */
export const OTHER = 'Other'

export const SESSION_LENGTH_OPTIONS = Object.freeze(['30 mins', '60 mins', '90 mins', '120 mins', OTHER])
