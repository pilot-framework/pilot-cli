import {Command, flags} from '@oclif/command'
import * as inquirer from 'inquirer'
import waypoint from '../util/waypoint'
import tmpl from '../util/templates'
import fs from '../util/fs'
import { cwd } from 'process'
import { join } from 'path'
import { HCLAttributes } from '../util/types'
import prompt from '../util/prompt'

export default class New extends Command {
  static description = 'Initializes a project or application to be used with Pilot'

  static flags = {
    help: flags.help({char: 'h'}),
    bare: flags.boolean({
      char: 'b',
      description: 'Generates Waypoint\'s template project hcl file.',
    }),
  }

  static args = [
    {
      name: 'type',
      required: true,
      description: 'the type you are trying to initialize (project or app)',
      options: ['project', 'app'],
    },
  ]

  async run() {
    const {
      flags,
      args,
    } = this.parse(New)

    if (args.type === 'project') {
      if (flags.bare) {
        fs.createFile(join(cwd(), '/waypoint.hcl'), tmpl.standardHCLTemplate())
        return
      }
      await prompt.projectInit()
    }

    if (args.type === 'app') {
      await prompt.appInit()
    }
  }
}
