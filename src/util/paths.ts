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
const PILOT_AWS_POLICY: string = join(appRoot.toString(), '/templates/pilotAWSPolicy.json')
const PILOT_AWS_USER_KEYS: string = join(CONFIG, '/aws/pilot_keys')
const PILOT_GCP: string = join(CONFIG, '/gcp')
const PILOT_GCP_CONFIG: string = join(CONFIG, '/gcp/config')
const PILOT_GCP_SERVICE: string = join(CONFIG, '/gcp/service')
const PILOT_GCP_POLICY_TEMPLATE: string = join(appRoot.toString(), '/templates/pilotGCPPolicy.csv')
const PILOT_GCP_SERVICE_FILE: string = join(CONFIG, '/gcp/service/pilot-user-file.json')
const PILOT_GCP_POLICY: string = join(CONFIG, '/gcp/service/policy.csv')
const PILOT_METADATA: string = join(CONFIG, '/metadata.json')
const AWS_CREDENTIALS: string = join(HOME, '/.aws/credentials')
const AWS_CONFIG: string = join(HOME, '/.aws/config')
const AWS_INSTANCES: string = join(appRoot.toString(), '/instances/aws')
const GCP_CONFIG: string = join(HOME, '/.config/gcloud/configurations/config_default')
const GCP_INSTANCES: string = join(appRoot.toString(), '/instances/gcp')
const PILOT_SSH: string = join(CONFIG, '/pilot-ssh')
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
  PILOT_AWS_POLICY,
  PILOT_AWS_USER_KEYS,
  PILOT_GCP,
  PILOT_GCP_SERVICE,
  PILOT_GCP_POLICY,
  PILOT_GCP_POLICY_TEMPLATE,
  PILOT_GCP_SERVICE_FILE,
  appRoot,
  AWS_CREDENTIALS,
  AWS_CONFIG,
  AWS_INSTANCES,
  GCP_INSTANCES,
  GCP_CONFIG,
  EC2_KEY_PAIR,
  SSH_DOCKER_WAYPOINT_INIT,
  TERRAFORM_EXEC,
  PILOT_SSH,
  PILOT_GCP_CONFIG,
  WAYPOINT_EXEC,
  PILOT_METADATA,
}
