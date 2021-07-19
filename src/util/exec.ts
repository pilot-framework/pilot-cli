import {exec} from 'child_process'
import paths from './paths'

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
  const timeout = ms => {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  let instanceID
  let instanceStatus
  let reachabilityStatus
  let seconds = 0

  while (reachabilityStatus !== 'passed') {
    await timeout(10000)
    seconds += 10
    if (seconds % 30 === 0) {
      console.log(`${reachabilityStatus} ${seconds} seconds`)
    }
    await getInstanceID((result: string) => instanceID = result)
    await getServerStatus(instanceID, result => instanceStatus = JSON.parse(result))

    reachabilityStatus = instanceStatus.InstanceStatuses[0].InstanceStatus.Details[0].Status
  }

  console.log(`${reachabilityStatus} ${seconds} seconds`)
  const ipAddr = String(await getServerIP())

  return new Promise((res, rej) => {
    exec(`ssh pilot@${ipAddr} -i ${paths.TF_CLOUD_INIT} -o StrictHostKeyChecking=no "waypoint install -platform=docker -accept-tos"`, (error, stdout) => {
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
    exec(paths.TERRAFORM_EXEC + `-chdir=${paths.AWS_INSTANCES} init`, (error, _) => {
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
    exec(paths.TERRAFORM_EXEC + `-chdir=${paths.AWS_INSTANCES} apply -auto-approve`, (error, _) => {
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
    exec(paths.TERRAFORM_EXEC + `-chdir=${paths.AWS_INSTANCES} destroy -auto-approve`, (error, _) => {
      if (error) rej(error)
      res('success')
    })
  })
  .catch(error => {
    throw error
  })
}

export default {
  createKeyPair,
  deleteKeyPair,
  getServerIP,
  getServerStatus,
  getInstanceID,
  installWaypoint,
  sshKeyGen,
  terraApply,
  terraDestroy,
  terraInit,
}
