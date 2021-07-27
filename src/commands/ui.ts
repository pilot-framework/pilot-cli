import {Command, flags} from '@oclif/command'
import paths from '../util/paths'
const {exec} = require('child_process')
const fs = require('fs')
const open = require('open')

export default class Ui extends Command {
  static description = 'Opens the Waypoint UI on the default browser'

  static flags = {
    help: flags.help({char: 'h'}),
    authenticate: flags.boolean({char: 'a',
      description: 'Automatically log in to Waypoint UI'}),
  }

  static args = [{name: 'file'}]

  async run() {
    const {flags} = this.parse(Ui)
    if (flags.authenticate) {
      exec(`${paths.WAYPOINT_EXEC} ui -authenticate`, (err: Error) => {
        if (err) throw err
      })
    } else {
      fs.readFile(paths.PILOT_AWS_METADATA, 'utf8', (err: Error, data) => {
        if (err) throw err

        const metadata: object = JSON.parse(data)
        open(`https://${metadata.ipAddress}:9702`)
      })
    }
  }
}
