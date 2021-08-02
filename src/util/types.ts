export interface HCLAttributes {
  appName: string;
  entryDir: string;
  region: string;
  bucket: string;
  project: string;
  domain: string;
  repoName: string;
  frontend: boolean;
}

export interface SecurityGroup {
  GroupId: string;
  GroupName: string;
}
