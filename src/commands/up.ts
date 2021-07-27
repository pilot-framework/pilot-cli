import {Command, flags} from '@oclif/command'
import { ChildProcess } from 'child_process'
import paths from '../util/paths'

const {spawn} = require('child_process')

export default class Up extends Command {
  static description = 'Deploys your project'

  static flags = {
    help: flags.help({char: 'h'}),
  }

  static args = [{name: 'project'}, {name: 'path'}]

  async run() {
    const {args} = this.parse(Up)

    const execArgs = ['up', `${args.project}`]
    const waypointUp = spawn(`${paths.WAYPOINT_EXEC}`, execArgs)

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
