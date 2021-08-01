import cli from 'cli-ux'
import paths from '../paths'
import creds from './creds'
import fsUtil from '../fs'
import { existsSync } from 'fs'
import execUtil from './exec'
import waypoint from '../waypoint'
import { SetupOpts } from '../../commands/setup'
import { logo, pilotSpinner, successText, failText, pilotText } from '../cli'

const timeout = (ms: number): Promise<number> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function awsSetup(opts: SetupOpts) {
  console.log(logo)
  const spinner = pilotSpinner()

  try {
    spinner.start('Setting up initial resources')
    timeout(1500)

    // Check for AWS config
    // ~/.aws/config
    // ~/.aws/credentials
    if (existsSync(paths.PILOT_AWS_CREDENTIALS)) {
      spinner.text = 'AWS Credentials detected'
      if (!existsSync(paths.PILOT_AWS_CONFIG)) {
        spinner.fail(failText('AWS config not found at ~/.aws/config.'))
        return
      }
      spinner.text = 'AWS Configuration detected'
    } else {
      spinner.fail(failText('No AWS configuration found. Please configure AWS CLI.'))
      return
    }

    spinner.text = 'Configuring initial metadata'
    const currentMetadata = await fsUtil.getPilotMetadata()

    currentMetadata.serverPlatform = 'aws'

    await fsUtil.updateMetadata(currentMetadata)

    const awsRegion = await creds.getAWSRegion()
    const aKey = await creds.getAWSAccessKey()
    const sKey = await creds.getAWSSecretKey()

    if (awsRegion === '') {
      spinner.fail(failText('No AWS Access Key configured'))
      return
    }

    if (aKey === '') {
      spinner.fail(failText('No AWS Access Key configured'))
      return
    }

    if (sKey === '') {
      spinner.fail(failText('No AWS Secret Key configured'))
      return
    }
    spinner.succeed(successText('Initial resources configured'))

    spinner.start('Preparing resources for EC2 provisioning')

    // Create templates directory
    await fsUtil.mkDir(paths.appRoot + '/templates')

    spinner.text = 'Generating Terraform tfvars file'
    await fsUtil.genTerraformVars(paths.AWS_INSTANCES, `region="${awsRegion}"`)
    spinner.succeed(successText('Terraform tfvars file created'))

    // Generate SSH Keys
    if (!existsSync(paths.PILOT_SSH)) {
      spinner.start('Generating SSH keys')
      await fsUtil.sshKeyGen()
      spinner.succeed(successText('Successfully generated SSH keys'))
    }

    // Generate yaml file for cloud-init
    spinner.start('Generating cloud-init files')
    await fsUtil.genCloudInitYaml()
    spinner.succeed(successText('Successfully generated cloud init'))

    // Generate keypair to associate with EC2 for SSH access
    spinner.start('Refreshing EC2 key pair')
    await execUtil.deleteKeyPair()
    await execUtil.createKeyPair()
    spinner.succeed(successText('EC2 key pair configured'))

    // terraform init
    spinner.start('Initializing Terraform')
    await execUtil.terraInit()
    spinner.succeed(successText('Terraform initialized'))

    // terrform apply --auto-approve
    spinner.start('Provisioning resources. This can take a few minutes...\u2615')
    await execUtil.terraApply()

    // wait for EC2 initialization
    spinner.text = 'EC2 instance initializing...\u2615'

    // times out after 6 mins
    const reachable = await execUtil.serverReachability(360)

    if (!reachable) {
      spinner.fail(failText('EC2 instance initialization timed out'))
      return
    }
    spinner.succeed(successText('EC2 instance provisioned'))

    spinner.start('Setting docker connection port 2375')
    await execUtil.setDockerConnection()
    spinner.succeed(successText('Docker connection port configured'))

    // install waypoint post EC2 initialization
    spinner.start('Setting up your remote Waypoint server')
    await execUtil.installWaypoint(opts)
    spinner.succeed(successText('Remote Waypoint server configured'))

    // Store metadata to ~/.pilot/aws/metadata
    spinner.start('Generating local configs')
    await execUtil.updateMetadata()

    spinner.text = 'Setting context'
    await execUtil.setContext()

    spinner.text = ('Configuring runner')
    await waypoint.setDefaultContext()
    await execUtil.configureRunner()
    spinner.succeed(successText('Final configurations completed'))

    console.log(pilotText('\nThis is you pilot speaking...We\'re ready for takeoff! \uD83D\uDEEB'))
  } catch (error) {
    cli.error(error)
  }
}
