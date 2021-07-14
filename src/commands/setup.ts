import {Command, flags} from '@oclif/command'
import {exec} from 'child_process'
import paths from '../util/paths'

const fs = require('fs')
const appRoot = require('app-root-path')

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
    } else {
      this.log('No AWS configuration found. Please configure AWS CLI')
      return
    }

    this.log('Setting up resources...')

    // Create local directory
    makeDir(CWD + '/aws')

    // Generate SSH Keys
    // ssh-keygen -t rsa -C "autopilot" -q -N "" -f ../tf-cloud-init

    // Generate yaml file for cloud-init

    // Generate keypair to associate with EC2 for SSH access

    // terraform init
    // await new Promise(f => setTimeout(f, 2000))
    await exec(appRoot + '/bin/terraform_1.0.2_linux_amd64/terraform version', (error, stdout) => {
      if (error) {
        throw error
      }
      this.log(stdout)
    })

    // terrform apply --auto-approve
  }
}
