import { Command, flags } from '@oclif/command'
import { spawn } from 'child_process'
import paths from '../util/paths'

export default class Destroy extends Command {
  static description = 'Destroys all deployments and releases of an application'

  static flags = {
    help: flags.help({char: 'h'}),
  }

  static args = [{name: 'app'}]

  async run() {
    const {args} = this.parse(Destroy)

    const execArgs = ['destroy', '-auto-approve', `${args.app}`]
    spawn(`${paths.WAYPOINT_EXEC}`, execArgs, { stdio: 'inherit'})
  }
}
