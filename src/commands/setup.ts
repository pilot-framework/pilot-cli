import {Command, flags} from '@oclif/command'
import cli from 'cli-ux'
import paths from '../util/paths'
import creds from '../util/creds'
import fsUtil from '../util/fs'
import execUtil from '../util/exec'

const fs = require('fs')

const CWD = process.cwd()

const makeDir = (path: string) => {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path)
  }
}

export default class Setup extends Command {
  static description = 'Sets up Pilot Framework environment'

  static flags = {
    help: flags.help({char: 'h'}),
  }

  async run() {
    // Check for AWS config
    // ~/.aws/config
    // ~/.aws/credentials
    if (fs.existsSync(paths.AWS_CREDENTIALS)) {
      this.log('AWS Credentials detected')
      if (!fs.existsSync(paths.AWS_CONFIG)) {
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

    // Create local directory for ssh keys
    makeDir(CWD + '/.aws_server')

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
    cli.action.start('Setting up your remote Waypoint server')
    await execUtil.terraApply()
    cli.action.stop()
  }
}
