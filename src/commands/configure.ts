import {Command, flags} from '@oclif/command'
import paths from '../util/paths'
import gcpExec from '../util/gcp/exec'

const { exec } = require('child_process')

export default class Setup extends Command {
  static description = 'Configured remote Waypoint Server with credentials for selected cloud provider.\nThis typically only needs to be run once for each provider.'

  static flags = {
      help: flags.help({char: 'h'}),
      aws: flags.boolean({description: 'Configure server with AWS Pilot IAM credentials'}),
      gcp: flags.boolean({description: 'Configure server with GCP Pilot IAM credentials'}),
      project: flags.string({char: 'p', description: 'Project ID for GCP Project that the service account and IAM role will be created for'}),
  }

  async run() {
    const { flags } = this.parse(Setup)

    let envVars: Array<string>

    if (flags.aws) {
      // TODO
      this.log('Chose aws')
    } else if (flags.gcp) {
      
      const accountExists = await gcpExec.serviceAccountExists(flags.project)

      if (accountExists) {
        this.log('Found existing service account')
      } else {
        const status = await gcpExec.createServiceAccount()
        this.log(String(status))
      }

      const roleExists = await gcpExec.pilotRoleExists(flags.project)

      if (roleExists) {
        this.log('Found existing IAM role')
      } else {
        const status = await gcpExec.createIAMRole(flags.project)
        this.log(String(status))
      }

      // const bindIAM = await gcpExec.bindIAMRole(flags.project)
      // this.log(String(bindIAM))


    } else {
      this.log('Run "pilot configure -h" for cloud provider options')
    }
  }
}