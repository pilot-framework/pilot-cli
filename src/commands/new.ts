import {Command, flags} from '@oclif/command'
import * as inquirer from 'inquirer'
import waypoint from '../util/waypoint'

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
    },
  ]

  async run() {
    const {
      flags,
      args,
    } = this.parse(New)

    if (!flags.bare) {
    //       this.log(`Initializing a new ${args.type} will scaffold a new directory.
    // If you want to configure an existing project, re-run this with the '--bare' flag in the top-level directory.`)
    }

    if (args.type === 'project') {
      this.log(`Initializing a new ${args.type} will scaffold a new directory.`)
      const project = await inquirer.prompt([
        {
          name: 'name',
          message: 'Project name:',
          type: 'input',
        },
      ])

      await waypoint.newProject(project.name)
      this.log(`Created project: ${project.name}`)
      this.log('A project needs at least one application. You can initialize an application by running \'pilot new app\'')
    }

    if (args.type === 'app') {
      const appChoices = await inquirer.prompt([
        {
          name: 'name',
          message: 'Application name:',
          type: 'input',
        },
        {
          name: 'project',
          message: 'Select a project:',
          type: 'list',
          choices: (await waypoint.getProjects()),
        },
        {
          name: 'provider',
          message: 'Select a cloud provider:',
          type: 'list',
          choices: ['AWS', 'GCP'],
        },
        {
          name: 'stack',
          message: 'Is this part of the project frontend-only (i.e. compiles into static files for web hosting)?',
          type: 'confirm',
        },
      ])
      this.log(appChoices)
    }
  }
}
