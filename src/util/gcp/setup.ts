import cli from 'cli-ux'
import paths from '../paths'
import execUtil from './exec'
import { existsSync } from 'fs'
import fs from '../fs'
import waypoint from '../waypoint'

export async function gcpSetup() {
  // Check for gcloud config
  // ~/.pilot/gcp/config
  try {
    // if (existsSync(paths.PILOT_GCP_CONFIG)) {
    //   console.log('gcloud Credentials detected')
    //   if (!existsSync(paths.PILOT_AWS_CONFIG)) {
    //     console.log('AWS config not found at ~/.aws/config.')
    //     return
    //   }
    //   console.log('gcloud Configuration detected')
    // } else {
    //   console.log(`No gcloud configuration found. Please configure gcloud in ${paths.GCP_CONFIG}.`)
    //   return
    // }

    console.log('Setting up resources...')

    await fs.mkDir(paths.appRoot + '/templates')

    if (!existsSync(paths.PILOT_SSH)) {
      await fs.sshKeyGen()
      console.log('Successfully generated SSH keys')
    }

    // Generate yaml file for cloud-init
    await fs.genCloudInitYaml()
    console.log('Successfully generated cloud init')

    // Configure GCP IAM user / role
    // TODO: DYNAMIC PROJECT
    cli.action.start('Configuring IAM user and role for Pilot on GCP')
    await execUtil.pilotUserInit('gcp-pilot-testing', false)
    cli.action.stop()

    // terraform init
    cli.action.start('Initializing Terraform')
    await execUtil.terraInit()
    cli.action.stop()

    // terrform apply --auto-approve
    cli.action.start('Provisioning resources')
    await execUtil.terraApply()
    cli.action.stop()
    console.log('Please allow a few minutes for the remote server\'s configuration')

    cli.action.start('GCE instance initializing...')

    const reachable = await execUtil.serverReachability(360)

    if (!reachable) {
      cli.error('GCE instance initialization timed out')
    }
    cli.action.stop()

    // install waypoint post gcloud initialization
    cli.action.start('Setting up your remote Waypoint server')
    await execUtil.installWaypoint()
    cli.action.stop()

    // TODO: metadata

    cli.action.start('Setting context')
    await execUtil.setContext()
    cli.action.stop()

    cli.action.start('Configuring runner')
    await execUtil.pilotUserInit('gcp-pilot-testing', true)
    await waypoint.setDefaultContext()
    await execUtil.configureRunner()
    cli.action.stop()
  } catch (error) {
    cli.error(error)
  }
}
