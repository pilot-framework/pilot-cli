import {Command, flags} from '@oclif/command'
import * as inquirer from 'inquirer'
import waypoint from '../util/waypoint'
import tmpl from '../util/templates'
import fs from '../util/fs'
import { cwd } from 'process'
import { join } from 'path'
import { HCLAttributes } from '../util/types'

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
      this.log('You can configure the project from the UI of your Waypoint server.')
      this.log('A project needs at least one application. You can initialize a waypoint.hcl file by running \'pilot new app\'.')
    }

    if (args.type === 'app') {
      const projectChoices: any | undefined = await inquirer.prompt([
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

      const appChoices: Array<HCLAttributes> = []
      for (let count = 1; count <= projectChoices.amount; count += 1) {
        // eslint-disable-next-line no-await-in-loop
        const choices: any | undefined = await inquirer.prompt([
          {
            name: 'appName',
            message: `Application name (${count}):`,
            type: 'input',
          },
          {
            name: 'entryDir',
            message: 'What is the source path of your app (ex: dir/subdir/app)?',
            type: 'input',
          },
          {
            name: 'frontend',
            message: 'Is this part of the project frontend-only (i.e. compiles into static files for web hosting)?',
            type: 'confirm',
          },
          {
            name: 'region',
            message: 'Region (AWS) or Location (GCP) to deploy/release to:',
            type: 'input',
          },
          {
            name: 'project',
            message: 'GCP project ID:',
            type: 'input',
            when: () => projectChoices.provider === 'GCP',
          },
        ])
          .then(async choices => {
            const moreChoices = await inquirer.prompt([
              {
                name: 'bucket',
                message: 'Name of your bucket:',
                type: 'input',
                when: choices.frontend,
              },
              {
                name: 'domain',
                message: 'Domain for Cloud CDN release:',
                type: 'input',
                when: () => projectChoices.provider === 'GCP' && choices.frontend,
              },
              {
                name: 'repoName',
                message: 'Image repository name to push image builds:',
                type: 'input',
                when: () => !choices.frontend && projectChoices.provider === 'AWS',
              },
            ])
            return Object.assign(choices, moreChoices)
          })
        appChoices.push(choices)
        console.clear()
      }

      let content = `# The name of your project.\nproject = "${projectChoices.project}"`
      appChoices.forEach(app => {
        if (projectChoices.provider === 'AWS' && app.frontend) content += '\n\n' + tmpl.appAWSFrontendHCL(app)
        if (projectChoices.provider === 'AWS' && !app.frontend)content += '\n\n' + tmpl.appAWSBackendHCL(app)
        if (projectChoices.provider === 'GCP' && app.frontend) content += '\n\n' + tmpl.appGCPFrontendHCL(app)
        if (projectChoices.provider === 'GCP' && !app.frontend) content += '\n\n' + tmpl.appGCPBackendHCL(app)
      })
      fs.createFile(join(cwd(), '/waypoint.hcl'), content)
    }
  }
}
