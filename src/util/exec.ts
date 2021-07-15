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

export default {
  createKeyPair,
  deleteKeyPair,
  sshKeyGen,
  terraApply,
  terraInit,
}
