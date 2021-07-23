import cli from 'cli-ux'
import paths from '../paths'
import execUtil from './exec'

const fs = require('fs')

const CWD = process.cwd()

const makeDir = (path: string) => {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path)
  }
}

export async function gcpSetup() {
  // Check for gcloud config
  // ~/.config/gcloud/configurations/config_default
}