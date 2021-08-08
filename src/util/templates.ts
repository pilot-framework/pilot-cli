import gcpCreds from './gcp/creds'
import paths from './paths'
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
      {"hosts": ["tcp://0.0.0.0:2375", "unix:///var/run/docker.sock"],
      "log-driver": "json-file",
      "log-opts": {"max-size": "200m", "max-file": "3"}}
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

      # Port the application is listening on
      port = 5000

      capacity {
        memory                     = 128
        cpu_count                  = 1
        max_requests_per_container = 10
        request_timeout            = 300
      }

      auto_scaling {
        max = 2
      }

      vpc_access {
        connector = "pilot-vpc-connector"
        egress = "all"
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

const defaultGCPPermissions = () => 'compute.addresses.list,compute.backendBuckets.create,compute.backendBuckets.delete,compute.backendBuckets.get,compute.backendBuckets.use,compute.globalAddresses.create,compute.globalAddresses.delete,compute.globalAddresses.get,compute.globalAddresses.use,compute.globalForwardingRules.create,compute.globalForwardingRules.delete,compute.globalForwardingRules.get,compute.globalOperations.get,compute.regions.list,compute.sslCertificates.create,compute.sslCertificates.delete,compute.sslCertificates.get,compute.sslCertificates.list,compute.targetHttpsProxies.create,compute.targetHttpsProxies.delete,compute.targetHttpsProxies.get,compute.targetHttpsProxies.use,compute.urlMaps.create,compute.urlMaps.delete,compute.urlMaps.get,compute.urlMaps.list,compute.urlMaps.use,storage.buckets.create,storage.buckets.delete,storage.buckets.get,storage.buckets.update,storage.objects.create,storage.objects.delete,storage.objects.get,storage.objects.update,storage.buckets.getIamPolicy,storage.buckets.setIamPolicy,run.services.get,run.services.list,run.services.create,run.services.update,run.services.delete,run.services.getIamPolicy,run.services.setIamPolicy,run.routes.get,run.routes.list,run.configurations.get,run.configurations.list,run.revisions.get,run.revisions.list,run.revisions.delete,run.locations.get,run.locations.list,iam.serviceAccounts.create,iam.serviceAccounts.actAs,iam.serviceAccounts.get,iam.serviceAccounts.list,resourcemanager.projects.get'

const defaultAWSPolicy = () => `{
  "Version": "2012-10-17",
  "Statement": [
      {
          "Effect": "Allow",
          "Action": [
            "iam:UpdateAssumeRolePolicy",
            "iam:PutRolePermissionsBoundary",
            "logs:*",
            "iam:CreateRole",
            "iam:AttachRolePolicy",
            "iam:PutRolePolicy",
            "iam:CreateUser",
            "autoscaling:*",
            "iam:GetGroup",
            "iam:AddRoleToInstanceProfile",
            "iam:CreateAccessKey",
            "iam:PassRole",
            "cloudfront:*",
            "iam:PutGroupPolicy",
            "iam:GetRole",
            "iam:GetPolicy",
            "s3:*",
            "iam:UpdateUser",
            "iam:AttachUserPolicy",
            "iam:UpdateRoleDescription",
            "iam:DeleteRole",
            "elasticloadbalancing:*",
            "iam:CreatePolicy",
            "iam:CreateServiceLinkedRole",
            "iam:AttachGroupPolicy",
            "ecs:*",
            "lambda:*",
            "ec2:*",
            "ecr:*",
            "iam:UpdateRole",
            "iam:GetGroupPolicy",
            "iam:GetRolePolicy"
        ],
          "Resource": "*"
      }
  ]
}
`

const awsTerraformMain = () => `
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 3.0"
    }
  }
}

provider "aws" {
  region = var.region
}

data "aws_ami" "ubuntu" {
  most_recent = true

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-*20*-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  owners = ["099720109477"] # Canonical
}

resource "aws_vpc" "vpc" {
  cidr_block           = var.cidr_vpc
  enable_dns_support   = true
  enable_dns_hostnames = true
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.vpc.id
}

resource "aws_subnet" "subnet_public" {
  vpc_id     = aws_vpc.vpc.id
  cidr_block = var.cidr_subnet
}

resource "aws_route_table" "rtb_public" {
  vpc_id = aws_vpc.vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }
}

resource "aws_route_table_association" "rta_subnet_public" {
  subnet_id      = aws_subnet.subnet_public.id
  route_table_id = aws_route_table.rtb_public.id
}

resource "aws_security_group" "sg_pilot" {
  name   = "sg_pilot"
  vpc_id = aws_vpc.vpc.id

  # SSH access from the VPC
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 9701
    to_port     = 9701
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 9702
    to_port     = 9702
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

data "template_file" "user_data" {
  template = file("${paths.SSH_DOCKER_WAYPOINT_INIT}")
}

resource "aws_instance" "waypoint" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = "t2.medium"
  key_name                    = var.aws_key_pair
  subnet_id                   = aws_subnet.subnet_public.id
  vpc_security_group_ids      = [aws_security_group.sg_pilot.id]
  associate_public_ip_address = true
  user_data                   = data.template_file.user_data.rendered

  root_block_device {
    volume_size = 20
  }

  tags = {
    Name = "Pilot Waypoint Server"
  }
}

resource "random_password" "pilot_db_pass" {
  length           = 16
  special          = true
  override_special = "_-!"
  min_numeric      = 4
}

resource "aws_subnet" "db_subnet1" {
  vpc_id     = aws_vpc.vpc.id
  cidr_block = "10.1.1.0/24"
  availability_zone = "\${var.region}a"
}

resource "aws_subnet" "db_subnet2" {
  vpc_id     = aws_vpc.vpc.id
  cidr_block = "10.1.2.0/24"
  availability_zone = "\${var.region}b"
}

resource "aws_db_subnet_group" "pilot_db_subnet_group" {
  name       = "pilotdb-group"
  subnet_ids = [aws_subnet.db_subnet1.id, aws_subnet.db_subnet2.id]
}

resource "aws_security_group" "sg_pilot_db" {
  name   = "sg_pilot_db"
  vpc_id = aws_vpc.vpc.id
  description = "Pilot DB security group"

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    security_groups = [aws_security_group.sg_pilot.id]
    description = "Rule allowing access for sg_pilot group"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_instance" "pilot-db" {
  db_subnet_group_name         = aws_db_subnet_group.pilot_db_subnet_group.name
  allocated_storage            = 100
  max_allocated_storage        = 1000
  engine                       = "postgres"
  instance_class               = "db.m6g.large"
  name                         = "postgres"
  username                     = "pilot"
  password                     = random_password.pilot_db_pass.result
  skip_final_snapshot          = true
  vpc_security_group_ids       = [aws_security_group.sg_pilot_db.id]
  performance_insights_enabled = true
  port                         = 5432
}

output "public_ip" {
  value = aws_instance.waypoint.public_ip
}

output "instance_id" {
  value = aws_instance.waypoint.id
}

output "db_user" {
  value = aws_db_instance.pilot-db.username
}

output "db_address" {
  value = aws_db_instance.pilot-db.endpoint
}

output "db_pass" {
  value = random_password.pilot_db_pass.result
  sensitive = true
}
`

const awsTerraformVars = () => `
variable "cidr_vpc" {
  description = "CIDR block for the VPC"
  default     = "10.1.0.0/16"
}
variable "cidr_subnet" {
  description = "CIDR block for the subnet"
  default     = "10.1.0.0/24"
}

variable "environment_tag" {
  description = "Environment tag"
  default     = "Learn"
}

variable "region" {
  description = "The region Terraform deploys your instance"
}

variable "aws_key_pair" {
  description = "Your SSH key to connect to EC2 instance"
  default = "PilotKeyPair"
}
`

const gcpTerraformMain = async (): Promise<string> => `
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 3.0"
    }

    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 3.0"
    }
  }
}

provider "google" {
  project = var.default_project
}

provider "google-beta" {
  project = var.default_project
}

data "google_billing_account" "acct" {
  display_name = "pilot-billing"
  open         = true
}

data "google_project" "pilot" {
  project_id = var.default_project
}

data "google_service_account" "pilot_user" {
  # Should automatically pull project info from provider
  account_id = "pilot-user"
}

resource "google_project_service" "computeEngine" {
  project = data.google_project.pilot.project_id
  service = "compute.googleapis.com"
  disable_on_destroy = false

  timeouts {
    create = "30m"
    update = "40m"
  }

  disable_dependent_services = true
}

resource "google_project_service" "cloudRun" {
  project = data.google_project.pilot.project_id
  service = "run.googleapis.com"
  disable_on_destroy = false

  timeouts {
    create = "30m"
    update = "40m"
  }

  disable_dependent_services = true
}

resource "google_project_service" "service_networking" {
  project = data.google_project.pilot.project_id
  service = "servicenetworking.googleapis.com"
  disable_on_destroy = false

  timeouts {
    create = "30m"
    update = "40m"
  }

  disable_dependent_services = true
}

resource "google_project_service" "vpc_connector" {
  project = data.google_project.pilot.project_id
  service = "vpcaccess.googleapis.com"
  disable_on_destroy = false

  timeouts {
    create = "30m"
    update = "40m"
  }

  disable_dependent_services = true
}

resource "google_project_service" "crm" {
  project = data.google_project.pilot.project_id
  service = "cloudresourcemanager.googleapis.com"


  timeouts {
    create = "30m"
    update = "40m"
  }

  disable_dependent_services = true
}

resource "google_compute_instance" "pilot-instance" {
  name         = "pilot-gcp-instance"
  machine_type = "e2-medium"
  zone         = var.default_zone
  project = data.google_project.pilot.project_id

  boot_disk {
    initialize_params {
      image = "ubuntu-os-cloud/ubuntu-2004-lts"
    }
  }

  network_interface {
    network = google_compute_network.pilot-network.self_link

    access_config {
      // Ephemeral IP
    }
  }

  metadata = {
    user-data = file("${paths.SSH_DOCKER_WAYPOINT_INIT}")
  }

  service_account {
    email  = data.google_service_account.pilot_user.email
    scopes = [ "cloud-platform" ]
  }

  depends_on = [google_project_service.computeEngine]
  allow_stopping_for_update = true
}

resource "google_compute_network" "pilot-network" {
  name = "pilot-network"
  project = data.google_project.pilot.project_id
  depends_on = [google_project_service.computeEngine]
}

resource "google_compute_firewall" "pilot-firewall" {
  name    = "pilot-firewall"
  project = data.google_project.pilot.project_id
  network = google_compute_network.pilot-network.name

  allow {
    protocol = "icmp"
  }

  allow {
    protocol = "tcp"
    ports    = ["22", "80", "8080", "1000-2000", "9701", "9702"]
  }
}

resource "google_compute_global_address" "pilot_db_address" {
  provider = google-beta

  name          = "pilot-db-address"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.pilot-network.id
}

resource "google_service_networking_connection" "pilot_vpc_connection" {
  provider = google-beta

  network                 = google_compute_network.pilot-network.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.pilot_db_address.name]
}

resource "random_id" "db_name_suffix" {
  byte_length = 4
}

resource "google_sql_database_instance" "pilot_db" {
  provider = google-beta
  region = "${await gcpCreds.getGCPRegion()}"

  name              = "pilot-db-\${random_id.db_name_suffix.hex}"
  database_version  = "POSTGRES_11"

  depends_on = [google_service_networking_connection.pilot_vpc_connection]

  settings {
    tier = "db-f1-micro"
    ip_configuration {
      ipv4_enabled    = true
      private_network = google_compute_network.pilot-network.id
    }
  }
}

resource "random_password" "pilot_db_pass" {
  length           = 16
  special          = true
  override_special = "_-!"
  min_numeric      = 4
}

resource "google_sql_user" "pilot_db_user" {
  name      = "pilot"
  password  = random_password.pilot_db_pass.result
  instance  = google_sql_database_instance.pilot_db.name
  type      = "BUILT_IN"
}

# Serverless VPC connector is required for Cloud Run services needing to connect to DB
# Then specify the connector in Waypoint config
resource "google_vpc_access_connector" "pilot_vpc_connector" {
  name          = "pilot-vpc-connector"
  ip_cidr_range = "10.8.0.0/28"
  network       = google_compute_network.pilot-network.name
  region        = "${await gcpCreds.getGCPRegion()}"
}

output "db_user" {
  value = google_sql_user.pilot_db_user.name
}

output "db_pass" {
  value = google_sql_user.pilot_db_user.password
  sensitive = true
}

ouput "db_address" {
  value = google_compute_global_address.pilot_db_address
}
`

const gcpTerraformVars = () => `
variable "default_project" {
  description = "The default GCP project configured via gcloud"
}

variable "default_zone" {
  description = "The zone where the Pilot server is provisioned"
}
`

export default {
  yamlConfig,
  appAWSFrontendHCL,
  appGCPFrontendHCL,
  appAWSBackendHCL,
  appGCPBackendHCL,
  standardHCLTemplate,
  defaultGCPPermissions,
  defaultAWSPolicy,
  awsTerraformMain,
  awsTerraformVars,
  gcpTerraformMain,
  gcpTerraformVars,
}
