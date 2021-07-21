import {Command, flags} from '@oclif/command'
import {initialize} from '../util/init'

export default class Init extends Command {
  static description = 'describe the command here'

  static flags = {
    help: flags.help({char: 'h'}),
  }

  async run() {
    await initialize.call(this)
  }
}
