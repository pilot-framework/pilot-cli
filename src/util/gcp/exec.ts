import { exec } from 'child_process'
import paths from '../paths'
import waypoint from '../waypoint'
import fsUtil from '../fs'
import creds from './creds'
import { SetupOpts } from '../../commands/setup'

const timeout = (ms: number): Promise<number> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const setDockerConnection = async () => {
  const ipAddress = await getServerIP()
  return new Promise<string>((res, rej) => {
    exec(`gcloud compute firewall-rules create docker-connection --network pilot-network --action allow --source-ranges ${ipAddress}/32 --rules tcp:2375`, (error, stdout) => {
      if (error) rej(error)
      res(stdout)
    })
  })
    .catch(error => {
      throw error
    })
}

const removeDockerConnection = async () => {
  return new Promise<string>((res, rej) => {
    exec('gcloud compute firewall-rules delete docker-connection -q', (error, stdout) => {
      if (error) rej(error)
      res(stdout)
    })
  })
    .catch(error => {
      throw error
    })
}

const terraInit = async (): Promise<string> => {
  return new Promise<string>((res, rej) => {
    exec(`${paths.TERRAFORM_EXEC} -chdir=${paths.GCP_INSTANCES} init`, (error, _) => {
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
    exec(`${paths.TERRAFORM_EXEC} -chdir=${paths.GCP_INSTANCES} apply -auto-approve`, (error, _) => {
      if (error) rej(error)
      res('success')
    })
  })
    .catch(error => {
      throw error
    })
}

const terraDestroy = async (): Promise<string> => {
  await removeDockerConnection()

  return new Promise<string>((res, rej) => {
    exec(`${paths.TERRAFORM_EXEC} -chdir=${paths.GCP_INSTANCES} destroy -auto-approve`, (error, _) => {
      if (error) rej(error)
      res('success')
    })
  })
    .catch(error => {
      throw error
    })
}

const getServerIP = async (): Promise<string> => {
  const defaultProject = await creds.getGCPProject()
  const defaultZone = await creds.getGCPZone()

  return new Promise<string>((res, rej) => {
    exec(`gcloud compute instances describe pilot-gcp-instance --project='${defaultProject}' --format='json(networkInterfaces)' --zone='${defaultZone}'`, (error, stdout) => {
      if (error) rej(error)
      if (stdout.trim() === '') {
        res('')
      } else {
        res(JSON.parse(stdout).networkInterfaces[0].accessConfigs[0].natIP)
      }
    })
  })
    .catch(error => {
      throw error
    })
}

const sshExec = async (cmd: string): Promise<string> => {
  const ipAddress = await getServerIP()
  return new Promise<string>((res, rej) => {
    exec(`ssh pilot@${ipAddress} -i ${paths.PILOT_SSH} -o StrictHostKeyChecking=no '${cmd}'`, (error, data) => {
      if (error) {
        if (error.message.includes('NASTY!') || error.message.includes('Permanently added')) {
          // this is a non-critical error, don't reject
          res(data)
        }
        rej(error)
      }
      res(data)
    })
  })
    .catch(error => {
      throw error
    })
}

const getServerStatus = async (): Promise<string> => {
  const defaultProject = await creds.getGCPProject()
  const defaultZone = await creds.getGCPZone()

  return new Promise<string>((res, rej) => {
    exec(`gcloud compute instances describe pilot-gcp-instance --project='${defaultProject}' --format='json(status)' --zone='${defaultZone}'`, (error, stdout) => {
      if (error) rej(error)
      if (stdout.trim() === '') {
        res('')
      } else {
        res(JSON.parse(stdout).status)
      }
    })
  })
    .catch(error => {
      throw error
    })
}

const serverReachability = async (timeout: number): Promise<boolean> => {
  let pingServer: NodeJS.Timeout
  let time = 0

  return new Promise<boolean>((res, _) => {
    pingServer = setInterval(async () => {
      const instanceStatus = await getServerStatus()
      let waypointInstalled = 'not found'
      let dockerStatus = ''
      try {
        waypointInstalled = await sshExec('which waypoint')
        dockerStatus = await sshExec('systemctl is-active docker')
      } catch (error) {
        // Don't want to throw an error in case the SSH key is still propagating
        if (!error.message.includes('Connection refused')) {
          throw error
        }
      }

      if (instanceStatus === 'RUNNING' && waypointInstalled.trim() === '/usr/bin/waypoint' && dockerStatus.trim() === 'active') {
        clearInterval(pingServer)
        res(true)
      }
      if (time >= timeout) {
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

const getWaypointAuthToken = async (): Promise<string> => {
  return sshExec('waypoint token new')
}

const setContext = async () => {
  const ipAddress = await getServerIP()
  const token = await getWaypointAuthToken()

  await waypoint.setContext(ipAddress, token)
}

const installWaypoint = async (opts: SetupOpts) => {
  let image = '-docker-server-image=pilotframework/pilot-waypoint'

  if (opts.dev) {
    image = `${image}:dev`
  } else if (opts.bare) {
    image = ''
  }

  try {
    // wait for docker daemon to finish coming online
    await timeout(30000)
    const pgrep = await sshExec('pgrep docker')
    console.log('PID:', pgrep)
    const install = await sshExec(`waypoint install -platform=docker ${image} -accept-tos`)
    console.log(install)
  } catch (error) {
    console.log(error)
  }
}

const configureRunner = async () => {
  const ipAddress = await getServerIP()
  const envVars = [
    `DOCKER_HOST=tcp://${ipAddress}:2375`,
    'GOOGLE_APPLICATION_CREDENTIALS=/root/.config/pilot-user-file.json',
  ]

  await waypoint.setEnvVars(envVars)
}

const serviceAccountExists = async (): Promise<boolean> => {
  const defaultProject = await creds.getGCPProject()

  return new Promise<boolean>((res, rej) => {
    exec(`gcloud iam service-accounts describe pilot-user@${defaultProject}.iam.gserviceaccount.com --project=${defaultProject}`, (error, _) => {
      if (error) {
        const errMsg = error.toString()

        if (errMsg.includes('NOT_FOUND')) {
          res(false)
        }

        rej(error)
      }
      res(true)
    })
  })
    .catch(error => {
      throw error
    })
}

const pilotRoleExists = async (): Promise<boolean> => {
  const defaultProject = await creds.getGCPProject()

  return new Promise<boolean>((res, rej) => {
    exec(`gcloud iam roles describe pilotService --project ${defaultProject}`, (error, _) => {
      if (error) {
        const errMsg = error.toString()

        if (errMsg.includes('NOT_FOUND')) {
          res(false)
        }

        rej(error)
      }
      res(true)
    })
  })
    .catch(error => {
      throw error
    })
}

const createServiceAccount = async (): Promise<string> => {
  const defaultProject = await creds.getGCPProject()

  return new Promise<string>((res, rej) => {
    exec(`gcloud iam service-accounts create pilot-user --project ${defaultProject}`, (error, stdout) => {
      if (error) rej(error)
      res(stdout)
    })
  })
    .catch(error => {
      throw error
    })
}

const serviceAccountKeyGen = async (): Promise<string> => {
  const defaultProject = await creds.getGCPProject()

  return new Promise<string>((res, rej) => {
    exec(`gcloud iam service-accounts keys create ${paths.PILOT_GCP_SERVICE_FILE} \\
    --iam-account=pilot-user@${defaultProject}.iam.gserviceaccount.com`, (error, stdout) => {
      if (error) rej(error)
      res(stdout)
    })
  })
    .catch(error => {
      throw error
    })
}

const serviceAccountAuth = async (): Promise<void> => {
  const defaultProject = await creds.getGCPProject()

  return new Promise<void>((res, rej) => {
    exec(`gcloud auth activate-service-account pilot-user@${defaultProject}.iam.gserviceaccount.com \\
    --key-file=${paths.PILOT_GCP_SERVICE_FILE}`, error => {
      if (error) rej(error)
      res()
    })
  })
}

const createIAMRole = async (): Promise<string> => {
  const defaultProject = await creds.getGCPProject()
  const permissions = await fsUtil.fileToString(paths.PILOT_GCP_POLICY)

  return new Promise<string>((res, rej) => {
    exec(`gcloud iam roles create pilotService \\
    --title="Pilot Framework IAM Role" \\
    --description="This role has the necessary permissions that the Pilot service account uses to deploy applications" \\
    --project=${defaultProject} \\
    --permissions=${permissions} \\
    --quiet`, (error, stdout) => {
      if (error) rej(error)
      res(stdout)
    })
  })
    .catch(error => {
      throw error
    })
}

const updateIAMRole = async (): Promise<string> => {
  const defaultProject = await creds.getGCPProject()
  const permissions = await fsUtil.fileToString(paths.PILOT_GCP_POLICY)

  return new Promise<string>((res, rej) => {
    exec(`gcloud iam roles update pilotService \\
    --project=${defaultProject} \\
    --add-permissions=${permissions} \\
    --quiet`, (error, stdout) => {
      if (error) rej(error)
      res(stdout)
    })
  })
    .catch(error => {
      throw error
    })
}

const bindIAMRole = async (): Promise<string> => {
  const defaultProject = await creds.getGCPProject()

  return new Promise<string>((res, rej) => {
    exec(`gcloud projects add-iam-policy-binding ${defaultProject} \\
    --member='serviceAccount:pilot-user@${defaultProject}.iam.gserviceaccount.com' \\
    --role='projects/${defaultProject}/roles/pilotService'`, (error, stdout) => {
      if (error) rej(error)
      res(stdout)
    })
  })
    .catch(error => {
      throw error
    })
}

const pilotUserInit = async (runner: boolean) => {
  const userExists = await serviceAccountExists()

  if (!userExists) {
    await createServiceAccount()
      .catch(error => console.log(error))
  }

  const roleExists = await pilotRoleExists()

  if (!roleExists) {
    await createIAMRole()
      .catch(error => console.log(error))
  } else {
    await updateIAMRole()
      .catch(error => console.log(error))
  }

  await bindIAMRole()

  await serviceAccountKeyGen()

  // only execute these commands if needing to configure a waypoint runner
  if (runner) {
    await fsUtil.copyFileToVM()

    await waypoint.dockerCopy()

    await waypoint.dockerConfig()

    await waypoint.dockerAuth()
  }
}

export default {
  terraInit,
  terraApply,
  terraDestroy,
  installWaypoint,
  serviceAccountExists,
  serviceAccountKeyGen,
  serviceAccountAuth,
  pilotRoleExists,
  createServiceAccount,
  createIAMRole,
  bindIAMRole,
  pilotUserInit,
  serverReachability,
  setContext,
  getServerIP,
  configureRunner,
  setDockerConnection,
  removeDockerConnection,
}
