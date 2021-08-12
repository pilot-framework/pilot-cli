import {Command, flags} from '@oclif/command'
import waypoint from '../util/waypoint'
import fsUtil from '../util/fs'
import awsExec from '../util/aws/exec'
import gcpExec from '../util/gcp/exec'
import { pilotText, failText, grayText } from '../util/cli'

export default class Invite extends Command {
  static description = 'Creates an invite string that can be sent to team members'

  static flags = {
    help: flags.help({char: 'h'}),
  }

  async run() {
    this.parse(Invite)

    const serverPlatform = (await fsUtil.getPilotMetadata()).serverPlatform
    if (!serverPlatform) {
      this.log(failText('No server found'))
      return
    }

    let ipAddr = ''

    if (serverPlatform === 'aws') {
      try {
        ipAddr = await awsExec.getServerIP()
      } catch {
        this.log(failText('No server found'))
        return
      }
    }
    if (serverPlatform === 'gcp') {
      try {
        ipAddr = await gcpExec.getServerIP()
      } catch {
        this.log(failText('No server found'))
        return
      }
    }

    const token = await waypoint.getToken()
    this.log(`${grayText('Provide the following command to your team member')}
${pilotText(`pilot connect --address=${ipAddr} --token=${token} --provider=${serverPlatform}`)}`)
  }
}
