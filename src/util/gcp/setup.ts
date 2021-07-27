import cli from 'cli-ux'
import paths from '../paths'
import execUtil from './exec'
import { existsSync, mkdirSync } from 'fs'

const makeDir = (path: string) => {
  if (!existsSync(path)) {
    mkdirSync(path)
  }
}

export async function gcpSetup() {
  // Check for gcloud config
  // ~/.config/gcloud/configurations/config_default

  if (existsSync(paths.PILOT_AWS_CREDENTIALS)) {
    console.log('gcloud Credentials detected')
    if (!existsSync(paths.PILOT_AWS_CONFIG)) {
      console.log('AWS config not found at ~/.aws/config.')
      return
    }
    console.log('gcloud Configuration detected')
  } else {
    console.log(`No gcloud configuration found. Please configure gcloud in ${paths.GCP_CONFIG}.`)
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
  console.log('Please allow a few minutes for the remote server\'s configuration')

  // install waypoint post gcloud initialization
  cli.action.start('Setting up your remote Waypoint server')
  //await execUtil.installWaypoint()
  cli.action.stop()
}