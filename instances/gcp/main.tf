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
  project = "gcp-pilot-testing"
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
  project_id = "gcp-pilot-testing" # TODO: Make dynamic through variables.tf
}

data "google_service_account" "pilot_user" {
  # Should automatically pull project info from provider
  account_id = "pilot-user"
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
<<<<<<< HEAD
    user-data = file("../../templates/ssh-docker-waypoint-init.yaml")
=======
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
>>>>>>> 35cd1c73f69731e3fb90df42e9a95ff66429fe9b
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
    ports    = ["22", "80", "8080", "1000-2000", "9701", "9702", "2375"]
  }
}