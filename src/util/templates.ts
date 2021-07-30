import { HCLAttributes } from './types'

const yamlConfig = (sshPubKey: string) =>
  `#cloud-config
# Add groups to the system
# Adds the ubuntu group with members 'root' and 'sys'
# and the empty group pilot.
groups:
  - ubuntu: [root,sys]
  - pilotgrp
  - docker

# Add users to the system. Users are added after groups are added.
users:
  - default
  - name: pilot
    gecos: pilot
    shell: /bin/bash
    primary_group: pilotgrp
    sudo: ALL=(ALL) NOPASSWD:ALL
    groups: users, admin, docker
    lock_passwd: false
    ssh_authorized_keys:
      - ${sshPubKey}

apt:
  preserve_sources_list: true
  sources:
    docker:
      source: "deb [arch=amd64] https://download.docker.com/linux/ubuntu focal stable"
      keyid: 9DC8 5822 9FC7 DD38 854A  E2D8 8D81 803C 0EBF CD88
    waypoint:
      source: "deb [arch=amd64] https://apt.releases.hashicorp.com focal main"
      keyid: E8A0 32E0 94D8 EB4E A189  D270 DA41 8C88 A321 9F7B

apt_update: true

packages:
  - apt-transport-https
  - ca-certificates
  - curl
  - gnupg
  - lsb-release
  - docker-ce
  - docker-ce-cli
  - containerd.io
  - waypoint

# Configuration files for Docker host
write_files:
  - content: |
      [Service]
      ExecStart=
      ExecStart=/usr/bin/dockerd
    path: /etc/systemd/system/docker.service.d/override.conf
  - content: |
      {"hosts": ["tcp://0.0.0.0:2375", "unix:///var/run/docker.sock"]}
    path: /etc/docker/daemon.json

runcmd:
  - sudo systemctl daemon-reload
  - sudo systemctl restart docker.service`

const appAWSFrontendHCL = (attrs: HCLAttributes) =>
  `# Name of your application
app "${attrs.appName}" {
  build {
    # The template uses a default build plugin provided by Pilot
    # to build your static files for deployment
    use "yarn" {
      # The application entrypoint in relation to the root of your project/repo
      # example: directory = "./sub_dir/my_app"
      directory = "./${attrs.entryDir}"
    }
  }

  deploy {
    # The template uses a default deploy plugin provided by Pilot
    # to deploy your static assets to a S3 bucket with static web hosting enabled
    use "pilot-cloudfront" {
      # Your chosen AWS region
      region = "${attrs.region}"
      # This should be a globally unique bucket name
      bucket = "${attrs.bucket}"
      # Location of build files in relation to root of project/repo
      directory = ".${attrs.entryDir !== '' ? '/' + attrs.entryDir : ''}/build/"
    }
  }

  release {
    # The template uses a default release plugin provided by Pilot
    # to deploy your static site to a Cloudfront distribution
    use "pilot-cloudfront" {}
  }
}`

const appGCPFrontendHCL = (attrs: HCLAttributes) =>
  `# Name of your application
app "${attrs.appName}" {
  build {
    # The template uses a default build plugin provided by Pilot
    # to build your static files for deployment
    use "yarn" {
      # The application entrypoint in relation to the root of your project/repo
      # example: directory = "./sub_dir/my_app"
      directory = "./${attrs.entryDir}"
    }
  }

  deploy {
    # The template uses a default deploy plugin provided by Pilot
    # to deploy your static assets to a Cloud Storage bucket
    use "pilot-cloud-cdn" {
      # Your GCP Project ID - this will be the default Project ID if used with Pilot
      project = "${attrs.project}"
      # This should be a globally unique bucket name
      bucket = "${attrs.bucket}"
      # Your chosen GCP region
      region = "${attrs.region}"
      # Location of build files in relation to root of project/repo
      directory = "./${attrs.entryDir}/build"
    }
  }

  release {
    # The template uses a default release plugin provided by Pilot
    # to deploy your static site to a Cloud CDN distribution
    use "pilot-cloud-cdn" {
        domain = "${attrs.domain}"
    }
  }
}`

const appAWSBackendHCL = (attrs: HCLAttributes) =>
  `# See the following for additional information on Waypoint's built-in ECS plugin:
# https://www.waypointproject.io/plugins/aws-ecs

app "${attrs.appName}" {
  # The application entrypoint in relation to the root of your project/repo
  # example: path = "./sub_dir/my_app"
  path = "./${attrs.entryDir}"

  build {
    # Builds an image based off of your source code using Cloud Native Buildpacks
    use "pack" {}
    registry {
      # ECR registry to push built images to
      use "aws-ecr" {
        region     = "${attrs.region}"
        repository = "${attrs.repoName}"
        tag        = "latest"
      }
    }
  }

  deploy {
    # ECS Deployment cluster parameters
    # Doubles as the release platform
    use "aws-ecs" {
      region = "${attrs.region}"
      memory = "512"
    }
  }
}`

const appGCPBackendHCL = (attrs: HCLAttributes) =>
  `# See the following for additional information on Waypoint's built-in GCR plugin:
# https://www.waypointproject.io/plugins/google-cloud-run

app "${attrs.appName}" {
  # The application entrypoint in relation to the root of your project/repo
  # example: path = "./sub_dir/my_app"
  path = "./${attrs.entryDir}"

  build {
    # Builds an image based off of your source code using Cloud Native Buildpacks
    use "pack" {}

    registry {
      # Pushes built image to Cloud Container Registry
      use "docker" {
        image = "gcr.io/${attrs.project}/${attrs.appName}"
        tag   = "latest"
      }
    }
  }

  deploy {
    # Deploys application to Google Cloud Run
    use "google-cloud-run" {
      project  = "${attrs.project}"
      location = "${attrs.region}"

      capacity {
        memory                     = 128
        cpu_count                  = 1
        max_requests_per_container = 10
        request_timeout            = 300
      }

      auto_scaling {
        max = 2
      }
    }
  }

  release {
    # Releases application on Google Cloud Run
    use "google-cloud-run" {}
  }
}`

const standardHCLTemplate = () =>
  `# The name of your project. A project typically maps 1:1 to a VCS repository.
# This name must be unique for your Waypoint server. If you're running in
# local mode, this must be unique to your machine.
project = "my-project"

# Labels can be specified for organizational purposes.
# labels = { "foo" = "bar" }

# An application to deploy.
app "web" {
  # Build specifies how an application should be deployed. In this case,
  # we'll build using a Dockerfile and keeping it in a local registry.
  build {
    use "docker" {}

    # Uncomment below to use a remote docker registry to push your built images.
    #
    # registry {
    #   use "docker" {
    #     image = "registry.example.com/image"
    #     tag   = "latest"
    #   }
    # }

  }

  # Deploy to Docker
  deploy {
      use "docker" {}
  }
}`

export default {
  yamlConfig,
  appAWSFrontendHCL,
  appGCPFrontendHCL,
  appAWSBackendHCL,
  appGCPBackendHCL,
  standardHCLTemplate,
}
