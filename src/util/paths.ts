const appRoot = require('app-root-path')
const os = require('os')
const path = require('path')

// const CWD = process.cwd()

const HOME: string = os.homedir()
const CONFIG: string = path.join(HOME, '/.pilot')
const PILOT_AWS: string = path.join(CONFIG, '/aws')
const PILOT_AWS_METADATA = path.join(CONFIG, '/aws/metadata')
const PILOT_AWS_SSH: string = path.join(CONFIG, '/aws/ssh')
const PILOT_AWS_CONFIG: string = path.join(CONFIG, '/aws/config')
const PILOT_AWS_CREDENTIALS: string = path.join(CONFIG, '/aws/credentials')
const PILOT_GCP: string = path.join(CONFIG, '/gcp')
const AWS_CREDENTIALS: string = path.join(HOME, '/.aws/credentials')
const AWS_CONFIG: string = path.join(HOME, '/.aws/config')
const AWS_INSTANCES: string = path.join(appRoot.toString(), '/instances/aws')
const TF_CLOUD_INIT: string = path.join(CONFIG, '/aws/ssh/tf-cloud-init')
const TERRAFORM_EXEC: string = path.join(appRoot.toString(), '/bin/terraform_1.0.2_linux_amd64/terraform ')
const SSH_DOCKER_WAYPOINT_INIT: string = path.join(appRoot.toString(), '/templates/ssh-docker-waypoint-init.yaml')
const EC2_KEY_PAIR: string = path.join(CONFIG, '/aws/ssh/PilotKeyPair.pem')

export default {
  HOME,
  CONFIG,
  PILOT_AWS,
  PILOT_AWS_METADATA,
  PILOT_AWS_SSH,
  PILOT_AWS_CONFIG,
  PILOT_AWS_CREDENTIALS,
  PILOT_GCP,
  appRoot,
  AWS_CREDENTIALS,
  AWS_CONFIG,
  AWS_INSTANCES,
  EC2_KEY_PAIR,
  SSH_DOCKER_WAYPOINT_INIT,
  TERRAFORM_EXEC,
  TF_CLOUD_INIT,
}
