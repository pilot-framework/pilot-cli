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

  if (fs.existsSync(paths.PILOT_AWS_CREDENTIALS)) {
    this.log('gcloud Credentials detected')
    if (!fs.existsSync(paths.PILOT_AWS_CONFIG)) {
      this.log('AWS config not found at ~/.aws/config.')
      return
    }
    this.log('gcloud Configuration detected')
  } else {
    this.log(`No gcloud configuration found. Please configure gcloud in ${paths.GCP_CONFIG}.`)
    return
  }  

    // terraform init
  cli.action.start('Initializing Terraform')
  await execUtil.terraInit()
  cli.action.stop()

  // terrform apply --auto-approve
  cli.action.start('Provisioning resources')
  await execUtil.terraApply()
  cli.action.stop()
  this.log('Please allow a few minutes for the remote server\'s configuration')

  // install waypoint post gcloud initialization
  cli.action.start('Setting up your remote Waypoint server')
  //await execUtil.installWaypoint()
  cli.action.stop()
}