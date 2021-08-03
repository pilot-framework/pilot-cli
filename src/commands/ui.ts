import { Command, flags } from '@oclif/command'
import paths from '../util/paths'
import { exec } from 'child_process'
import awsExec from '../util/aws/exec'
import gcpExec from '../util/gcp/exec'
import fs from '../util/fs'
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
      const serverPlatform = (await fs.getPilotMetadata()).serverPlatform
      const ipAddress = (serverPlatform === 'aws') ? await awsExec.getServerIP() : await gcpExec.getServerIP()

      if (ipAddress) {
        open(`https://${ipAddress}:9702`)
      } else {
        console.log(failText('No server detected. Run `pilot setup` to initialize a server.'))
      }
    }
  }
}
