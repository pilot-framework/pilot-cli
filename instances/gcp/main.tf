terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 3.0"
    }
  }
}

# TODO: project, region, and zone will be custom to the google project
provider "google" {
  project = "pilot"
  region = "us-east1"
  zone = "us-east1-b"
}

data "google_billing_account" "acct" {
  display_name = "pilot-billing"
  open         = true
}

# resource "google_project" "my_project" {
#   name       = "pilot"
#   project_id = "pilot-321119"
#   billing_account = data.google_billing_account.acct.id
# }

data "google_project" "pilot" {
  project_id = "pilot-321119" # TODO: Make dynamic through variables.tf
}

resource "google_project_service" "iamService" {
  
  project = data.google_project.pilot.project_id
  service = "iam.googleapis.com"

  timeouts {
    create = "30m"
    update = "40m"
  }

  disable_dependent_services = true  
}

resource "google_project_service" "computeEngine" {
  project = data.google_project.pilot.project_id
  service = "compute.googleapis.com"

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

resource "google_service_account" "service_account" {
  account_id   = "pilot-service-account"
  project = data.google_project.pilot.project_id
}

resource "google_service_account_key" "mykey" {
  service_account_id = google_service_account.service_account.name
}

data "google_service_account_key" "mykey" {
  name            = google_service_account_key.mykey.name
  public_key_type = "TYPE_X509_PEM_FILE"
}

resource "google_compute_instance" "pilot-instance" {
  name         = "pilot-gcp-instance"
  machine_type = "e2-medium"
  zone         = "us-east1-b" # TODO: get defaults from .pilot config
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
    startup-script = <<-EOF
      #!/bin/sh
      sudo curl -fsSL https://get.docker.com -o get-docker.sh 
      sudo sh get-docker.sh           
      sudo apt-get install -y software-properties-common
      curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add -
      sudo apt-add-repository "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release -cs) main"
      sudo apt-get update && sudo apt-get install -y waypoint
      echo {\\"hosts\\": [\\"tcp://0.0.0.0:2375\\", \\"unix:///var/run/docker.sock\\"]} | sudo tee /etc/docker/daemon.json > /dev/null
      sudo mkdir /etc/systemd/system/docker.service.d
      echo "[Service]" | sudo tee /etc/systemd/system/docker.service.d/override.conf > /dev/null
      echo "ExecStart=" | sudo tee -a /etc/systemd/system/docker.service.d/override.conf > /dev/null
      echo "ExecStart=/usr/bin/dockerd" | sudo tee -a /etc/systemd/system/docker.service.d/override.conf > /dev/null
      # sudo systemctl daemon-reload
      # sudo systemctl restart docker.service
      waypoint install -platform=docker -docker-server-image=pilotframework/pilot-waypoint -accept-tos
    EOF
  }

  service_account {
    # Google recommends custom service accounts that have cloud-platform scope and permissions granted via IAM Roles.
    email  = google_service_account.service_account.email
    scopes = ["cloud-platform"]
  }

  depends_on = [google_project_service.computeEngine]
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