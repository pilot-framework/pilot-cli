import {exec} from 'child_process'
import paths from '../paths'
import waypoint from '../waypoint'
import fsUtil from '../fs'

const timeout = (ms: number): Promise<number> => {
  return new Promise(resolve => setTimeout(resolve, ms))
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

// TODO: dynamic zone
const serverReachability = async (timeout: number): Promise<boolean> => {
  let pingServer: NodeJS.Timeout
  let time = 0

  return new Promise<boolean>((res, _) => {
    pingServer = setInterval(async () => {
      let instanceStatus = await getServerStatus("us-east1-b")
      let waypointInstalled = "not found"
      try {
        waypointInstalled = await sshExec("which waypoint")
      } catch (err) {
        // Don't want to throw an error in case the SSH key is still propagating
        if (err.message.includes("Connection refused")) {
          console.log("Waiting on SSH key propagation...")
        } else {
          throw err
        }
      }

      if (instanceStatus === "RUNNING" && waypointInstalled.includes("/usr/bin/waypoint")) {
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
  .catch(err => {
    throw err
  })
}

const getServerStatus = async (zone: string): Promise<string> => {
  return new Promise<string>((res, rej) => {
    exec(`gcloud compute instances describe pilot-gcp-instance --format="json(status)" --zone="${zone}"`, (error, stdout) => {
      if (error) rej(error)
      res(JSON.parse(stdout).status)
    })
  })
  .catch(error => {
    throw error
  })
}

const getServerIP = async (zone: string): Promise<string> => {
  return new Promise<string>((res, rej) => {
    exec(`gcloud compute instances describe pilot-gcp-instance --format="json(networkInterfaces)" --zone="${zone}"`, (error, stdout) => {
      if (error) rej(error)
      res(JSON.parse(stdout).networkInterfaces[0].accessConfigs[0].natIP)
    })
  })
  .catch(error => {
    throw error
  })
}

const sshExec = async (cmd: string): Promise<string> => {
  const ipAddress = await getServerIP("us-east1-b")
  return new Promise<string>((res, rej) => {
    exec(`ssh pilot@${ipAddress} -i ${paths.TF_CLOUD_INIT} -o StrictHostKeyChecking=no "${cmd}"`, (error, data) => {
      console.log("SSH DATA: ", data)
      console.log("SSH ERROR: ", error)
      if (error) {
        if (error.message.includes("NASTY!")) {
          // this is a non-critical error, don't reject
          res(data)
        }
        rej(error)
      }
      res(data)
    })
  })
  .catch(err => {
    throw err
  })
}

// TODO: move to util/waypoint
const getWaypointAuthToken = async (ipAddress: string): Promise<string> => {
  return await sshExec("waypoint token new")
}

const setContext = async () => {
  const ipAddress = await getServerIP("us-east1-b")
  const token = await getWaypointAuthToken(ipAddress)
  
  await waypoint.setContext(ipAddress, token)
}

const installWaypoint = async () => {
  try {
    // wait for docker daemon to finish coming online
    await timeout(5000)
    const dk = await sshExec("docker ps")
    console.log(dk)
    await sshExec("waypoint install -platform=docker -docker-server-image=pilotframework/pilot-waypoint -accept-tos")
  } catch (err) {
    console.log(err)
  }
}

const configureRunner = async () => {
  const ipAddress = await getServerIP("us-east1-b")
  let envVars = [
    `DOCKER_HOST=tcp://${ipAddress}:2375`,
    "GOOGLE_APPLICATION_CREDENTIALS=/root/.config/pilot-user-file.json",
  ]

  await waypoint.setEnvVars(envVars)
}

const serviceAccountExists = async (gcpProjectID: string): Promise<boolean> => {
  return new Promise<boolean>((res, rej) => {
    exec(`gcloud iam service-accounts describe pilot-user@${gcpProjectID}.iam.gserviceaccount.com --project=${gcpProjectID}`, (error, _) => {
      if (error) {
        let errMsg = error.toString()

        if (errMsg.includes("NOT_FOUND")) {
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

const pilotRoleExists = async (gcpProjectID: string): Promise<boolean> => {
  return new Promise<boolean>((res, rej) => {
    exec(`gcloud iam roles describe pilotService --project ${gcpProjectID}`, (error, stdout) => {
      if (error) {
        let errMsg = error.toString()

        if (errMsg.includes("NOT_FOUND")) {
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

const createServiceAccount = async (gcpProjectID: string): Promise<string> => {
  return new Promise<string>((res, rej) => {
    exec(`gcloud iam service-accounts create pilot-user --project ${gcpProjectID}`, (error, stdout) => {
      if (error) rej(error)
      res(stdout)
    })
  })
  .catch(error => {
    throw error
  })
}

const serviceAccountKeyGen = async (gcpProjectID: string): Promise<string> => {
  return new Promise<string>((res, rej) => {
    exec(`gcloud iam service-accounts keys create ${paths.PILOT_GCP_SERVICE_FILE} \\
    --iam-account=pilot-user@${gcpProjectID}.iam.gserviceaccount.com`, (error, stdout) => {
      if (error) rej(error)
      res(stdout)
    })
  })
  .catch(error => {
    throw error
  })
}

const serviceAccountAuth = async (gcpProjectID: string): Promise<void> => {
  return new Promise<void>((res, rej) => {
    exec(`gcloud auth activate-service-account pilot-user@${gcpProjectID}.iam.gserviceaccount.com \\
    --key-file=${paths.PILOT_GCP_SERVICE_FILE}`, (error) => {
      if (error) rej(error)
      res()
    })
  })
}

const createIAMRole = async (gcpProjectID: string): Promise<string> => {
  const policy = await fsUtil.fileToString(paths.PILOT_GCP_SERVICE_FILE)

  return new Promise<string>((res, rej) => {
    exec(`gcloud iam roles create pilotService \\
    --project ${gcpProjectID} --title "Pilot Framework IAM Role" \\
    --description "This role has the necessary permissions that the Pilot service account uses to deploy applications" \\
    --permissions ${policy} \\
    --quiet`, (error, stdout) => {
      if (error) rej(error)
      res(stdout)
    })
  })
  .catch(error => {
    throw error
  })
}

const bindIAMRole = async (gcpProjectID: string): Promise<string> => {
  return new Promise<string>((res, rej) => {
    exec(`gcloud projects add-iam-policy-binding ${gcpProjectID} \\
    --member="serviceAccount:pilot-user@${gcpProjectID}.iam.gserviceaccount.com" \\
    --role="projects/${gcpProjectID}/roles/pilotService"`, (error, stdout) => {
      if (error) rej(error)
      res(stdout)
    })
  })
  .catch(error => {
    throw error
  })
}

const pilotUserInit = async (gcpProjectID: string, runner: boolean) => {
  let userExists = await serviceAccountExists(gcpProjectID)

  if (!userExists) {
    createServiceAccount(gcpProjectID)
      .catch(err => console.log(err))
  }

  let roleExists = await pilotRoleExists(gcpProjectID)

  if (!roleExists) {
    createIAMRole(gcpProjectID)
      .catch(err => console.log(err))
  }

  await bindIAMRole(gcpProjectID)

  await serviceAccountKeyGen(gcpProjectID)

  // only execute these commands if needing to configure a waypoint runner
  if (runner) {
    await fsUtil.copyFileToVM("gcp")

    await waypoint.dockerCopy()

    await waypoint.dockerConfig(gcpProjectID)

    await waypoint.dockerAuth(gcpProjectID)
  } // else {
  //   await serviceAccountAuth(gcpProjectID)
  // }
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
}
