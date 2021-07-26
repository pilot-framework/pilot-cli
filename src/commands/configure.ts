import {Command, flags} from '@oclif/command'
import paths from '../util/paths'
import gcpExec from '../util/gcp/exec'
import { cli } from 'cli-ux'

const { exec } = require('child_process')

export default class Setup extends Command {
  static description = 'Configure remote Waypoint Server with credentials for selected cloud provider.\nThis typically only needs to be run once for each provider.'

  static flags = {
      help: flags.help({char: 'h'}),
      aws: flags.boolean({description: 'Configure server with AWS Pilot IAM credentials'}),
      gcp: flags.boolean({description: 'Configure server with GCP Pilot IAM credentials'}),
      project: flags.string({
        char: 'p',
        description: 'Project ID for GCP Project that the service account and IAM role will be created for',
      }),
  }

  async run() {
    const { flags } = this.parse(Setup)

    if (flags.project === undefined && flags.gcp) {
      this.log("Please specify a project like so: \"pilot configure --gcp -p=PROJECT_ID\"")
      return
    }

    let envVars: Array<string>

    if (flags.aws) {
      // TODO
      this.log('Chose aws')
    } else if (flags.gcp) {
      cli.action.start("Configuring IAM user and role for Pilot on GCP...")

      try {
        let userExists = await gcpExec.serviceAccountExists(String(flags.project))

        if (!userExists) {
          gcpExec.createServiceAccount(String(flags.project))
            .catch(err => this.log(err))
        } else {
          this.log("user exists")
        }

        let roleExists = await gcpExec.pilotRoleExists(String(flags.project))

        if (!roleExists) {
          gcpExec.createIAMRole(String(flags.project))
            .catch(err => this.log(err))
        } else {
          this.log("role exists")
        }

        await gcpExec.bindIAMRole(String(flags.project))

        let keyGen = await gcpExec.serviceAccountKeyGen(String(flags.project))
        this.log(String(keyGen))
      } catch (err) {
        this.log(err)
      }

      cli.action.stop()
    } else {
      this.log('Run "pilot configure -h" for cloud provider options')
    }
  }
}