'use strict'

/**
 * driveService — Google Drive file operations for the Firm Manager hub.
 *
 * INTEGRATION NOTE (for Advisor-e team):
 *   1. Place the service account JSON key at the path set in
 *      DRIVE.credentialsPath (config/integration.js).
 *   2. Set DRIVE.baseFolderId to the Google Drive folder ID of /VirtAdvisor/.
 *      Create this folder in Drive manually and copy the ID from the URL.
 *   3. Grant the service account "Editor" access to the /VirtAdvisor/ folder.
 *
 * Drive folder structure managed by this service:
 *
 *   /VirtAdvisor/                     ← DRIVE.baseFolderId
 *     /base/
 *       /logic-tables/                ← platform PDFs (platform_admin only)
 *       /domain-support/
 *       /templates/
 *     /firms/
 *       /{firmId}/
 *         /logic-tables/              ← firm override PDFs
 *         /domain-support/
 *         /templates/
 *         /videos/                    ← JSON metadata for video links
 *         /json-config/               ← firm JSON framework overrides
 */

const { Readable } = require('stream')
const fs = require('fs')
const path = require('path')
const { google } = require('googleapis')
const { DRIVE } = require('../../config/integration')

let _drive = null

function getDrive () {
  if (_drive) { return _drive }
  const keyPath = path.resolve(DRIVE.credentialsPath)
  const credentials = JSON.parse(fs.readFileSync(keyPath, 'utf8'))
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive']
  })
  _drive = google.drive({ version: 'v3', auth })
  return _drive
}

// ── Folder helpers ────────────────────────────────────────────────────────────

async function findOrCreateFolder (name, parentId) {
  const drive = getDrive()
  const safeName = name.replace(/'/g, "\\'")
  const res = await drive.files.list({
    q: `name='${safeName}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
    fields: 'files(id)',
    spaces: 'drive'
  })
  if (res.data.files.length > 0) { return res.data.files[0].id }
  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId]
    },
    fields: 'id'
  })
  return created.data.id
}

async function getFirmFolderMap (firmId) {
  const firmsRoot = await findOrCreateFolder('firms', DRIVE.baseFolderId)
  const firmRoot = await findOrCreateFolder(firmId, firmsRoot)
  const map = {}
  for (const [key, folderName] of Object.entries(DRIVE.categories)) {
    map[key] = await findOrCreateFolder(folderName, firmRoot)
  }
  return map
}

async function getBaseFolderMap () {
  const baseRoot = await findOrCreateFolder('base', DRIVE.baseFolderId)
  const map = {}
  const baseCategories = ['LOGIC_TABLES', 'DOMAIN_SUPPORT', 'TEMPLATES']
  for (const key of baseCategories) {
    map[key] = await findOrCreateFolder(DRIVE.categories[key], baseRoot)
  }
  return map
}

// ── Core file operations ──────────────────────────────────────────────────────

async function listFilesInFolder (folderId) {
  const drive = getDrive()
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: 'files(id,name,mimeType,size,createdTime)',
    spaces: 'drive',
    orderBy: 'name'
  })
  return res.data.files || []
}

async function uploadToFolder ({ folderId, fileName, mimeType, buffer }) {
  const drive = getDrive()
  const stream = Readable.from(buffer)
  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId]
    },
    media: {
      mimeType,
      body: stream
    },
    fields: 'id,name,size,createdTime'
  })
  return res.data
}

async function streamFileById (fileId) {
  const drive = getDrive()
  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  )
  return res.data
}

async function deleteFileById (fileId) {
  const drive = getDrive()
  await drive.files.delete({ fileId })
}

// ── Public API ────────────────────────────────────────────────────────────────

async function listFirmDocuments (firmId, categoryKey) {
  const map = await getFirmFolderMap(firmId)
  return listFilesInFolder(map[categoryKey])
}

async function listBaseDocuments (categoryKey) {
  const map = await getBaseFolderMap()
  return listFilesInFolder(map[categoryKey])
}

async function uploadFirmDocument (firmId, categoryKey, fileName, mimeType, buffer) {
  const map = await getFirmFolderMap(firmId)
  return uploadToFolder({ folderId: map[categoryKey], fileName, mimeType, buffer })
}

function downloadDocument (fileId) {
  return streamFileById(fileId)
}

function deleteFirmDocument (fileId) {
  return deleteFileById(fileId)
}

module.exports = {
  listFirmDocuments,
  listBaseDocuments,
  uploadFirmDocument,
  downloadDocument,
  deleteFirmDocument
}
