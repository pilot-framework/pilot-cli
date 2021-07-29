import paths from './paths'
import fsUtil from '../util/fs'
import gcpCreds from './gcp/creds'
import {
  existsSync,
  copyFile,
} from 'fs'

export async function initialize() {
  // Create ~/.pilot file structure
  if (existsSync(paths.CONFIG)) {
    console.log('Pilot configuration detected...')
  } else {
    await fsUtil.mkDir(paths.CONFIG)
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
    console.log('Installing binaries...')
    await fsUtil.installBinaries()
  }

  /***********************/
  /*  AWS CONFIGURATION  */
  /***********************/
  // if ~/.aws directory exists, copy contents
  if (existsSync(paths.AWS_CONFIG) && !existsSync(paths.PILOT_AWS_CONFIG)) {
    console.log('AWS configuration detected...copying...')
    copyFile(paths.AWS_CONFIG, paths.PILOT_AWS_CONFIG, err => {
      if (err) {
        console.error('ERROR: ', err)
      } else {
        console.log('AWS config copied!')
      }
    })
  } else {
    console.log('AWS CLI configuration detected')
  }

  if (existsSync(paths.AWS_CREDENTIALS)) {
    console.log('AWS credentials detected...copying...')
    copyFile(paths.AWS_CREDENTIALS, paths.PILOT_AWS_CREDENTIALS, err => {
      if (err) {
        console.error('ERROR: ', err)
      } else {
        console.log('AWS credentials copied!')
      }
    })
  } else {
    console.error('ERROR: Please configure AWS CLI with access keys. Run \'aws configure\'')
  }

  /***********************/
  /*  GCP CONFIGURATION  */
  /***********************/
  if (!existsSync(paths.GCP_CONFIG)) {
    console.log('No gcloud configuration detected. Ensure you\'ve properly set up your gcloud CLI configuration if deploying with GCP.')
    return
  }
  const defaultProject = await gcpCreds.getGCPProject()

  if (defaultProject === '') {
    console.error('ERROR: please set a default project to use via \'gcloud config set project PROJECT_ID\'')
    return
  }

  const defaultZone = await gcpCreds.getGCPZone()

  if (defaultZone === '') {
    console.error('ERROR: please set a default zone to use via \'gcloud config set compute/zone ZONE\'')
    return
  }

  console.log('gcloud configuration detected...copying...')
  copyFile(paths.GCP_CONFIG, paths.PILOT_GCP_CONFIG, err => {
    if (err) {
      console.error('ERROR: ', err)
    } else {
      console.log('gcloud config copy success!')
    }
  })

  copyFile(paths.PILOT_GCP_POLICY_TEMPLATE, paths.PILOT_GCP_POLICY, err => {
    if (err) {
      console.error('ERROR: ', err)
    } else {
      console.log('gcloud policy copy success!')
    }
  })
}
