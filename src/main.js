import * as cache from '@actions/cache'
import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'
import { HttpClient } from '@actions/http-client'

import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import https from 'https'

const apeInstallUrl =
  'https://raw.githubusercontent.com/jart/cosmopolitan/master/ape/apeinstall.sh'

const COSMO_REPO = 'jart/cosmopolitan'
const NIGHTLY_WORKFLOW = 'nightly-cosmocc.yml'

async function resolveNightlyUrl(token) {
  const http = new HttpClient('setup-cosmopolitan', [], {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json'
    }
  })

  const runsUrl = `https://api.github.com/repos/${COSMO_REPO}/actions/workflows/${NIGHTLY_WORKFLOW}/runs?status=success&per_page=1`
  const runsRes = await http.getJson(runsUrl)

  if (
    !runsRes.result ||
    !runsRes.result.workflow_runs ||
    runsRes.result.workflow_runs.length === 0
  ) {
    throw new Error(
      'No successful nightly workflow runs found for cosmopolitan'
    )
  }

  const runId = runsRes.result.workflow_runs[0].id
  core.info(`Found nightly run: ${runId}`)

  const artifactsUrl = `https://api.github.com/repos/${COSMO_REPO}/actions/runs/${runId}/artifacts`
  const artifactsRes = await http.getJson(artifactsUrl)

  if (
    !artifactsRes.result ||
    !artifactsRes.result.artifacts ||
    artifactsRes.result.artifacts.length === 0
  ) {
    throw new Error(`No artifacts found for nightly run ${runId}`)
  }

  const artifact = artifactsRes.result.artifacts[0]
  core.info(`Found nightly artifact: ${artifact.name}`)

  return artifact.archive_download_url
}

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
async function run() {
  try {
    const version = core.getInput('version', { required: false })
    const customUrl = core.getInput('url', { required: false })

    if (!version && !customUrl) {
      throw new Error('Either "version" or "url" must be provided')
    }

    const userPath = core.getInput('path', { required: false })
    if (userPath[0] === '/' || userPath[0] === '~') {
      throw new Error('Path must be relative to the workspace')
    }

    if (version && version !== 'nightly') {
      const cachedDir = tc.find('cosmocc', version)
      if (fs.existsSync(cachedDir)) {
        core.addPath(path.join(cachedDir, 'bin'))
        await install(cachedDir)
        return
      }

      const cosmopolitanPath = path.join(process.env.GITHUB_WORKSPACE, userPath)

      const cacheKey = `cosmocc-${version}`
      const cacheKeyId = await cache.restoreCache([cosmopolitanPath], cacheKey)
      if (cacheKeyId !== undefined) {
        core.addPath(path.join(cosmopolitanPath, 'bin'))
        await install(cosmopolitanPath)
        return
      }

      const urlBase = 'https://cosmo.zip/pub/cosmocc/'
      const url = customUrl
        ? customUrl
        : version === 'latest'
          ? `${urlBase}cosmocc.zip`
          : `${urlBase}cosmocc-${version}.zip`
      const cosmopolitan = await tc.downloadTool(url)
      await tc.extractZip(cosmopolitan, cosmopolitanPath)
      core.addPath(path.join(cosmopolitanPath, 'bin'))

      const cachedPath = await tc.cacheDir(cosmopolitanPath, 'cosmocc', version)
      await cache.saveCache([cosmopolitanPath], cacheKey)

      await install(cachedPath)
    } else {
      const cosmopolitanPath = path.join(process.env.GITHUB_WORKSPACE, userPath)

      let url
      let auth
      if (version === 'nightly') {
        const githubToken = core.getInput('github-token', { required: true })
        url = await resolveNightlyUrl(githubToken)
        auth = `token ${githubToken}`
      } else {
        url = customUrl
      }

      const cosmopolitan = await tc.downloadTool(url, undefined, auth)
      await tc.extractZip(cosmopolitan, cosmopolitanPath)
      core.addPath(path.join(cosmopolitanPath, 'bin'))

      await install(cosmopolitanPath)
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    core.setFailed(error.message)
  }
}

const downloadScript = async (url, destination) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination)
    https
      .get(url, response => {
        response.pipe(file)
        file.on('finish', () => {
          file.close(() => resolve(destination))
        })
      })
      .on('error', err => {
        fs.unlink(destination)
        reject(err.message)
      })
  })
}

async function install(cosmopolitanPath) {
  https.get
  await downloadScript(apeInstallUrl, 'apeinstall.sh')

  fs.chmodSync('apeinstall.sh', 0o755)

  exec(
    `sudo sh -c "COSMO=${cosmopolitanPath} ./apeinstall.sh"`,
    (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing script: ${error}`)
        return
      }
      if (stderr) {
        console.error(`Script stderr: ${stderr}`)
      }
      console.log(`Script output: ${stdout}`)
    }
  )
}

export { run }
