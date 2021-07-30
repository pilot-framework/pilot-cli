import cli from 'cli-ux'
import paths from '../paths'
import execUtil from './exec'
import { existsSync } from 'fs'
import fs from '../fs'
import waypoint from '../waypoint'
import { SetupOpts } from '../../commands/setup'
import { pilotSpinner, successText, failText } from '../cli'

const timeout = (ms: number): Promise<number> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function gcpSetup(opts: SetupOpts) {
  const spinner = pilotSpinner()

  // Check for gcloud config
  // ~/.pilot/gcp/config
  try {
    if (!existsSync(paths.PILOT_GCP_CONFIG)) {
      console.log(failText('ERROR: no gcloud configuration found. Please run \'pilot init\''))
      return
    }

    spinner.start('Setting up initial resources')
    timeout(1500)

    spinner.text = 'Configuring initial metadata'
    const currentMetadata = await fs.getPilotMetadata()

    currentMetadata.serverPlatform = 'gcp'

    await fs.updateMetadata(currentMetadata)

    await fs.mkDir(paths.appRoot + '/templates')

    if (!existsSync(paths.PILOT_SSH)) {
      spinner.text = 'Generating SSH keys'
      await fs.sshKeyGen()
      // console.log('Successfully generated SSH keys')
    }

    // Generate yaml file for cloud-init
    spinner.text = 'Generating cloud-init configuration file'
    await fs.genCloudInitYaml()
    // console.log('Successfully generated cloud init')
    spinner.succeed(successText('Initial resources configured'))

    // Configure GCP IAM user / role
    spinner.start('Configuring IAM user and role for Pilot on GCP')
    await execUtil.pilotUserInit(false)
    spinner.succeed(successText('IAM user and role configured'))

    // terraform init
    spinner.start('Initializing Terraform')
    await execUtil.terraInit()
    spinner.succeed(successText('Terraform initialized'))

    // terrform apply --auto-approve
    spinner.start('Provisioning resources. This can take a few minutes...\u2615')
    await execUtil.terraApply()

    // console.log('Please allow a few minutes for the remote server\'s configuration')

    spinner.text = ('GCE instance initializing...\u2615')

    const reachable = await execUtil.serverReachability(360)

    if (!reachable) {
      cli.error('GCE instance initialization timed out')
    }
    spinner.succeed(successText('GCE instance provisioned'))

    spinner.start('Setting docker connection firewall rule...')
    await execUtil.setDockerConnection()
    spinner.succeed(successText('Docker connection firewall rule set'))

    // install waypoint post gcloud initialization
    spinner.start('Setting up your remote Waypoint server')
    await execUtil.installWaypoint(opts)
    spinner.succeed(successText('Remote Waypoint server installed'))

    spinner.start('Setting context...')
    await execUtil.setContext()

    spinner.text = 'Configuring runner...'
    await execUtil.pilotUserInit(true)
    await waypoint.setDefaultContext()
    await execUtil.configureRunner()
    spinner.succeed(successText('Final configurations completed'))

    console.log(pilotText('\nWe\'re ready for takeoff...\u2708'))
  } catch (error) {
    cli.error(error)
  }
}
