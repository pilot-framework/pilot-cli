import {Command, flags} from '@oclif/command'
import {initialize} from '../util/init'

export default class Init extends Command {
  static description = 'Scaffolds Pilot\'s metadata information in ~/.pilot'

  static flags = {
    help: flags.help({char: 'h'}),
    'gcp-policy': flags.string({description: 'Specify a path to a CSV file for granular permissions'}),
  }

  async run() {
    const { flags } = this.parse(Init)

    const overridePolicyPath = flags['gcp-policy'] ? flags['gcp-policy'] : null

    await initialize.call(this, overridePolicyPath)
  }
}
