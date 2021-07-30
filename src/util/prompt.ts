import * as inquirer from 'inquirer'
import { HCLAttributes } from '../util/types'
import waypoint from '../util/waypoint'
import tmpl from '../util/templates'
import fs from '../util/fs'
import { cwd } from 'process'
import { join } from 'path'

const projectInit = async () => {
  console.log('Initializing a new project will create a project on the Waypoint server.')
  const project = await inquirer.prompt([
    {
      name: 'name',
      message: 'Project name:',
      type: 'input',
    },
  ])

  await waypoint.newProject(project.name)
  console.log(`\nCreated project: ${project.name}`)
  console.log('A project needs at least one application. You can initialize a waypoint.hcl file by running \'pilot new app\'.')
}

const appInit = async () => {
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
  await fs.createFile(join(cwd(), '/waypoint.hcl'), content)
  console.log('Your waypoint.hcl is ready!')
  console.log('Make alterations or use as is by configuring your project in the Waypoint UI.')
  console.log('You can push the waypoint.hcl to the root of your Github repo or paste it within the project settings.')
}

export default {
  appInit,
  projectInit,
}
