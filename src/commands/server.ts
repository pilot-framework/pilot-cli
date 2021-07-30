import {Command, flags} from '@oclif/command'
import awsExec from '../util/aws/exec'
import gcpExec from '../util/gcp/exec'
import paths from '../util/paths'
import fs from '../util/fs'
import cli from '../util/cli'
import chalk from 'chalk'

export default class Server extends Command {
  static description = 'Used to interact with the remote management server'

  static flags = {
    help: flags.help({char: 'h'}),
    ssh: flags.boolean({char: 's', description: 'SSH to remote management server'}),
    destroy: flags.boolean({char: 'd',
      description: 'Teardown the remote management server with its provisioned resources'}),
    // provider: flags.string({char: 'p', description: 'Which provider is being used'})
  }

  static args = [{name: 'file'}]

  async catch(error: Error) {
    throw error
  }

  async run() {
    const {flags} = this.parse(Server)
    const spinner = cli.pilotSpinner()

    if (!flags.ssh && !flags.destroy) this.log('Run "pilot server -h" for command listing')

    const serverPlatform = (await fs.getPilotMetadata()).serverPlatform

    if (flags.ssh) {
      let ipAddr: string

      this.log(chalk.gray('To SSH to the remote server, execute the following:'))
      if (serverPlatform === 'aws') {
        try {
          ipAddr = await awsExec.getServerIP()
          this.log(chalk.bold.magentaBright(`ssh pilot@${ipAddr} -i ${paths.PILOT_SSH}`))
        } catch {
          this.log(chalk.bold.red('No server found'))
        }
      } else if (serverPlatform === 'gcp') {
        try {
          ipAddr = await gcpExec.getServerIP()
          this.log(chalk.bold.magentaBright(`ssh pilot@${ipAddr} -i ${paths.PILOT_SSH} -o StrictHostKeyChecking=no`))
        } catch {
          this.log(chalk.bold.red('No server found'))
        }
      }
    }

    if (flags.destroy) {
      spinner.start('Tearing down remote management server')
      if (serverPlatform === 'aws') {
        await awsExec.terraDestroy()
        spinner.succeed(chalk.bold.green('EC2 destroyed'))
      } else if (serverPlatform === 'gcp') {
        await gcpExec.terraDestroy()
        spinner.succeed(chalk.bold.green('GCE destroyed'))
      }
    }
  }
}
