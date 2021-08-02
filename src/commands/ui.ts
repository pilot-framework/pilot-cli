import { Command, flags } from '@oclif/command'
import paths from '../util/paths'
import { exec } from 'child_process'
import awsExec from '../util/aws/exec'
import gcpExec from '../util/gcp/exec'
import fs from '../util/fs'
import * as open from 'open'

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
        if (error) throw error
      })
    } else {
      const serverPlatform = (await fs.getPilotMetadata()).serverPlatform
      if (serverPlatform === 'aws') {
        const ipAddr = await awsExec.getServerIP()
        await open(`https://${ipAddr}:9702`)
      } else if (serverPlatform === 'gcp') {
        const ipAddr = await gcpExec.getServerIP()
        await open(`https://${ipAddr}:9702`)
      }
    }
  }
}
