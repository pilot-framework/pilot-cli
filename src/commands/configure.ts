import {Command, flags} from '@oclif/command'
import { exec } from 'child_process'
import paths from '../util/paths'
import gcpExec from '../util/gcp/exec'
import awsExec from '../util/aws/exec'
import { cli } from 'cli-ux'
import fs from '../util/fs'
import waypoint from '../util/waypoint'

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
  }

  async run() {
    const { flags } = this.parse(Configure)

    if (flags.project === undefined && flags.gcp) {
      this.log('Please specify a project like so: "pilot configure --gcp -p=PROJECT_ID"')
      return
    }

    let envVars: Array<string> = []

    if (flags.aws) {
      cli.action.start('Configuring IAM user and role for Pilot on AWS...')

      if (await awsExec.serviceAccountExists()) {
        this.log('Found existing pilot-user account')
      } else {
        await awsExec.createServiceAccount()
        this.log('Created pilot-user service account')
      }

      if (await awsExec.pilotRoleExists()) {
        this.log('Found existing Pilot role')
      } else {
        await awsExec.createIAMRole()
        this.log('Created role for Pilot user')
      }

      // TODO: finish aws configure

      cli.action.stop()
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

        await gcpExec.serviceAccountKeyGen(String(flags.project))

        await fs.copyFileToEC2()

        await waypoint.dockerCopy()

        await waypoint.dockerConfig(String(flags.project))

        await waypoint.dockerAuth(String(flags.project))

        envVars.push("GOOGLE_APPLICATION_CREDENTIALS=/root/.config/pilot-user-file.json")
      } catch (err) {
        this.log(err)
      }

      for (const envVar of envVars) {
        this.log(envVar)
        await waypoint.setEnvVar(envVar)
      }

      cli.action.stop()
    } else {
      this.log('Run "pilot configure -h" for cloud provider options')
    }
  }
}
