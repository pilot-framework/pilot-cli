/* eslint-disable indent */
import paths from './paths'
import {
  createWriteStream,
  existsSync,
  mkdir,
  readFile,
  writeFile,
  appendFile,
  unlink,
} from 'fs'
import { platform, arch } from 'os'
import { join } from 'path'
import awsExec from './aws/exec'
import gcpExec from './gcp/exec'
import { exec } from 'child_process'
import { get } from 'https'
import templates from './templates'

const decompress = require('decompress')

const sshKeyGen = async (): Promise<string> => {
  return new Promise<string>((res, rej) => {
    exec(`ssh-keygen -t rsa -C "autopilot" -q -N "" -f ${paths.PILOT_SSH}`, (error, _) => {
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
    writeFile(path, content, error => {
      if (error) rej(error)
      res()
    })
  })
    .catch(error => {
      throw error
    })
}

const addToFile = async (path: string, content: string): Promise<void> => {
  return new Promise<void>((res, rej) => {
    appendFile(path, content, error => {
      if (error) rej(error)
      res()
    })
  })
    .catch(error => {
      throw error
    })
}

const mkDir = async (path: string): Promise<void> => {
  return new Promise<void>((res, rej) => {
    if (!existsSync(path)) {
      mkdir(path, error => {
        if (error) rej(error)
        res()
      })
    } else {
      res()
    }
  })
    .catch(error => {
      throw error
    })
}

const fileToString = async (filename: string): Promise<string> => {
  return new Promise<string>((res, rej) => {
    readFile(filename, (error, data) => {
      if (error) rej(error)
      res(data.toString())
    })
  })
    .catch(error => {
      throw error
    })
}

const getPilotMetadata = async (): Promise<any> => {
  const metadata = await fileToString(paths.PILOT_METADATA)

  return JSON.parse(metadata)
}

const updateMetadata = async (metadata: object): Promise<void> => {
  return createFile(paths.PILOT_METADATA, JSON.stringify(metadata))
}

const genTerraformVars = async (path: string, data: string) => {
  writeFile(join(path, '/terraform.tfvars'), data, error => {
    if (error) throw new Error('Unable to write Terraform .tfvars file')
  })
}

const genCloudInitYaml = async () => {
  const data = await fileToString(paths.PILOT_SSH + '.pub')

  writeFile(paths.SSH_DOCKER_WAYPOINT_INIT, templates.yamlConfig(data), error => {
    if (error) throw error
  })
}

const getPrivateKey = async () => {
  return fileToString(paths.PILOT_SSH)
}

const downloadFile = async (url: string, dest: string, callback: Function): Promise<void> => {
  return new Promise<void>(() => {
    const file = createWriteStream(dest)
    get(url, res => {
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

const cleanup = (waypoint: string, terraform: string): Promise<void> => {
  return new Promise<void>((res, _) => {
    unlink(waypoint, err =>  {
      if (err) console.error(err)
    })

    unlink(terraform, err => {
      if (err) console.error(err)
      res()
    })
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
      terraform_dest = '/tmp/terraform_1.0.3_linux_amd64.zip'
      waypoint_url = 'https://releases.hashicorp.com/waypoint/0.4.2/waypoint_0.4.2_linux_amd64.zip'
      waypoint_dest = '/tmp/waypoint_0.4.2_linux_amd64.zip'
      break
    }

    case 'linuxx32': {
      terraform_url = 'https://releases.hashicorp.com/terraform/1.0.3/terraform_1.0.3_linux_386.zip'
      terraform_dest = '/tmp/terraform_1.0.3_linux_amd64.zip'
      waypoint_url = 'https://releases.hashicorp.com/waypoint/0.4.2/waypoint_0.4.2_linux_386.zip'
      waypoint_dest = '/tmp/waypoint_0.4.2_linux_386.zip'
      break
    }

    case 'darwinx64': {
      terraform_url = 'https://releases.hashicorp.com/terraform/1.0.3/terraform_1.0.3_darwin_amd64.zip'
      terraform_dest = '/tmp/terraform_1.0.3_darwin_amd64.zip'
      waypoint_url = 'https://releases.hashicorp.com/waypoint/0.4.2/waypoint_0.4.2_darwin_amd64.zip'
      waypoint_dest = '/tmp/waypoint_0.4.2_darwin_amd64.zip'
      break
    }

    default: {
      console.log(`${platform()} ${arch()} is not supported`)
      return
    }
  }

  // do not change how this promise is structued. this is a load bearing promise and making it better breaks it
  return new Promise<void>((res, _) => {
    downloadFile(terraform_url, terraform_dest, async () => {
      await decompress(terraform_dest, paths.PILOT_BIN)
    })

    downloadFile(waypoint_url, waypoint_dest, async () => {
      await decompress(waypoint_dest, paths.PILOT_BIN)
      await cleanup(waypoint_dest, terraform_dest)
      res()
    })
  })
}

const copyFileToVM = async (): Promise<string> => {
  const serverPlatform = (await getPilotMetadata()).serverPlatform
  let ipAddress: string

  if (serverPlatform === 'aws')
    ipAddress = await awsExec.getServerIP()
  else if (serverPlatform === 'gcp') {
    ipAddress = await gcpExec.getServerIP()
  }
  return new Promise<string>((res, rej) => {
    exec(`scp -o StrictHostKeyChecking=no -i ${paths.PILOT_SSH} ${paths.PILOT_GCP_SERVICE_FILE} pilot@${ipAddress}:~/.config/pilot-user-file.json`, (error, stdout) => {
      if (error) rej(error)
      res(stdout)
    })
  })
    .catch(error => {
      throw error
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
  addToFile,
  sshKeyGen,
  getPilotMetadata,
  updateMetadata,
}
