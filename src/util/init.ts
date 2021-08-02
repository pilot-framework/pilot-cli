import paths from './paths'
import fsUtil from '../util/fs'
import gcpCreds from './gcp/creds'
import {
  existsSync,
  copyFile,
} from 'fs'
import templates from './templates'
import { pilotSpinner, successText, failText, pilotText  } from './cli'
import { fail } from 'assert'

export async function initialize(overridePolicyPath: string | null) {
  const spinner = pilotSpinner()
  spinner.start()

  // Create ~/.pilot file structure
  if (existsSync(paths.CONFIG)) {
    spinner.text = 'Pilot configuration detected'
  } else {
    spinner.text = 'Scaffolding directories and files'
    await fsUtil.mkDir(paths.CONFIG)
    await fsUtil.mkDir(paths.PILOT_BIN)
    await fsUtil.mkDir(paths.TEMPLATES)
    await fsUtil.mkDir(paths.TEMPLATES + '/instances')
    await fsUtil.mkDir(paths.AWS_INSTANCES)
    await fsUtil.mkDir(paths.GCP_INSTANCES)
    await fsUtil.createFile(paths.AWS_INSTANCES + '/main.tf', templates.awsTerraformMain())
    await fsUtil.createFile(paths.AWS_INSTANCES + '/variables.tf', templates.awsTerraformVars())
    await fsUtil.createFile(paths.GCP_INSTANCES + '/main.tf', templates.gcpTerraformMain())
    await fsUtil.createFile(paths.GCP_INSTANCES + '/variables.tf', templates.gcpTerraformVars())
    await fsUtil.createFile(paths.PILOT_AWS_POLICY, templates.defaultAWSPolicy())
    await fsUtil.createFile(paths.PILOT_GCP_POLICY_TEMPLATE, templates.defaultGCPPermissions())
    await fsUtil.mkDir(paths.PILOT_AWS)
    await fsUtil.mkDir(paths.PILOT_AWS_SSH)
    await fsUtil.createFile(paths.PILOT_AWS_METADATA, '{}')
    await fsUtil.mkDir(paths.PILOT_GCP)
    await fsUtil.mkDir(paths.PILOT_GCP_SERVICE)
    await fsUtil.updateMetadata({})
  }

  /**********************/
  /*  INSTALL BINARIES  */
  /**********************/
  if (!existsSync(paths.TERRAFORM_EXEC) && !existsSync(paths.WAYPOINT_EXEC)) {
    spinner.text = 'Installing binaries'
    await fsUtil.installBinaries()
  }

  /***********************/
  /*  AWS CONFIGURATION  */
  /***********************/
  // if ~/.aws directory exists, copy contents
  if (existsSync(paths.AWS_CONFIG) && !existsSync(paths.PILOT_AWS_CONFIG)) {
    spinner.text = 'Copying AWS configuration'
    copyFile(paths.AWS_CONFIG, paths.PILOT_AWS_CONFIG, err => {
      if (err) {
        spinner.fail(failText(`ERROR: ${err}`))
      }
    })
  }

  if (existsSync(paths.AWS_CREDENTIALS)) {
    spinner.text = 'Copying AWS credentials'
    copyFile(paths.AWS_CREDENTIALS, paths.PILOT_AWS_CREDENTIALS, err => {
      if (err) {
        spinner.fail(failText(`ERROR: ${err}`))
      }
    })
  } else {
    spinner.fail(failText('ERROR: Please configure AWS CLI with access keys. Run \'aws configure\''))
  }

  /***********************/
  /*  GCP CONFIGURATION  */
  /***********************/
  if (!existsSync(paths.GCP_CONFIG)) {
    spinner.fail(failText('No gcloud configuration detected. Ensure you\'ve properly set up your gcloud CLI configuration if deploying with GCP.'))
    return
  }
  const defaultProject = await gcpCreds.getGCPProject()

  if (defaultProject === '') {
    spinner.fail(failText('ERROR: please set a default project to use via \'gcloud config set project PROJECT_ID\''))
    return
  }

  const defaultZone = await gcpCreds.getGCPZone()

  if (defaultZone === '') {
    spinner.fail(failText('ERROR: please set a default zone to use via \'gcloud config set compute/zone ZONE\''))
    return
  }

  spinner.text = 'Copying gcloud configuration'
  copyFile(paths.GCP_CONFIG, paths.PILOT_GCP_CONFIG, err => {
    if (err) {
      spinner.fail(failText(`ERROR: ${err}`))
    }
  })

  let templatePath = paths.PILOT_GCP_POLICY_TEMPLATE

  if (overridePolicyPath) {
    templatePath = overridePolicyPath
  }

  copyFile(templatePath, paths.PILOT_GCP_POLICY, err => {
    if (err) {
      spinner.fail(failText(`ERROR: ${err}`))
    }
  })

  spinner.succeed(successText('Files and directories initialized'))
}
