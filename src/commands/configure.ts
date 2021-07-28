import {Command, flags} from '@oclif/command'
import { exec } from 'child_process'
import paths from '../util/paths'
import gcpExec from '../util/gcp/exec'
import awsExec from '../util/aws/exec'
import { cli } from 'cli-ux'
import fs from '../util/fs'
import waypoint from '../util/waypoint'
import creds from '../util/aws/creds'

export default class Configure extends Command {
  static description = 'Configure remote Waypoint Server with credentials for selected cloud provider.\nThis typically only needs to be run once for each provider.'

  static flags = {
    help: flags.help({char: 'h'}),
    aws: flags.boolean({description: 'Configure server with AWS Pilot IAM credentials'}),
    gcp: flags.boolean({description: 'Configure server with GCP Pilot IAM credentials'}),
    project: flags.string({
      char: 'p',
      description: 'Project ID for GCP Project that the service account and IAM role will be created for',
    }),
    list: flags.boolean({
      char: 'l',
      description: 'List existing Waypoint Runner configuration',
    }),
  }

  async run() {
    const { flags } = this.parse(Configure)

    if (flags.project === undefined && flags.gcp) {
      this.log('Please specify a project like so: "pilot configure --gcp -p=PROJECT_ID"')
      return
    }

    if (flags.list) {
      try {
        let list = await waypoint.getEnvVars()

        this.log(list)
      } catch (err) {
        this.log(err)
      }

      return
    }

    let envVars: Array<string> = []

    if (flags.aws) {
      cli.action.start('Configuring IAM user and role for Pilot on AWS...')

      try {
        await awsExec.pilotUserInit()
      } catch (error) {
        throw error
      }

      cli.action.stop()
    } else if (flags.gcp) {
      cli.action.start("Configuring IAM user and role for Pilot on GCP...")

      try {
        await gcpExec.pilotUserInit(String(flags.project), true)

        envVars.push("GOOGLE_APPLICATION_CREDENTIALS=/root/.config/pilot-user-file.json")
      } catch (err) {
        this.log(err)
      }

      await waypoint.setEnvVars(envVars)

      cli.action.stop()
    } else {
      this.log('Run "pilot configure -h" for cloud provider options')
    }
  }
}
