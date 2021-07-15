import {Command, flags} from '@oclif/command'
import execUtil from '../util/exec'

export default class Server extends Command {
  static description = 'Used to interact with the remote management server'

  static flags = {
    help: flags.help({char: 'h'}),
    ssh: flags.boolean({description: 'SSH to remote management server'}),
  }

  static args = [{name: 'file'}]

  async catch(error: Error) {
    throw error
  }

  async run() {
    const {flags} = this.parse(Server)
    if (flags.ssh) {
      const ipAddr = String(await execUtil.getServerIP())
      this.log(`To SSH to the remote server, execute the following from the server initialization directory:
ssh pilot@${ipAddr} -i .aws_server/tf-cloud-init`)
    }
  }
}
