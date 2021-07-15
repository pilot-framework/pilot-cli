import {Command, flags} from '@oclif/command'
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

    // Create local directory
    makeDir(CWD + '/aws_ec2')
    makeDir(CWD + '/templates')

    fsUtil.genTerraformVars(`region="${awsRegion}"`)
    this.log('Succesfully written terraform.tfvars')

    // Generate SSH Keys
    if (!fs.existsSync(paths.TF_CLOUD_INIT)) {
      await execUtil.sshKeyGen()
      this.log('Successfully generated SSH keys')
    }

    // Generate yaml file for cloud-init
    if (!fs.existsSync(paths.SSH_DOCKER_WAYPOINT_INIT)) {
      fsUtil.genCloudInitYaml()
      this.log('Successfully generated cloud init')
    }

    // Generate keypair to associate with EC2 for SSH access
    await execUtil.deleteKeyPair()
    this.log('Deleted EC2 key pair')

    await execUtil.createKeyPair()
    this.log('Created EC2 key pair')

    // terraform init
    await execUtil.terraInit()
    this.log('Terraform initialized')

    // terrform apply --auto-approve
    await execUtil.terraApply()
    this.log('Terraform apply')
  }
}
