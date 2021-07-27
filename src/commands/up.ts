import { Command, flags } from '@oclif/command'
import { exec } from 'child_process'
import paths from '../util/paths'


export default class Up extends Command {
  static description = 'Deploys your project'

  static flags = {
    help: flags.help({char: 'h'}),
    remote: flags.boolean({char: 'r',
      description: 'Deploys the project using remote Waypoint Runner'}),
  }

  static args = [{name: 'project'}, {name: 'path'}]

  async run() {
    const {args, flags} = this.parse(Up)
    let execCommand: string
    if (flags.remote) {
      execCommand = `${paths.WAYPOINT_EXEC} up ${args.project}`
    } else {
      execCommand = `cd ${args.path} && ${paths.WAYPOINT_EXEC} up`
    }

    exec(execCommand, (err, stdout) => {
      if (err) throw err
      this.log(stdout) // TODO: Stream stdout
    })
  }
}
