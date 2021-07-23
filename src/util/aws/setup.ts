import cli from 'cli-ux'
import paths from '../paths'
import creds from './creds'
import fsUtil from '../fs'
import execUtil from './exec'

const fs = require('fs')

const CWD = process.cwd()

const makeDir = (path: string) => {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path)
  }
}

export async function awsSetup() {
  // Check for AWS config
  // ~/.aws/config
  // ~/.aws/credentials
  if (fs.existsSync(paths.PILOT_AWS_CREDENTIALS)) {
    this.log('AWS Credentials detected')
    if (!fs.existsSync(paths.PILOT_AWS_CONFIG)) {
      this.log('AWS config not found at ~/.aws/config.')
      return
    }
    this.log('AWS Configuration detected')
  } else {
    this.log('No AWS configuration found. Please configure AWS CLI.')
    return
  }

  const awsRegion = creds.getAWSRegion()
  const aKey = creds.getAWSAccessKey()
  const sKey = creds.getAWSSecretKey()

  if (awsRegion === '') {
    this.log('No AWS Access Key configured')
    return
  }

  if (aKey === '') {
    this.log('No AWS Access Key configured')
    return
  }

  if (sKey === '') {
    this.log('No AWS Secret Key configured')
    return
  }

  this.log('Setting up resources...')

  // Create templates directory
  makeDir(paths.appRoot + '/templates')

  fsUtil.genTerraformVars(`region="${awsRegion}"`)
  this.log('Succesfully written terraform.tfvars')

  // Generate SSH Keys
  if (!fs.existsSync(paths.TF_CLOUD_INIT)) {
    await execUtil.sshKeyGen()
    this.log('Successfully generated SSH keys')
  }

  // Generate yaml file for cloud-init
  fsUtil.genCloudInitYaml()
  this.log('Successfully generated cloud init')

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
  await execUtil.terraApply()
  cli.action.stop()
  this.log('Please allow a few minutes for the remote server\'s configuration')

  // install waypoint post EC2 initialization
  cli.action.start('Setting up your remote Waypoint server')
  await execUtil.installWaypoint()
  cli.action.stop()

  // Store metadata to ~/.pilot/aws/metadata
  cli.action.start('Generating local configs')
  await execUtil.updateMetadata()
  cli.action.stop()

  cli.action.start('Setting context')
  await execUtil.setContext()
  cli.action.stop
}
