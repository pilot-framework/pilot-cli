import {Command, flags} from '@oclif/command'
import * as inquirer from 'inquirer'
import waypoint from '../util/waypoint'
import tmpl from '../util/templates'
import fs from '../util/fs'
import { cwd } from 'process'
import { join } from 'path'
import { appendFile } from 'fs'

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

      this.log(`Initializing a new ${args.type} will create a project on the Waypoint server.`)
      const project = await inquirer.prompt([
        {
          name: 'name',
          message: 'Project name:',
          type: 'input',
        },
      ])

      await waypoint.newProject(project.name)
      this.log(`\nCreated project: ${project.name}`)
      this.log('Configure the project from the UI of your Waypoint server.')
      this.log('A project needs at least one application. You can initialize applications by running \'pilot new app\'.')
    }

    if (args.type === 'app') {
      const initChoices: any | undefined = await inquirer.prompt([
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
          name: 'amount',
          message: 'Number of applications your project contains:',
          type: 'number',
        },
      ])
      console.clear()

      interface HCLAttributes {
        appName: string;
        frontend: boolean;
        entryDir: string;
        bucket: string;
        region: string;
        project: string;
        domain: string;
      }

      const appChoices: Array<HCLAttributes> = []
      for (let count = 1; count <= initChoices.amount; count += 1) {
        // eslint-disable-next-line no-await-in-loop
        const choices: any | undefined = await inquirer.prompt([
          {
            name: 'appName',
            message: 'Application name:',
            type: 'input',
          },
          {
            name: 'frontend',
            message: 'Is this part of the project frontend-only (i.e. compiles into static files for web hosting)?',
            type: 'confirm',
          },
        ])
          .then(async choices => {
            const moreChoices = await inquirer.prompt([
              {
                name: 'entryDir',
                message: 'What is the entrypoint directory based on the root of your project?',
                type: 'input',
                when: () => choices.frontend === true,
              },
              {
                name: 'bucket',
                message: 'Name of your bucket:',
                type: 'input',
                when: choices.frontend,
              },
              {
                name: 'region',
                message: 'Region to deploy/release to:',
                type: 'input',
              },
              {
                name: 'project',
                message: 'GCP project ID:',
                type: 'input',
                when: () => initChoices.provider === 'GCP',
              },
              {
                name: 'domain',
                message: 'Domain for Cloud CDN release:',
                type: 'input',
                when: () => initChoices.provider === 'GCP' && choices.frontend,
              },
            ])
            return Object.assign(choices, moreChoices)
          })
        appChoices.push(choices)
        console.clear()
      }

      let content = `project = ${initChoices.project}`
      appChoices.forEach(app => {
        if (initChoices.provider === 'AWS' && app.frontend) {
          content += '\n\n' + tmpl.appAWSFrontendHCL(app)
        }
        if (initChoices.provider === 'GCP' && app.frontend) {
          content += '\n\n' + tmpl.appGCPFrontendHCL(app)
        }
      })
      fs.createFile(join(cwd(), '/waypoint.hcl'), content)
    }
  }
}
