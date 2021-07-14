import paths from './paths'

const fs = require('fs')
const path = require('path')

const genTerraformVars = async (data: string) =>
  fs.writeFileSync(path.join(paths.AWS_INSTANCES, '/terraform.tfvars'), data, (err: Error) => {
    if (err) throw new Error('Unable to write Terraform .tfvars file')
  })

export default {
  genTerraformVars,
}
