import {Command, flags} from '@oclif/command'
import paths from '../util/paths'
import { spawn } from 'child_process'
import waypoint from '../util/waypoint'
import { failText, successText } from '../util/cli'
import fsUtil from '../util/fs'

export default class Connect extends Command {
  static description = 'Used to set the connection context to a Waypoint server from an invite'

  static flags = {
    help: flags.help({char: 'h'}),
    verify: flags.boolean({
      char: 'v',
      description: 'Verify connection with the Waypoint server',
    }),
    address: flags.string({
      description: 'Address of server',
      dependsOn: ['token', 'provider'],
    }),
    token: flags.string({
      description: 'Authentication token of server',
      dependsOn: ['address', 'provider'],
    }),
    provider: flags.string({
      description: 'Pilot server cloud provider',
      dependsOn: ['address', 'token'],
    }),
  }

  async run() {
    const {flags} = this.parse(Connect)

    if (flags.verify) {
      const execArgs = ['context', 'verify']
      spawn(`${paths.WAYPOINT_EXEC}`, execArgs, { stdio: 'inherit'})
      return
    }

    if (flags.address && flags.token && flags.provider) {
      if (flags.provider !== 'aws' && flags.provider !== 'gcp') {
        this.log(failText('Not a valid cloud provider'))
        return
      }

      const metadata = {serverPlatform: ''}
      metadata.serverPlatform = flags.provider
      await fsUtil.updateMetadata(metadata)

      try {
        await waypoint.setContext(flags.address, flags.token)
        await waypoint.setDefaultContext()
      } catch (error) {
        throw error
      }
      this.log(successText('Server context established. Verify with "pilot connect -v".'))
      return
    }

    this.log('Run "pilot connect -h" for command listing')
  }
}
