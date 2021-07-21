import paths from '../paths'
const fs = require('fs')

const getAWSRegion = () => (fs.readFileSync(paths.PILOT_AWS_CONFIG, 'utf-8')
.match(/region = \S*/) || '')[0]
.replace('region = ', '')

const getAWSAccessKey = () => (fs.readFileSync(paths.PILOT_AWS_CREDENTIALS, 'utf-8')
.match(/aws_access_key_id = \S*/) || '')[0]
.replace('aws_access_key_id = ', '')

const getAWSSecretKey = () => (fs.readFileSync(paths.PILOT_AWS_CREDENTIALS, 'utf-8')
.match(/aws_secret_access_key = \S*/) || '')[0]
.replace('aws_secret_access_key = ', '')

export default {
  getAWSRegion,
  getAWSAccessKey,
  getAWSSecretKey,
}
