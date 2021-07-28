import paths from './paths'
import {
  appendFile,
  createWriteStream,
  existsSync,
  mkdir,
  readFile,
  writeFile,
} from 'fs'
import { platform, arch } from 'os'
import { join } from 'path'
import awsExec from './aws/exec'
import gcpExec from './gcp/exec'
import { exec } from 'child_process'
import { get } from 'https'
import templates from './aws/templates'

const decompress = require('decompress')

const sshKeyGen = async (): Promise<string> => {
  return new Promise<string>((res, rej) => {
    exec(`ssh-keygen -t rsa -C "autopilot" -q -N "" -f ${paths.TF_CLOUD_INIT}`, (error, _) => {
      if (error) rej(error)
      res('success')
    })
  })
  .catch(error => {
    throw error
  })
}

const createFile = async (path: string, content: string): Promise<void> => {
  return new Promise<void>((res, rej) => {
    appendFile(path, content, (err) => {
      if (err) rej(err)
      res()
    })
  })
  .catch(err => {
    throw err
  })
}

const mkDir = async (path: string): Promise<void> => {
  return new Promise<void>((res, rej) => {
    if (!existsSync(path)) {
      mkdir(path, (err) => {
        if (err) rej(err)
        res()
      })
    } else {
      res()
    }
  })
  .catch(err => {
    throw err
  })
}

const fileToString = async (filename: string): Promise<string> => {
  return new Promise<string>((res, rej) => {
    readFile(filename, (err, data) => {
      if (err) rej(err)
      res(data.toString())
    })
  })
  .catch(err => {
    throw err
  })
}

const genTerraformVars = async (data: string) => {
  writeFile(join(paths.AWS_INSTANCES, '/terraform.tfvars'), data, (err) => {
    if (err) throw new Error('Unable to write Terraform .tfvars file')
  })
}

const genCloudInitYaml = async () => {
  const data = await fileToString(paths.TF_CLOUD_INIT + '.pub')

  writeFile(paths.SSH_DOCKER_WAYPOINT_INIT, templates.yamlConfig(data), (err) => {
    if (err) throw err
  })
}

const getPrivateKey = async () => {
  return await fileToString(paths.TF_CLOUD_INIT)
}

const downloadFile = async (url: string, dest: string, callback: Function): Promise<void> => {
  return new Promise<void>(() => {
    const file = createWriteStream(dest)
    get(url, (res) => {
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

const installBinaries = async (): Promise<void> => {
  const system = `${platform()}${arch()}`

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
    console.log(`${platform()} ${arch()} is not supported`)
    return
  }
  }

  return new Promise<void>((res, _) => {
    downloadFile(terraform_url, terraform_dest, async () => {
      await decompress(terraform_dest, './bin/terraform/')
    })

    downloadFile(waypoint_url, waypoint_dest, async () => {
      await decompress(waypoint_dest, './bin/waypoint/')
      res()
    })
  })
}

const copyFileToVM = async (provider: string): Promise<string> => {
  let ipAddress: string

  if (provider === "aws")
    ipAddress = await awsExec.getServerIP()
  else if (provider === "gcp") {
    ipAddress = await  gcpExec.getServerIP("us-east1-b", "pilot-321119")
  }
  return new Promise<string>((res, rej) => {
    exec(`scp -o StrictHostKeyChecking=no -i ${paths.TF_CLOUD_INIT} ${paths.PILOT_GCP_SERVICE_FILE} pilot@${ipAddress}:~/.config/pilot-user-file.json`, (error, stdout) => {
      if (error) rej(error)
      res(stdout)
    })
  })
  .catch(err => {
    throw err
  })
}

const readPilotKeys = async () => {
  return JSON.parse(await fileToString(paths.PILOT_AWS_USER_KEYS))
}

export default {
  genTerraformVars,
  genCloudInitYaml,
  getPrivateKey,
  downloadFile,
  installBinaries,
  copyFileToVM,
  readPilotKeys,
  fileToString,
  mkDir,
  createFile,
  sshKeyGen,
}
