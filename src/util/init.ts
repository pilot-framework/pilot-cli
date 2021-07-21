const fs = require('fs')
import paths from './paths'

// const CWD = process.cwd()

const makeDir = (path: string) => {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path)
  }
}

export const initialize = async () => {
  // Create ~/.pilot file structure
  if (fs.existsSync(paths.PILOT_CONFIG)) {
    console.log('Pilot configuration detected...')
  } else {
    makeDir(paths.PILOT_CONFIG)
    makeDir(paths.PILOT_AWS)
    makeDir(paths.PILOT_AWS_SSH)
    makeDir(paths.PILOT_GCP)
  }

  /***********************/
  /*  AWS CONFIGURATION  */
  /***********************/
  // if ~/.aws directory exists, copy contents
  if (fs.existsSync(paths.AWS_CONFIG) && !fs.existsSync(paths.PILOT_AWS_CONFIG)) {
    console.log('AWS configuration detected...copying...')
    fs.copyFile(paths.AWS_CONFIG, paths.PILOT_AWS_CONFIG, err => {
      if (err) {
        console.log('ERROR: ', err)
      } else {
        console.log(`AWS config copy success!`)
      }
    })
  } else {
    console.log('No AWS CLI configuration detected')
  }

  if (fs.existsSync(paths.AWS_CREDENTIALS)) {
    console.log('AWS credentials detected...copying...')
    fs.copyFile(paths.AWS_CREDENTIALS, paths.PILOT_AWS_CREDENTIALS, err => {
      if (err) {
        console.log('ERROR: ', err)
      } else {
        console.log(`AWS credentials copy success!`)
      }
    })
  } else {
    console.error('ERROR: Please configure AWS CLI with access keys. Run \'aws configure\'')
  }

  /***********************/
  /*  GCP CONFIGURATION  */
  /***********************/
}
