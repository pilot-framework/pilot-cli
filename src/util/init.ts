import paths from './paths'
import fsUtil from '../util/fs'
import { 
  mkdirSync,
  existsSync,
  appendFile,
  copyFile,
} from 'fs'

const makeDir = (path: string) => {
  if (!existsSync(path)) {
    mkdirSync(path)
  }
}

const createFile = (path: string, content: string) => {
  appendFile(path, content, (err) => {
    if (err) throw err
  })
}

export async function initialize() {
  // Create ~/.pilot file structure
  if (existsSync(paths.CONFIG)) {
    console.log('Pilot configuration detected...')
  } else {
    makeDir(paths.CONFIG)
    makeDir(paths.PILOT_AWS)
    makeDir(paths.PILOT_AWS_SSH)
    makeDir(paths.PILOT_GCP)
    createFile(paths.PILOT_AWS_METADATA, '{}')
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
    copyFile(paths.AWS_CONFIG, paths.PILOT_AWS_CONFIG, (err) => {
      if (err) {
        console.log('ERROR: ', err)
      } else {
        console.log('AWS config copied!')
      }
    })
  } else {
    console.log('AWS CLI configuration detected')
  }

  if (existsSync(paths.AWS_CREDENTIALS)) {
    console.log('AWS credentials detected...copying...')
    copyFile(paths.AWS_CREDENTIALS, paths.PILOT_AWS_CREDENTIALS, (err) => {
      if (err) {
        console.log('ERROR: ', err)
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
  if (existsSync(paths.GCP_CONFIG) && !existsSync(paths.PILOT_GCP_CONFIG)) {
    console.log('gcloud configuration detected...copying...')
    copyFile(paths.GCP_CONFIG, paths.PILOT_GCP_CONFIG, (err) => {
      if (err) {
        console.log('ERROR: ', err)
      } else {
        console.log('gcloud config copy success!')
      }
    })
  } else if (!existsSync(paths.GCP_CONFIG)) {
    console.log('No gcloud configuration detected')
  } else {
    console.log('gcloud configuration detected')
  }
}
