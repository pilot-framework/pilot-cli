import {Command, flags} from '@oclif/command'
import paths from '../util/paths'
import { exec } from 'child_process'
import { readFile } from 'fs'
import * as open from 'open'

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
      exec(`${paths.WAYPOINT_EXEC} ui -authenticate`, (err) => {
        if (err) throw err
      })
    } else {
      readFile(paths.PILOT_AWS_METADATA, 'utf8', (err, data) => {
        if (err) throw err

        const metadata = JSON.parse(data)
        open(`https://${metadata.ipAddress}:9702`)
      })
    }
  }
}
