import {Command, flags} from '@oclif/command'
import { exec } from 'child_process'
import paths from '../util/paths'
import gcpExec from '../util/gcp/exec'
import awsExec from '../util/aws/exec'
import { cli } from 'cli-ux'
import fs from '../util/fs'

const dockerCopy = async () => {
  const ipAddress = String(await awsExec.getServerIP())
  return new Promise((res, rej) => {
    exec(`ssh pilot@${ipAddress} -i ${paths.TF_CLOUD_INIT} -o StrictHostKeyChecking=no "docker cp ~/.config/pilot-user-file.json waypoint-runner:/root/.config/pilot-user-file.json"`, (error, stdout) => {
      if (error) rej(error)
      res(stdout)
    })
  })
  .catch(err => {
    throw err
  })
}

const dockerConfig = async (gcpProjectID: string) => {
  const ipAddress = String(await awsExec.getServerIP())
  return new Promise((res, rej) => {
    exec(`ssh pilot@${ipAddress} -i ${paths.TF_CLOUD_INIT} -o StrictHostKeyChecking=no "docker exec waypoint-runner gcloud config set account pilot-user@${gcpProjectID}.iam.gserviceaccount.com"`, (error, stdout) => {
      if (error) rej(error)
      res(stdout)
    })
  })
  .catch(err => {
    throw err
  })
}

const dockerAuth = async (gcpProjectID: string) => {
  const ipAddress = String(await awsExec.getServerIP())
  return new Promise((res, rej) => {
    exec(`ssh pilot@${ipAddress} -i ${paths.TF_CLOUD_INIT} -o StrictHostKeyChecking=no "docker exec waypoint-runner gcloud auth activate-service-account pilot-user@${gcpProjectID}.iam.gserviceaccount.com --key-file=/root/.config/pilot-user-file.json"`, (error, stdout) => {
      if (error) rej(error)
      res(stdout)
    })
  })
  .catch(err => {
    throw err
  })
}

const setEnvVar = async (envStr: string) => {
  return new Promise((res, rej) => {
    exec(`${paths.WAYPOINT_EXEC} config set -runner ${envStr}`, (error, stdout) => {
      if (error) rej(error)
      res(stdout)
    })
  })
  .catch(err => {
    throw err
  })
}

export default class Configure extends Command {
  static description = 'Configure remote Waypoint Server with credentials for selected cloud provider.\nThis typically only needs to be run once for each provider.'

  static flags = {
      help: flags.help({char: 'h'}),
      aws: flags.boolean({description: 'Configure server with AWS Pilot IAM credentials'}),
      gcp: flags.boolean({description: 'Configure server with GCP Pilot IAM credentials'}),
      project: flags.string({
        char: 'p',
        description: 'Project ID for GCP Project that the service account and IAM role will be created for',
      }),
  }

  async run() {
    const { flags } = this.parse(Configure)

    if (flags.project === undefined && flags.gcp) {
      this.log("Please specify a project like so: \"pilot configure --gcp -p=PROJECT_ID\"")
      return
    }

    let envVars: Array<string> = []

    if (flags.aws) {
      // TODO
      this.log('Chose aws')
    } else if (flags.gcp) {
      cli.action.start("Configuring IAM user and role for Pilot on GCP...")

      try {
        let userExists = await gcpExec.serviceAccountExists(String(flags.project))

        if (!userExists) {
          gcpExec.createServiceAccount(String(flags.project))
            .catch(err => this.log(err))
        } else {
          this.log("user exists")
        }

        let roleExists = await gcpExec.pilotRoleExists(String(flags.project))

        if (!roleExists) {
          gcpExec.createIAMRole(String(flags.project))
            .catch(err => this.log(err))
        } else {
          this.log("role exists")
        }

        await gcpExec.bindIAMRole(String(flags.project))

        await gcpExec.serviceAccountKeyGen(String(flags.project))

        await fs.copyFileToEC2()

        await dockerCopy()

        await dockerConfig(String(flags.project))

        await dockerAuth(String(flags.project))

        envVars.push("GOOGLE_APPLICATION_CREDENTIALS=/root/.config/pilot-user-file.json")
      } catch (err) {
        this.log(err)
      }

      for (const envVar of envVars) {
        this.log(envVar)
        await setEnvVar(envVar)
      }

      cli.action.stop()
    } else {
      this.log('Run "pilot configure -h" for cloud provider options')
    }
  }
}