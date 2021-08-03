import { Command, flags } from '@oclif/command'
import paths from '../util/paths'
import { exec } from 'child_process'
import { readFile } from 'fs'
import * as open from 'open'
import { failText } from '../util/cli'

export default class Ui extends Command {
  static description = 'Opens the Waypoint UI on the default browser'

  static flags = {
    help: flags.help({ char: 'h' }),
    authenticate: flags.boolean({
      char: 'a',
      description: 'Automatically log in to Waypoint UI',
    }),
  }

  static args = [{ name: 'file' }]

  async run() {
    const { flags } = this.parse(Ui)

    if (flags.authenticate) {
      exec(`${paths.WAYPOINT_EXEC} ui -authenticate`, error => {
        if (error) {
          console.log(failText('Unable to open UI. See error below...'))
          throw error
        }
      })
    } else {
      readFile(paths.PILOT_AWS_METADATA, 'utf8', (err, data) => {
        if (err) {
          console.log(failText('Unable to open UI. See error below...'))
          throw err
        }

        // const metadata = JSON.parse(data)
        const ipAddress = JSON.parse(data).ipAddress
        if (ipAddress) {
          open(`https://${ipAddress}:9702`)
        } else {
          console.log(failText('No server detected. Run `pilot setup` to initialize a server.'))
        }
      })
    }
  }
}
