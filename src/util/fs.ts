import paths from './paths'
import templates from './aws/templates'
import { string } from '@oclif/command/lib/flags'
import awsExec from './aws/exec'
import {exec} from 'child_process'
import { Http2ServerResponse } from 'http2'

const fs = require('fs')
const os = require('os')
const path = require('path')
const https = require('https')
const decompress = require('decompress')

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

const downloadFile = async (url: string, dest: string, callback: Function) => {
  return new Promise(() => {
    const file = fs.createWriteStream(dest)
    https.get(url, (res: Http2ServerResponse) => {
      res.pipe(file)
      res.on('end', () => {
        callback()
      })
    })
  })
  .catch(error => {
    throw error
  })
}

const installBinaries = async () => {
  const platform = os.platform()
  const arch = os.arch()

  const system = `${platform}${arch}`

  let terraform_url: string
  let terraform_dest: string
  let waypoint_url: string
  let waypoint_dest: string

  switch (system) {
  case 'linuxx64': {
    terraform_url = 'https://releases.hashicorp.com/terraform/1.0.3/terraform_1.0.3_linux_amd64.zip'
    terraform_dest = './bin/terraform_1.0.3_linux_amd64.zip'
    waypoint_url = 'https://releases.hashicorp.com/waypoint/0.4.2/waypoint_0.4.2_linux_amd64.zip'
    waypoint_dest = './bin/waypoint_0.4.2_linux_amd64.zip'
    break
  }

  case 'linuxx32': {
    terraform_url = 'https://releases.hashicorp.com/terraform/1.0.3/terraform_1.0.3_linux_386.zip'
    terraform_dest = './bin/terraform_1.0.3_linux_386.zip'
    waypoint_url = 'https://releases.hashicorp.com/waypoint/0.4.2/waypoint_0.4.2_linux_386.zip'
    waypoint_dest = './bin/waypoint_0.4.2_linux_386.zip'
    break
  }

  case 'darwinx64': {
    terraform_url = 'https://releases.hashicorp.com/terraform/1.0.3/terraform_1.0.3_darwin_amd64.zip'
    terraform_dest = './bin/terraform_1.0.3_darwin_amd64.zip'
    waypoint_url = 'https://releases.hashicorp.com/waypoint/0.4.2/waypoint_0.4.2_darwin_amd64.zip'
    waypoint_dest = './bin/waypoint_0.4.2_darwin_amd64.zip'
    break
  }

  default: {
    console.log(`${platform} ${arch} is not supported`)
    return
  }
  }

  downloadFile(terraform_url, terraform_dest, () => {
    decompress(terraform_dest, './bin/terraform/')
    downloadFile(waypoint_url, waypoint_dest, () => {
      decompress(waypoint_dest, './bin/waypoint/')
    })
  })
}

const copyFileToEC2 = async () => {
  const ipAddress = await awsExec.getServerIP()
  return new Promise((res, rej) => {
    exec(`scp -i ${paths.TF_CLOUD_INIT} ~/.pilot/gcp/service/pilot-user-file.json pilot@${ipAddress}:~/.config/pilot-user-file.json`, (error, stdout) => {
      if (error) rej(error)
      res(stdout)
    })
  })
  .catch(err => {
    throw err
  })
}

const readPilotKeys = () => {
  return JSON.parse(fs.readFileSync(paths.PILOT_AWS_USER_KEYS))
}

export default {
  genTerraformVars,
  genCloudInitYaml,
  getPrivateKey,
  downloadFile,
  installBinaries,
  copyFileToEC2,
  readPilotKeys,
}
