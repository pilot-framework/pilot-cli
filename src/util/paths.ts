const appRoot = require('app-root-path')
const os = require('os')
const path = require('path')

const AWS_CREDENTIALS: string = path.join(os.homedir(), '/.aws/credentials')
const AWS_CONFIG: string = path.join(os.homedir(), '/.aws/config')
const AWS_INSTANCES: string = path.join(appRoot.toString(), '/instances/aws')
const TF_CLOUD_INIT: string = path.join(appRoot.toString(), '/aws_ec2/tf-cloud-init')
const TERRAFORM_EXEC: string = path.join(appRoot.toString(), '/bin/terraform_1.0.2_linux_amd64/terraform ')
const SSH_DOCKER_WAYPOINT_INIT: string = path.join(appRoot.toString(), '/templates/ssh-docker-waypoint-init.yaml')
const EC2_KEY_PAIR: string = path.join(appRoot.toString(), '/aws_ec2/PilotKeyPair.pem')

export default {
  appRoot,
  AWS_CREDENTIALS,
  AWS_CONFIG,
  AWS_INSTANCES,
  EC2_KEY_PAIR,
  SSH_DOCKER_WAYPOINT_INIT,
  TERRAFORM_EXEC,
  TF_CLOUD_INIT,
}
