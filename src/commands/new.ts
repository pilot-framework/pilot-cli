import {Command, flags} from '@oclif/command'
import * as inquirer from 'inquirer'
import cli from 'cli-ux'
import paths from '../util/paths'
import fsUtil from '../util/fs'

const fs = require('fs')

const CWD = process.cwd()

export default class New extends Command {
  static description = 'Initializes a project or application to be used with Pilot'

  static flags = {
    help: flags.help({char: 'h'}),
    bare: flags.boolean({char: 'b'}),
  }

  static args = [
    {
      name: 'type',
      required: true,
      description: 'the type you are trying to initialize (project or app)',
      options: ['project', 'app'],
    }
  ]

  async run() {
    const {
      flags,
      args,
    } = this.parse(New)
    
    if (!flags.bare) {
      this.log(`Initializing a new ${args.type} will scaffold a new directory.
If you want to configure an existing project, re-run this with the '--bare' flag in the top-level directory.`)
    }
    
    let projectName = ''
    let provider = ''

    if (args.type === 'project') {
      const responses = await inquirer.prompt([
        {
          name: 'name',
          message: 'Project name:',
          type: 'input',
        },
        {
          name: 'provider',
          message: 'Select a cloud provider:',
          type: 'list',
          choices:[{name: 'AWS'}, {name: 'GCP'}],
        },
      ])

      projectName = responses.name
      provider = responses.provider

      this.log('A project needs at least one application. You can go through the following steps again by running \'pilot new app\'')
    }

    const appChoices = await inquirer.prompt([
      {
        name: 'name',
        message: 'Application name:',
        type: 'input',
      },
      {
        name: 'stack',
        message: 'Is this part of the project frontend-only (i.e. compiles into static files for web hosting)?',
        type: 'confirm',
      }
    ])

    this.log(`You're initializing ${projectName} for ${provider} with the application ${appChoices.name} which ${appChoices.stack ? 'frontend-only' : 'fullstack'}.`)
  }
}