const appRoot = require('app-root-path')
const os = require('os')
const path = require('path')

const AWS_CREDENTIALS: string = path.join(os.homedir(), '/.aws/credentials')
const AWS_CONFIG: string = path.join(os.homedir(), '/.aws/config')
const AWS_INSTANCES: string = path.join(appRoot.toString(), '/src/aws/instances')

export default {
  appRoot,
  AWS_CREDENTIALS,
  AWS_CONFIG,
  AWS_INSTANCES,
}
