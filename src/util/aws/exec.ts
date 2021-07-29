import { exec } from 'child_process'
import { readFile, writeFile } from 'fs'
import paths from '../paths'
import waypoint from '../waypoint'
import creds from './creds'
import fsUtil from '../fs'

const timeout = (ms: number): Promise<number> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const getServerIP = async (): Promise<string> => {
  return new Promise<string>((res, rej) => {
    exec(`${paths.TERRAFORM_EXEC} -chdir=${paths.AWS_INSTANCES} output -raw public_ip`, (error, stdout) => {
      if (error) rej(error)
      res(stdout)
    })
  })
    .catch(error => {
      throw error
    })
}

const getInstanceID = async (): Promise<string> => {
  return new Promise<string>((res, rej) => {
    exec(`${paths.TERRAFORM_EXEC} -chdir=${paths.AWS_INSTANCES} output -raw instance_id`, (error, stdout) => {
      if (error) rej(error)
      res(stdout)
    })
  })
    .catch(error => {
      throw error
    })
}

const getServerStatus = async (instanceID: string): Promise<string> => {
  return new Promise<string>((res, rej) => {
    exec(`aws ec2 describe-instance-status --instance-ids ${instanceID}`, (error, stdout) => {
      if (error) rej(error)
      res(stdout)
    })
  })
    .catch(error => {
      throw error
    })
}

// TODO: Determine reasonable timeout
const serverReachability = async (timeout: number): Promise<boolean> => {
  const instanceID = await getInstanceID()
  let pingServer: NodeJS.Timeout
  let time = 0

  return new Promise<boolean>((res, _) => {
    pingServer = setInterval(async () => {
      const instanceStatus = JSON.parse(await getServerStatus(instanceID))
      const reachabilityStatus = instanceStatus.InstanceStatuses[0].InstanceStatus.Details[0].Status

      if (reachabilityStatus === 'passed') {
        clearInterval(pingServer)
        res(true)
      } else if (time >= timeout) {
        clearInterval(pingServer)
        res(false)
      }

      time += 10
    }, 10000)
  })
    .catch(error => {
      throw error
    })
}

const installWaypoint = async (): Promise<string> => {
  const ipAddr = await getServerIP()

  return new Promise<string>((res, rej) => {
    exec(`ssh pilot@${ipAddr} -i ${paths.PILOT_SSH} -o StrictHostKeyChecking=no \\
    "waypoint install -platform=docker -docker-server-image=pilotframework/pilot-waypoint -accept-tos"`, (error, stdout) => {
      if (error) rej(error)
      res(stdout)
    })
  })
    .catch(error => {
      throw error
    })
}

const deleteKeyPair = async (): Promise<string> => {
  return new Promise<string>((res, rej) => {
    exec('aws ec2 delete-key-pair --key-name PilotKeyPair', (error, _) => {
      if (error) rej(error)
    })
    // provide a 2 second buffer for deleting
    setTimeout(() => res('success'), 2000)
  })
    .catch(error => {
      throw error
    })
}

const createKeyPair = async (): Promise<string> => {
  return new Promise<string>((res, rej) => {
    exec(`aws ec2 create-key-pair --key-name PilotKeyPair --query 'KeyMaterial' --output text > ${paths.EC2_KEY_PAIR}`, (error, _) => {
      if (error) rej(error)
      res('success')
    })
  })
    .catch(error => {
      throw error
    })
}

const terraInit = async (): Promise<string> => {
  return new Promise<string>((res, rej) => {
    exec(`${paths.TERRAFORM_EXEC} -chdir=${paths.AWS_INSTANCES} init`, (error, _) => {
      if (error) rej(error)
      res('success')
    })
  })
    .catch(error => {
      throw error
    })
}

const terraApply = async (): Promise<string> => {
  return new Promise<string>((res, rej) => {
    exec(`${paths.TERRAFORM_EXEC} -chdir=${paths.AWS_INSTANCES} apply -auto-approve`, (error, _) => {
      if (error) rej(error)
      res('success')
    })
  })
    .catch(error => {
      throw error
    })
}

const terraDestroy = async (): Promise<string> => {
  return new Promise<string>((res, rej) => {
    exec(`${paths.TERRAFORM_EXEC} -chdir=${paths.AWS_INSTANCES} destroy -auto-approve`, (error, _) => {
      if (error) rej(error)
      res('success')
    })
  })
    .catch(error => {
      throw error
    })
}

const getWaypointAuthToken = async (ipAddress: string): Promise<string> => {
  return new Promise<string>((res, rej) => {
    exec(`ssh pilot@${ipAddress} -i ${paths.PILOT_SSH} "waypoint token new"`, (error, data) => {
      if (error) rej(error)
      res(data)
    })
  })
    .catch(error => {
      throw error
    })
}

interface ReadFileCallback {
  (data: string): void;
}

