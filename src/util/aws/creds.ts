import paths from '../paths'
import fsUtil from '../../util/fs'

const getAWSRegion = async (): Promise<string> => {
  const cfg = await fsUtil.fileToString(paths.PILOT_AWS_CONFIG)
  return (cfg.match(/region = \S*/) || '')[0].replace('region = ', '')
}

const getAWSAccessKey = async (): Promise<string> => {
  const creds = await fsUtil.fileToString(paths.PILOT_AWS_CREDENTIALS)
  return (creds.match(/aws_access_key_id = \S*/) || '')[0].replace('aws_access_key_id = ', '')
}

const getAWSSecretKey = async (): Promise<string> => {
  const key = await fsUtil.fileToString(paths.PILOT_AWS_CREDENTIALS)
  return (key.match(/aws_secret_access_key = \S*/) || '')[0].replace('aws_secret_access_key = ', '')
}

export default {
  getAWSRegion,
  getAWSAccessKey,
  getAWSSecretKey,
}
