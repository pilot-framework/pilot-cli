import {exec} from 'child_process'
import paths from '../paths'
import creds from './creds'
const fs = require('fs')

const timeout = (ms: number) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const sshKeyGen = () => {
  return new Promise((res, rej) => {
    exec(`ssh-keygen -t rsa -C "autopilot" -q -N "" -f ${paths.TF_CLOUD_INIT}`, (error, _) => {
      if (error) rej(error)
      res('success')
    })
  })
  .catch(error => {
    throw error
  })
}

const getServerIP = () => {
  return new Promise((res, rej) => {
    exec(`${paths.TERRAFORM_EXEC} -chdir=${paths.AWS_INSTANCES} output -raw public_ip`, (error, stdout) => {
      if (error) rej(error)
      res(stdout)
    })
  })
  .catch(error => {
    throw error
  })
}

const getInstanceID = callback => {
  return new Promise((res, rej) => {
    exec(`${paths.TERRAFORM_EXEC} -chdir=${paths.AWS_INSTANCES} output -raw instance_id`, (error, stdout) => {
      if (error) rej(error)
      res(stdout)
    })
  })
  .then(result => {
    callback(result)
  })
  .catch(error => {
    throw error
  })
}

const getServerStatus = (instanceID: string, callback) => {
  return new Promise((res, rej) => {
    exec(`aws ec2 describe-instance-status --instance-ids ${instanceID}`, (error, stdout) => {
      if (error) rej(error)
      res(stdout)
    })
  })
  .then(result => {
    callback(result)
  })
  .catch(error => {
    throw error
  })
}

const installWaypoint = async () => {
  let instanceID
  let instanceStatus
  let reachabilityStatus
  let seconds = 0

  while (reachabilityStatus !== 'passed') {
    /* eslint-disable no-await-in-loop */
    await timeout(10000)
    seconds += 10
    if (seconds % 30 === 0) {
      console.log(`${reachabilityStatus} ${seconds} seconds`)
    }
    await getInstanceID((result: string) => {
      instanceID = result
    })
    await getServerStatus(instanceID, (result: string) => {
      instanceStatus = JSON.parse(result)
    })

    reachabilityStatus = instanceStatus.InstanceStatuses[0].InstanceStatus.Details[0].Status
    /* eslint-enable no-await-in-loop */
  }

  console.log(`${reachabilityStatus} ${seconds} seconds`)
  const ipAddr = String(await getServerIP())

  return new Promise((res, rej) => {
    exec(`ssh pilot@${ipAddr} -i ${paths.TF_CLOUD_INIT} -o StrictHostKeyChecking=no "waypoint install -platform=docker -docker-server-image=pilotframework/pilot-waypoint -accept-tos"`, (error, stdout) => {
      if (error) rej(error)
      res(stdout)
    })
  })
  .catch(error => {
    throw error
  })
}

