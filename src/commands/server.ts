import {Command, flags} from '@oclif/command'
import execUtil from '../util/exec'
import cli from 'cli-ux'

export default class Server extends Command {
  static description = 'Used to interact with the remote management server'

  static flags = {
    help: flags.help({char: 'h'}),
    ssh: flags.boolean({char: 's', description: 'SSH to remote management server'}),
    destroy: flags.boolean({char: 'd',
      description: 'Teardown the remote management server with its provisioned resources'}),
  }

  static args = [{name: 'file'}]

  async catch(error: Error) {
    throw error
  }

  async run() {
    const {flags} = this.parse(Server)
    if (!flags.ssh && !flags.destroy) this.log('Run "pilot server -h" for command listing')

    if (flags.ssh) {
      const ipAddr = String(await execUtil.getServerIP())
      this.log(`To SSH to the remote server, execute the following from the server initialization directory:
ssh pilot@${ipAddr} -i .aws_server/tf-cloud-init`)
    }

    if (flags.destroy) {
      cli.action.start('Tearing down remote management server')
      await execUtil.terraDestroy()
      cli.action.stop()
    }
  }
}
