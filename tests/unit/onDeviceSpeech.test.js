'use strict'

/**
 * utils/onDeviceSpeech.js — item 12.2. Every microphone in the app is built from these four
 * functions, and the one guarantee they carry is that speech never leaves the computer: in
 * Chrome the recogniser sends audio to Google unless `processLocally` is on, and anything Chrome
 * cannot confirm is on-device must read as UNAVAILABLE (Mike's ruling D1, 2026-09-24), never as
 * a quiet fallback. A person in UAT cannot see where the audio went; these tests can.
 */

const {
  SPEECH_STATE, recognitionClass, createOnDeviceRecognition, checkOnDevice, installOnDevice
} = require('../../utils/onDeviceSpeech')

describe('recognitionClass', () => {
  test('finds the standard or the prefixed class, or none', () => {
    function SR () {}
    expect(recognitionClass({ SpeechRecognition: SR })).toBe(SR)
    expect(recognitionClass({ webkitSpeechRecognition: SR })).toBe(SR)
    expect(recognitionClass({})).toBeNull()
    expect(recognitionClass(undefined)).toBeNull()
  })
})

describe('createOnDeviceRecognition', () => {
  test('turns processLocally on before handing the recogniser back', () => {
    function SR () { this.processLocally = false }
    expect(createOnDeviceRecognition(SR).processLocally).toBe(true)
  })
})

describe('checkOnDevice', () => {
  const SR = answer => ({ available: jest.fn(() => Promise.resolve(answer)) })

  test.each([
    ['available', 'ready'],
    ['downloadable', 'needsInstall'],
    ['downloading', 'needsInstall'],
    ['unavailable', 'unavailable'],
    ['something new', 'unavailable']
  ])('Chrome says %s → %s', async (answer, expected) => {
    expect(await checkOnDevice(SR(answer), 'en-US')).toBe(expected)
  })

  test('always asks about on-device recognition, for the one language', async () => {
    const s = SR('available')
    await checkOnDevice(s, 'fr-FR')
    expect(s.available).toHaveBeenCalledWith({ langs: ['fr-FR'], processLocally: true })
  })

  test('a browser that cannot answer has no on-device mode, so it is unavailable', async () => {
    expect(await checkOnDevice({}, 'en-US')).toBe('unavailable')
    expect(await checkOnDevice(null, 'en-US')).toBe('unavailable')
  })

  test('a question that throws is unavailable, never a fallback', async () => {
    expect(await checkOnDevice({ available: () => Promise.reject(new Error('x')) }, 'en-US')).toBe('unavailable')
  })
})

describe('installOnDevice', () => {
  test('true only when Chrome confirms the pack', async () => {
    expect(await installOnDevice({ install: () => Promise.resolve(true) }, 'en-US')).toBe(true)
    expect(await installOnDevice({ install: () => Promise.resolve(false) }, 'en-US')).toBe(false)
    expect(await installOnDevice({ install: () => Promise.resolve('yes') }, 'en-US')).toBe(false)
  })

  test('asks for the on-device pack for the one language', async () => {
    const install = jest.fn(() => Promise.resolve(true))
    await installOnDevice({ install }, 'de-DE')
    expect(install).toHaveBeenCalledWith({ langs: ['de-DE'], processLocally: true })
  })

  test('a failure or a missing install is false, never a throw', async () => {
    expect(await installOnDevice({ install: () => Promise.reject(new Error('offline')) }, 'en-US')).toBe(false)
    expect(await installOnDevice({}, 'en-US')).toBe(false)
  })
})

describe('SPEECH_STATE', () => {
  test('cannot be changed at runtime', () => {
    expect(Object.isFrozen(SPEECH_STATE)).toBe(true)
  })
})
