import {Command, flags} from '@oclif/command'

import {awsSetup} from '../util/aws-setup'

export default class Setup extends Command {
  static description = 'Sets up Pilot Framework environment'

  static flags = {
    help: flags.help({char: 'h'}),
    aws: flags.boolean({description: 'Provision Waypoint server on AWS EC2'}),
    gcp: flags.boolean({description: 'Provision Waypoint server on GCP Compute Engine'}),
  }

  async run() {
    const {flags} = this.parse(Setup)
    if (!flags.aws && !flags.gcp) this.log('Run "pilot setup -h" for command listing')

    if (flags.aws) await awsSetup.call(this)
  }
}
