import {Command, flags} from '@oclif/command'
import { ChildProcess } from 'child_process'
import paths from '../util/paths'

const {spawn} = require('child_process')

export default class Up extends Command {
  static description = 'Deploys your project'

  static flags = {
    help: flags.help({char: 'h'}),
    remote: flags.boolean({char: 'r',
      description: 'Deploys the project in the server'}),
  }

  static args = [{name: 'project'}, {name: 'path'}]

  async run() {
    const {args, flags} = this.parse(Up)

    let waypointUp: ChildProcess

    if (flags.remote) {
      const execArgs = ['up', `${args.project}`]
      waypointUp = spawn(`${paths.WAYPOINT_EXEC}`, execArgs)
    } else {
      waypointUp = spawn(`${paths.WAYPOINT_EXEC}`, ['up'], {cwd: args.path})
    }

    waypointUp.stdout.on('data', data => {
      console.log(data.toString())
    })

    waypointUp.stderr.on('data', data => {
      console.error(data.toString())
    })

    waypointUp.on('exit', code => {
      console.log(`Child process exited with code: ${code}`)
    })
  }
}
