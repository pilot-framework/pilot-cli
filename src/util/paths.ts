const os = require('os')

const AWS_CREDENTIALS: string = os.homedir() + '/.aws/credentials'
const AWS_CONFIG: string = os.homedir() + '/.aws/config'

export default {
  AWS_CREDENTIALS,
  AWS_CONFIG,
}