const readMetadata = (callback: ReadFileCallback) => {
  readFile(paths.PILOT_AWS_METADATA, 'utf8', (err, data) => {
    if (err) throw err
    callback(data)
  })
}

const updateMetadata = async () => {
  const ipAddress = await getServerIP()
  const instanceID = await getInstanceID()
  const waypointAuthToken = await getWaypointAuthToken(ipAddress)
  const awsAccessKey = await creds.getAWSAccessKey()
  const awsSecretKey = await creds.getAWSSecretKey()
  const awsRegion = await creds.getAWSRegion()

  readMetadata(data => {
    const metadata = JSON.parse(data)

    metadata.ipAddress = `${ipAddress}`
    metadata.instanceID = instanceID
    metadata.waypointAuthToken = waypointAuthToken.trim()
    metadata.awsAccessKey = awsAccessKey
    metadata.awsSecretKey = awsSecretKey
    metadata.awsRegion = awsRegion

    writeFile(paths.PILOT_AWS_METADATA, JSON.stringify(metadata), err => {
      if (err) throw err
    })
  })
}

const setContext = async () => {
  // waypoint context create
  // -server-tls-skip-verify
  // -set-default
  // -server-auth-token=<server token>
  // -server-addr=<server address>
  // -server-require-auth
  // <contextName>

  await timeout(2000)

  // TODO: return promise
  readMetadata(rawMetadata => {
    const metadata = JSON.parse(rawMetadata)
    const execCommand = `${paths.WAYPOINT_EXEC} context create -server-tls-skip-verify -set-default \\
    -server-auth-token=${metadata.waypointAuthToken} -server-addr=${metadata.ipAddress}:9701 -server-require-auth pilot-server`
    exec(execCommand, err => {
      if (err) throw err
    })
  })
}

const configureRunner = async () => {
  // waypoint config set -runner
  // AWS_ACCESS_KEY_ID=<PKEY>
  // AWS_SECRET_ACCESS_KEY=<SKEY>
  // AWS_DEFAULT_REGION=<REGION>
  // DOCKER_HOST=tcp://<EC2_IP>:2375

  await timeout(2000)

  // TODO: return promise
  readMetadata(async (rawMetadata: string) => {
    const metadata = JSON.parse(rawMetadata)

    const envVars = [
      `AWS_ACCESS_KEY_ID=${metadata.awsAccessKey}`,
      `AWS_SECRET_ACCESS_KEY=${metadata.awsSecretKey}`,
      `AWS_DEFAULT_REGION=${metadata.awsRegion}`,
      `DOCKER_HOST=tcp://${metadata.ipAddress}:2375`,
    ]

    await waypoint.setEnvVars(envVars)
  })
}

const exists = (command: string) => {
  return new Promise<boolean>((res, rej) => {
    exec(command, err => {
      if (err) {
        if (err.toString().includes('NoSuchEntity')) {
          res(false)
        }
        rej(err)
      }
      res(true)
    })
  })
    .catch(error => {
      throw error
    })
}

const create = (command: string) => {
  return new Promise<string>((res, rej) => {
    exec(command, (err, stdout) => {
      if (err) rej(err)
      res(stdout)
    })
  })
    .catch(error => {
      throw error
    })
}

const serviceAccountExists = () => {
  return exists('aws iam get-user --user-name pilot-user')
}

const createServiceAccount = () => {
  return create('aws iam create-user --user-name pilot-user')
}

const addPolicy = () => {
  return create(`aws iam put-user-policy --user-name pilot-user --policy-name PilotService --policy-document file://${paths.PILOT_AWS_POLICY}`)
}

const createAccessKey = async () => {
  const keyData = await create('aws iam create-access-key --user-name pilot-user')
  return new Promise<void>((res, rej) => {
    writeFile(paths.PILOT_AWS_USER_KEYS, keyData, err => {
      if (err) rej(err)
      res()
    })
  })
}

const pilotUserInit = async () => {
  if (await serviceAccountExists()) {
    console.log('Found existing pilot-user account')
  } else {
    await createServiceAccount()
    console.log('Created pilot-user service account')
  }

  await addPolicy()
  console.log('Attached Pilot policy to service account')

  await createAccessKey()
  console.log('Created access keys')

  const keys = await fsUtil.readPilotKeys()
  await waypoint.setEnvVar(`AWS_ACCESS_KEY_ID=${keys.AccessKey.AccessKeyId} AWS_SECRET_ACCESS_KEY=${keys.AccessKey.SecretAccessKey} AWS_DEFAULT_REGION=${await creds.getAWSRegion()}`)
}

export default {
  createAccessKey,
  addPolicy,
  createKeyPair,
  createServiceAccount,
  deleteKeyPair,
  getServerIP,
  getServerStatus,
  getInstanceID,
  serverReachability,
  installWaypoint,
  terraApply,
  terraDestroy,
  terraInit,
  readMetadata,
  updateMetadata,
  setContext,
  configureRunner,
  serviceAccountExists,
  pilotUserInit,
}
