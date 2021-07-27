import { join } from 'path'
import { homedir } from 'os'

const appRoot = require('app-root-path')

const HOME: string = homedir()
const CONFIG: string = join(HOME, '/.pilot')
const PILOT_AWS: string = join(CONFIG, '/aws')
const PILOT_AWS_METADATA = join(CONFIG, '/aws/metadata')
const PILOT_AWS_SSH: string = join(CONFIG, '/aws/ssh')
const PILOT_AWS_CONFIG: string = join(CONFIG, '/aws/config')
const PILOT_AWS_CREDENTIALS: string = join(CONFIG, '/aws/credentials')
const PILOT_GCP: string = join(CONFIG, '/gcp')
const PILOT_GCP_CONFIG: string = join(CONFIG, '/gcp/config')
const AWS_CREDENTIALS: string = join(HOME, '/.aws/credentials')
const AWS_CONFIG: string = join(HOME, '/.aws/config')
const AWS_INSTANCES: string = join(appRoot.toString(), '/instances/aws')
const GCP_CONFIG: string = join(HOME, '/.config/gcloud/configurations/config_default')
const GCP_INSTANCES: string = join(appRoot.toString(), '/instances/gcp')
const TF_CLOUD_INIT: string = join(CONFIG, '/aws/ssh/tf-cloud-init')
const SSH_DOCKER_WAYPOINT_INIT: string = join(appRoot.toString(), '/templates/ssh-docker-waypoint-init.yaml')
const EC2_KEY_PAIR: string = join(CONFIG, '/aws/ssh/PilotKeyPair.pem')
const TERRAFORM_EXEC: string = join(appRoot.toString(), '/bin/terraform/terraform')
const WAYPOINT_EXEC: string = join(appRoot.toString(), '/bin/waypoint/waypoint')


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
  GCP_INSTANCES,
  GCP_CONFIG,
  EC2_KEY_PAIR,
  SSH_DOCKER_WAYPOINT_INIT,
  TERRAFORM_EXEC,
  TF_CLOUD_INIT,
  PILOT_GCP_CONFIG,
  WAYPOINT_EXEC,
}
