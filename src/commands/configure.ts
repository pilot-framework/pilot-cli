import { Command, flags } from '@oclif/command'
import gcpExec from '../util/gcp/exec'
import awsExec from '../util/aws/exec'
import { pilotSpinner, successText, failText, pilotText } from '../util/cli'
import waypoint from '../util/waypoint'

export default class Configure extends Command {
  static description = 'Configure remote Waypoint Server with credentials for selected cloud provider.\nThis typically only needs to be run once for each provider.'

  static flags = {
    help: flags.help({ char: 'h' }),
    aws: flags.boolean({ description: 'Configure server with AWS Pilot IAM credentials' }),
    gcp: flags.boolean({ description: 'Configure server with GCP Pilot IAM credentials' }),
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

    const spinner = pilotSpinner()

    if (flags.list) {
      try {
        const list = await waypoint.getEnvVars()

        this.log(list)
      } catch (error) {
        this.log(error)
      }

      return
    }

    const envVars: Array<string> = []

    if (flags.aws) {
      spinner.start('Configuring IAM user and role for Pilot on AWS...')

      try {
        await awsExec.pilotUserInit()
      } catch (error) {
        spinner.fail(failText('ERROR: IAM user and role configuration failed'))
        throw error
      }

      spinner.succeed(successText('IAM user and role configured'))
    } else if (flags.gcp) {
      spinner.start('Configuring IAM user and role for Pilot on GCP...')

      try {
        await gcpExec.pilotUserInit(true)

        envVars.push('GOOGLE_APPLICATION_CREDENTIALS=/root/.config/pilot-user-file.json')
      } catch (error) {
        spinner.fail(failText(`ERROR: ${error}`))
      }

      await waypoint.setEnvVars(envVars)

      spinner.succeed(successText('IAM user and role configured'))
    } else {
      this.log(pilotText('Run "pilot configure -h" for cloud provider options'))
    }
  }
}
