import {Command, flags} from '@oclif/command'

export default class Setup extends Command {
  static description = 'Sets up Pilot Framework environment'

  static flags = {
    help: flags.help({char: 'h'}),
  }

  async run() {
    this.log('Hello from setup')
  }
}