const deleteKeyPair = () => {
  return new Promise((res, rej) => {
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

const createKeyPair = () => {
  return new Promise((res, rej) => {
    exec(`aws ec2 create-key-pair --key-name PilotKeyPair --query 'KeyMaterial' --output text > ${paths.EC2_KEY_PAIR}`, (error, _) => {
      if (error) rej(error)
      res('success')
    })
  })
  .catch(error => {
    throw error
  })
}

const terraInit = () => {
  return new Promise((res, rej) => {
    exec(`${paths.TERRAFORM_EXEC} -chdir=${paths.AWS_INSTANCES} init`, (error, _) => {
      if (error) rej(error)
      res('success')
    })
  })
  .catch(error => {
    throw error
  })
}

const terraApply = () => {
  return new Promise((res, rej) => {
    exec(`${paths.TERRAFORM_EXEC} -chdir=${paths.AWS_INSTANCES} apply -auto-approve`, (error, _) => {
      if (error) rej(error)
      res('success')
    })
  })
  .catch(error => {
    throw error
  })
}

const terraDestroy = () => {
  return new Promise((res, rej) => {
    exec(`${paths.TERRAFORM_EXEC} -chdir=${paths.AWS_INSTANCES} destroy -auto-approve`, (error, _) => {
      if (error) rej(error)
      res('success')
    })
  })
  .catch(error => {
    throw error
  })
}

const getWaypointAuthToken = async (ipAddress: string) => {
  return new Promise((res, rej) => {
    exec(`ssh pilot@${ipAddress} -i ${paths.TF_CLOUD_INIT} "waypoint token new"`, (error, data) => {
      if (error) rej(error)
      res(data)
    })
  })
  .catch(error => {
    throw error
  })
}

interface ReadFileCallback<T1, T2 = void> {
  (param1: T1): T2;
}

const readFile = (filepath: string, callback: ReadFileCallback<string>) => {
  fs.readFile(filepath, 'utf8', (err: Error, data: string) => {
    if (err) throw err
    callback(data)
  })
}

const readMetadata = (callback: ReadFileCallback<string>) => {
  // fs.readFile(paths.PILOT_AWS_METADATA, 'utf8', (err: Error, data: string) => {
  //   if (err) throw err
  //   callback(data)
  // })
  readFile(paths.PILOT_AWS_METADATA, (data) => callback(data))
}

const updateMetadata = async () => {
  const ipAddress = String(await getServerIP())
  let instanceID: string
  await getInstanceID((result: string) => {
    instanceID = result
  })

  let waypointAuthToken: string
  await getWaypointAuthToken(ipAddress).then((result: string) => {
    waypointAuthToken = result
  })

  readMetadata((data: string) => {
    const metadata: object = JSON.parse(data)

    metadata.ipAddress = `${ipAddress}`
    metadata.instanceID = instanceID
    metadata.waypointAuthToken = waypointAuthToken.trim()
    metadata.awsAccessKey = creds.getAWSAccessKey()
    metadata.awsSecretKey = creds.getAWSSecretKey()
    metadata.awsRegion = creds.getAWSRegion()

    fs.writeFile(paths.PILOT_AWS_METADATA, JSON.stringify(metadata), (err: Error) => {
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

  readMetadata((metadata: string) => {
    metadata = JSON.parse(metadata)
    const execCommand = `${paths.WAYPOINT_EXEC} context create -server-tls-skip-verify -set-default -server-auth-token=${metadata.waypointAuthToken} -server-addr=${metadata.ipAddress}:9701 -server-require-auth pilot-aws`
    exec(execCommand, (err: Error) => {
      if (err) throw err
    })
  })
}

const configureRunner = async () => {
  // waypoint config set -runner
  // AWS_ACCESS_KEY_ID=<PKEY>
  // AWS_SECRET_ACCESS_KEY=<SKEY>
  // AWS_DEFAULT_REGION=<REGION>

  await timeout(2000)

  readMetadata((metadata: string) => {
    metadata = JSON.parse(metadata)
    const execCommand = `${paths.WAYPOINT_EXEC} config set -runner AWS_ACCESS_KEY_ID=${metadata.awsAccessKey} AWS_SECRET_ACCESS_KEY=${metadata.awsSecretKey} AWS_DEFAULT_REGION=${metadata.awsRegion}`
    exec(execCommand, (err: Error) => {
      if (err) throw err
    })
  })
}

const exists = (command: string) => {
  return new Promise((res, rej) => {
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

const serviceAccountExists = () => {
  return exists('aws iam get-user --user-name pilot-user')
}

const createServiceAccount = () => {
  return new Promise((res, rej) => {
    const command = 'aws iam create-user --user-name pilot-user'
    exec(command, (err, stdout) => {
      if (err) rej(err)
      res(stdout)
    })
  })
  .catch(error => {
    throw error
  })
}

const pilotRoleExists = () => {
  return exists('aws iam get-role --role-name pilotService')
}

export default {
  createKeyPair,
  createServiceAccount,
  deleteKeyPair,
  getServerIP,
  getServerStatus,
  getInstanceID,
  installWaypoint,
  sshKeyGen,
  terraApply,
  terraDestroy,
  terraInit,
  readMetadata,
  updateMetadata,
  setContext,
  configureRunner,
  serviceAccountExists,
  pilotRoleExists,
}
