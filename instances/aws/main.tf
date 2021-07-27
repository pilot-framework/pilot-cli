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

resource "aws_security_group" "sg_22_80" {
  name   = "sg_22"
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

  ingress {
    from_port   = 2375
    to_port     = 2375
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # TODO: Change to instance ip address
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# TODO: Permission denied! May not be able to set permissions in TF
# resource "local_file" "docker_daemon" {
#   content = "{\"hosts\": [\"tcp://0.0.0.0:2375\", \"unix:///var/run/docker.sock\"]}"
#   filename = "/etc/docker/daemon.json"
# }

# resource "local_file" "docker_override_conf" {
#   content = <<-EOF
#     [Service]
#     ExecStart=
#     ExecStart=/usr/bin/dockerd
#   EOF
#   filename = "/etc/systemd/system/docker.service.d/override.conf"
# }

data "template_file" "user_data" {
  template = file("../../templates/ssh-docker-waypoint-init.yaml")
}

resource "aws_instance" "waypoint" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = "t2.micro"
  key_name                    = var.aws_key_pair
  subnet_id                   = aws_subnet.subnet_public.id
  vpc_security_group_ids      = [aws_security_group.sg_22_80.id]
  associate_public_ip_address = true
  user_data                   = data.template_file.user_data.rendered

  tags = {
    Name = "Pilot Waypoint Server"
  }
}

output "public_ip" {
  value = aws_instance.waypoint.public_ip
}

output "instance_id" {
  value = aws_instance.waypoint.id
}