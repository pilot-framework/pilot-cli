import paths from './paths'
import templates from './aws-templates'

const fs = require('fs')
const path = require('path')

const genTerraformVars = async (data: string) =>
  fs.writeFileSync(path.join(paths.AWS_INSTANCES, '/terraform.tfvars'), data, (err: Error) => {
    if (err) throw new Error('Unable to write Terraform .tfvars file')
  })

const genCloudInitYaml = async () =>
  fs.writeFileSync(paths.SSH_DOCKER_WAYPOINT_INIT, templates.yamlConfig(fs.readFileSync(paths.TF_CLOUD_INIT + '.pub')), (err: Error) => {
    if (err) throw new Error('Unable to write tf-cloud-init.yaml file')
  })

const getPrivateKey = () => {
  return fs.readFileSync(paths.TF_CLOUD_INIT)
}

export default {
  genTerraformVars,
  genCloudInitYaml,
  getPrivateKey,
}
