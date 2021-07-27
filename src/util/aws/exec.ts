import { exec } from 'child_process'
import { readFile, writeFile } from 'fs'
import paths from '../paths'
import waypoint from '../waypoint'
import creds from './creds'

const timeout = (ms: number): Promise<number> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const sshKeyGen = (): Promise<string> => {
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

const getServerIP = (): Promise<string> => {
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

const getInstanceID = (): Promise<string> => {
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

const getServerStatus = (instanceID: string): Promise<string> => {
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
      let instanceStatus = JSON.parse(await getServerStatus(instanceID))
      let reachabilityStatus = instanceStatus.InstanceStatuses[0].InstanceStatus.Details[0].Status
  
      if (time % 30 === 0) console.log(`STATUS: ${reachabilityStatus}, TIME: ${time}S`)
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
  const ipAddr = String(await getServerIP())

  return new Promise<string>((res, rej) => {
    exec(`ssh pilot@${ipAddr} -i ${paths.TF_CLOUD_INIT} -o StrictHostKeyChecking=no "waypoint install -platform=docker -docker-server-image=pilotframework/pilot-waypoint -accept-tos"`, (error, stdout) => {
      if (error) rej(error)
      res(stdout)
    })
  })
  .catch(error => {
    throw error
  })
}

const deleteKeyPair = (): Promise<string> => {
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

const createKeyPair = (): Promise<string> => {
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

const terraInit = (): Promise<string> => {
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

const terraApply = (): Promise<string> => {
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

const terraDestroy = (): Promise<string> => {
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
    exec(`ssh pilot@${ipAddress} -i ${paths.TF_CLOUD_INIT} "waypoint token new"`, (error, data) => {
      if (error) rej(error)
      res(data)
    })
  })
  .catch(error => {
    throw error
  })
}

interface ReadFileCallback {
  (data: string): void
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

  readMetadata((data) => {
    const metadata = JSON.parse(data)

    metadata.ipAddress = `${ipAddress}`
    metadata.instanceID = instanceID
    metadata.waypointAuthToken = waypointAuthToken.trim()
    metadata.awsAccessKey = creds.getAWSAccessKey()
    metadata.awsSecretKey = creds.getAWSSecretKey()
    metadata.awsRegion = creds.getAWSRegion()

    writeFile(paths.PILOT_AWS_METADATA, JSON.stringify(metadata), (err) => {
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

  readMetadata((rawMetadata) => {
    const metadata = JSON.parse(rawMetadata)
    const execCommand = `${paths.WAYPOINT_EXEC} context create -server-tls-skip-verify -set-default \\
    -server-auth-token=${metadata.waypointAuthToken} -server-addr=${metadata.ipAddress}:9701 -server-require-auth pilot-aws`
    exec(execCommand, (err) => {
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

  readMetadata(async (rawMetadata: string) => {
    const metadata = JSON.parse(rawMetadata)

    let envVars = [
      `AWS_ACCESS_KEY_ID=${metadata.awsAccessKey}`,
      `AWS_SECRET_ACCESS_KEY=${metadata.awsSecretKey}`,
      `AWS_DEFAULT_REGION=${metadata.awsRegion}`,
      `DOCKER_HOST=tcp://${metadata.ipAddress}`,
    ]

    await waypoint.setEnvVars(envVars)
  })
}

export default {
  createKeyPair,
  deleteKeyPair,
  getServerIP,
  getServerStatus,
  getInstanceID,
  serverReachability,
  installWaypoint,
  sshKeyGen,
  terraApply,
  terraDestroy,
  terraInit,
  readMetadata,
  updateMetadata,
  setContext,
  configureRunner,
}
