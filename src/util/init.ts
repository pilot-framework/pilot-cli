import paths from './paths'
import fsUtil from '../util/fs'
const fs = require('fs')

// const CWD = process.cwd()

const makeDir = (path: string) => {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path)
  }
}

const createFile = (path: string, content: string) => {
  fs.appendFile(path, content, (err: Error) => {
    if (err) throw err
  })
}

export async function initialize() {
  // Create ~/.pilot file structure
  if (fs.existsSync(paths.CONFIG)) {
    this.log('Pilot configuration detected...')
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
  if (!fs.existsSync(paths.TERRAFORM_EXEC) && !fs.existsSync(paths.WAYPOINT_EXEC)) {
    console.log('Installing binaries...')
    await fsUtil.installBinaries()
  }

  /***********************/
  /*  AWS CONFIGURATION  */
  /***********************/
  // if ~/.aws directory exists, copy contents
  if (fs.existsSync(paths.AWS_CONFIG) && !fs.existsSync(paths.PILOT_AWS_CONFIG)) {
    this.log('AWS configuration detected...copying...')
    fs.copyFile(paths.AWS_CONFIG, paths.PILOT_AWS_CONFIG, (err: Error) => {
      if (err) {
        this.log('ERROR: ', err)
      } else {
        this.log('AWS config copied!')
      }
    })
  } else {
    this.log('AWS CLI configuration detected')
  }

  if (fs.existsSync(paths.AWS_CREDENTIALS)) {
    this.log('AWS credentials detected...copying...')
    fs.copyFile(paths.AWS_CREDENTIALS, paths.PILOT_AWS_CREDENTIALS, (err: Error) => {
      if (err) {
        this.log('ERROR: ', err)
      } else {
        this.log('AWS credentials copied!')
      }
    })
  } else {
    this.error('ERROR: Please configure AWS CLI with access keys. Run \'aws configure\'')
  }

  /***********************/
  /*  GCP CONFIGURATION  */
  /***********************/
}
