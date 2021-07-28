import {Command, flags} from '@oclif/command'
import {initialize} from '../util/init'

export default class Init extends Command {
  static description = 'Scaffolds Pilot\'s metadata information in ~/.pilot'

  static flags = {
    help: flags.help({char: 'h'}),
  }

  async run() {
    await initialize.call(this)
  }
}
