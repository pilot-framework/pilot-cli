import cli from 'cli-ux'
import paths from '../paths'
import execUtil from './exec'
import { existsSync } from 'fs'
import fs from '../fs'
import waypoint from '../waypoint'
import { SetupOpts } from '../../commands/setup'
import { logo, pilotSpinner, successText, failText, pilotText } from '../cli'
import creds from './creds'

const timeout = (ms: number): Promise<number> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function gcpSetup(opts: SetupOpts) {
  console.log(logo)
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

    const zone = await creds.getGCPZone()
    const project = await creds.getGCPProject()

    if (zone === '') {
      spinner.fail(failText('No default zone configured for GCP. Please run \'pilot init\''))
      return
    }

    if (project === '') {
      spinner.fail(failText('No default project configured for GCP. Please run \'pilot init\''))
      return
    }

    spinner.text = 'Configuring initial metadata'
    const currentMetadata = await fs.getPilotMetadata()

    currentMetadata.serverPlatform = 'gcp'

    await fs.updateMetadata(currentMetadata)

    // Set up tfvars
    spinner.text = 'Generating Terraform tfvars file'
    await fs.genTerraformVars(paths.GCP_INSTANCES, `default_zone="${zone}"\ndefault_project="${project}"`)
    spinner.succeed(successText('Terraform tfvars file created'))

    if (!existsSync(paths.PILOT_SSH)) {
      spinner.text = 'Generating SSH keys'
      await fs.sshKeyGen()
    }

    // Generate yaml file for cloud-init
    spinner.text = 'Generating cloud-init configuration file'
    await fs.genCloudInitYaml()
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

    console.log(pilotText('\nThis is your pilot speaking...We\'re ready for takeoff! \uD83D\uDEEB'))
  } catch (error) {
    cli.error(error)
  }
}
