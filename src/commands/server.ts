import {Command, flags} from '@oclif/command'
import awsExec from '../util/aws/exec'
import gcpExec from '../util/gcp/exec'
import paths from '../util/paths'
import fs from '../util/fs'
import waypoint from '../util/waypoint'
import { pilotSpinner, pilotText, successText, failText, grayText } from '../util/cli'

export default class Server extends Command {
  static description = 'Used to interact with the remote management server'

  static flags = {
    help: flags.help({char: 'h'}),
    ssh: flags.boolean({char: 's', description: 'SSH to remote management server'}),
    destroy: flags.boolean({char: 'd',
      description: 'Teardown the remote management server with its provisioned resources'}),
    list: flags.boolean({
      char: 'l',
      description: 'List existing Waypoint Runner configuration',
    }),
    // provider: flags.string({char: 'p', description: 'Which provider is being used'})
  }

  static args = [{name: 'file'}]

  async catch(error: Error) {
    throw error
  }

  async run() {
    const {flags} = this.parse(Server)
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

    if (!flags.ssh && !flags.destroy) this.log('Run "pilot server -h" for command listing')

    const serverPlatform = (await fs.getPilotMetadata()).serverPlatform

    if (flags.ssh) {
      let ipAddr: string

      this.log(grayText('To SSH to the remote server, execute the following:'))
      if (serverPlatform === 'aws') {
        try {
          ipAddr = await awsExec.getServerIP()
          this.log(pilotText(`ssh pilot@${ipAddr} -i ${paths.PILOT_SSH}`))
        } catch {
          this.log(failText('No server found'))
        }
      } else if (serverPlatform === 'gcp') {
        try {
          ipAddr = await gcpExec.getServerIP()
          this.log(pilotText(`ssh pilot@${ipAddr} -i ${paths.PILOT_SSH} -o StrictHostKeyChecking=no`))
        } catch {
          this.log(failText('No server found'))
        }
      }
    }

    if (flags.destroy) {
      spinner.start('Tearing down remote management server')
      if (serverPlatform === 'aws') {
        await awsExec.terraDestroy()
        spinner.succeed(successText('EC2 destroyed'))
      } else if (serverPlatform === 'gcp') {
        await gcpExec.terraDestroy()
        spinner.succeed(successText('GCE destroyed'))
      }
    }
  }
}
