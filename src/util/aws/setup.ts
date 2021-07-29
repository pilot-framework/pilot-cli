import cli from 'cli-ux'
import paths from '../paths'
import creds from './creds'
import fsUtil from '../fs'
import { existsSync } from 'fs'
import execUtil from './exec'
import waypoint from '../waypoint'
import { SetupOpts } from '../../commands/setup'

export async function awsSetup(opts: SetupOpts) {
  try {
    // Check for AWS config
    // ~/.aws/config
    // ~/.aws/credentials
    if (existsSync(paths.PILOT_AWS_CREDENTIALS)) {
      console.log('AWS Credentials detected')
      if (!existsSync(paths.PILOT_AWS_CONFIG)) {
        console.log('AWS config not found at ~/.aws/config.')
        return
      }
      console.log('AWS Configuration detected')
    } else {
      console.log('No AWS configuration found. Please configure AWS CLI.')
      return
    }

    const currentMetadata = await fsUtil.getPilotMetadata()

    currentMetadata.serverPlatform = 'aws'

    await fsUtil.updateMetadata(currentMetadata)

    const awsRegion = await creds.getAWSRegion()
    const aKey = await creds.getAWSAccessKey()
    const sKey = await creds.getAWSSecretKey()

    if (awsRegion === '') {
      console.log('No AWS Access Key configured')
      return
    }

    if (aKey === '') {
      console.log('No AWS Access Key configured')
      return
    }

    if (sKey === '') {
      console.log('No AWS Secret Key configured')
      return
    }

    console.log('Setting up resources...')

    // Create templates directory
    await fsUtil.mkDir(paths.appRoot + '/templates')

    await fsUtil.genTerraformVars(`region="${awsRegion}"`)
    console.log('Succesfully written terraform.tfvars')

    // Generate SSH Keys
    if (!existsSync(paths.PILOT_SSH)) {
      await fsUtil.sshKeyGen()
      console.log('Successfully generated SSH keys')
    }

    // Generate yaml file for cloud-init
    await fsUtil.genCloudInitYaml()
    console.log('Successfully generated cloud init')

    // Generate keypair to associate with EC2 for SSH access
    cli.action.start('Refreshing EC2 key pair')
    await execUtil.deleteKeyPair()
    await execUtil.createKeyPair()
    cli.action.stop()

    // terraform init
    cli.action.start('Initializing Terraform')
    await execUtil.terraInit()
    cli.action.stop()

    // terrform apply --auto-approve
    cli.action.start('Provisioning resources')
    console.log('This will take a few minutes.')
    await execUtil.terraApply()
    cli.action.stop()

    // wait for EC2 initialization
    cli.action.start('EC2 instance initializing...')

    // times out after 6 mins
    const reachable = await execUtil.serverReachability(360)

    if (!reachable) {
      cli.error('EC2 instance initialization timed out')
    }
    cli.action.stop()

    // install waypoint post EC2 initialization
    cli.action.start('Setting up your remote Waypoint server')
    await execUtil.installWaypoint(opts)
    cli.action.stop()

    // Store metadata to ~/.pilot/aws/metadata
    cli.action.start('Generating local configs')
    await execUtil.updateMetadata()
    cli.action.stop()

    cli.action.start('Setting context')
    await execUtil.setContext()
    cli.action.stop

    cli.action.start('Configuring runner')
    await waypoint.setDefaultContext()
    await execUtil.configureRunner()
    cli.action.stop
  } catch (error) {
    cli.error(error)
  }
}
