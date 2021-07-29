import {Command, flags} from '@oclif/command'
import { cli } from 'cli-ux'

import {awsSetup} from '../util/aws/setup'
import {gcpSetup} from '../util/gcp/setup'

export interface SetupOpts {
  dev: boolean;
  bare: boolean;
}

export default class Setup extends Command {
  static description = 'Sets up Pilot Framework environment'

  static flags = {
    help: flags.help({char: 'h'}),
    aws: flags.boolean({description: 'Provision Waypoint server on AWS EC2 using Pilot\'s Docker image.'}),
    gcp: flags.boolean({description: 'Provision Waypoint server on GCP Compute Engine using Pilot\'s Docker image.'}),
    dev: flags.boolean({
      char: 'd',
      description: 'Provision Waypoint server using our experimental Docker image. Not guaranteed to work.',
    }),
    bare: flags.boolean({description: 'Provision Waypoint server using the default Waypoint Docker image.\nWARNING: you will not have access to Pilot\'s custom plugins.'}),
  }

  async run() {
    const {flags} = this.parse(Setup)
    if (!flags.aws && !flags.gcp) this.log('Run "pilot setup -h" for command listing')

    const opts: SetupOpts = {
      dev: flags.dev,
      bare: flags.bare,
    }

    if (opts.dev && opts.bare) {
      cli.error('conflicting Docker image flags')
    }

    if (opts.dev) {
      cli.warn('setting up remote Waypoint server using experimental Pilot image')
    }

    if (opts.bare) {
      cli.warn('setting up remote Waypoint server using default Waypoint image')
    }

    if (flags.aws) await awsSetup.call(this, opts)
    if (flags.gcp) await gcpSetup.call(this, opts)
  }
}
