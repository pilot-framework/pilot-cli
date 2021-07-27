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
        if (await awsExec.serviceAccountExists()) {
          this.log('Found existing pilot-user account')
        } else {
          await awsExec.createServiceAccount()
          this.log('Created pilot-user service account')
        }

        await awsExec.addPolicy()
        this.log('Attached Pilot policy to service account')

        await awsExec.createAccessKey()
        this.log('Created access keys')

        const keys = await fs.readPilotKeys()
        this.log(keys.AccessKey.AccessKeyId)
        await waypoint.setEnvVar(`AWS_ACCESS_KEY_ID=${keys.AccessKey.AccessKeyId} AWS_SECRET_ACCESS_KEY=${keys.AccessKey.SecretAccessKey} AWS_DEFAULT_REGION=${creds.getAWSRegion()}`)
      } catch (error) {
        throw error
      }

      cli.action.stop()
    } else if (flags.gcp) {
      cli.action.start("Configuring IAM user and role for Pilot on GCP...")

      try {
        await gcpExec.pilotUserInit(String(flags.project))

        envVars.push("GOOGLE_APPLICATION_CREDENTIALS=/root/.config/pilot-user-file.json")
      } catch (err) {
        this.log(err)
      }

      for (const envVar of envVars) {
        await waypoint.setEnvVar(envVar)
      }

      cli.action.stop()
    } else {
      this.log('Run "pilot configure -h" for cloud provider options')
    }
  }
}
