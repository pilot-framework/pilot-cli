import {Command, flags} from '@oclif/command'
import prompt from '../util/prompt'
import paths from '../util/paths'
import { spawn } from 'child_process'

export default class Connect extends Command {
  static description = 'Used to set the connection context to a Waypoint server'

  static flags = {
    help: flags.help({char: 'h'}),
    verify: flags.boolean({char: 'v'}),
  }

  async run() {
    const {flags} = this.parse(Connect)

    if (flags.verify) {
      const execArgs = ['context', 'verify']
      spawn(`${paths.WAYPOINT_EXEC}`, execArgs, { stdio: 'inherit'})
      return
    }

    await prompt.connectContext()
  }
}
