# Terraform toolkit

Node and other scripts to assist with Terraform work

## Policy

A policy that is attached to an identity in IAM is known as an identity-based policy. Identity-based policies can include AWS managed policies, customer managed policies, and inline policies. AWS managed policies are created and managed by AWS. You can use them, but you can't manage them. An inline policy is one that you create and embed directly to an IAM group, user, or role. Inline policies can't be reused on other identities or managed outside of the identity where it exists.

**Identity-Based** Policies generally provide broader access control as they apply to multiple resources for a specific IAM entity, whereas **resource-based** policies offer fine-grained control over individual resources, link [Identity-based policies and resource-based policies](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_identity-vs-resource.html).
Identity-based policies are attached to an IAM user, group, or role. These policies let you specify what that identity can do (its permissions).
Resource-based policies are attached to a resource. For example, you can attach resource-based policies to Amazon S3 buckets, Amazon SQS queues, VPC endpoints, AWS Key Management Service encryption keys, and Amazon DynamoDB tables and streams.

The total permissions of a single user are compiled from several places (Managed, Inline and Group)

```sh
# First get list of users 
aws iam list-users

# From Managed (AWS or Custom)
aws iam list-attached-user-policies --user-name ...

# From Inline User/Group
aws iam list-user-policies --user-name
aws iam get-user-policy --user-name ...  --policy-name ...

aws iam list-group-policies --group-name ...
aws iam get-group-policy --group-name ... --policy-name ...

# From Group
aws iam list-groups-for-user --user-name ...
aws iam list-attached-group-policies --group-name ...

# To get Policy
aws iam get-policy --policy-arn ...
aws iam get-policy-version --policy-arn ... --version-id ...

# organizations calls and Policy
aws organizations list-roots --profile ...
aws organizations list-policies-for-target --filter ${filter} --target-id ${targetId} --profile ${awsProfile}
aws organizations list-targets-for-policy --policy-id ${id} --profile ${awsProfile}
```

## Useful Commands

Installer info for Terraform [here](https://www.terraform.io/downloads.html)

```sh
## MacOS
brew tap hashicorp/tap
brew install hashicorp/tap/terraform

terraform version
terraform -help

# Terraform follows the terraform <command> <subcommand> syntax
# Options use a single dash whether it's a single character option
# or full word.

# Standard workflow
terraform fmt -recursive
terraform init
terraform validate

# Pass variables at the command line
terraform plan -var=billing_code="123" -var=project="..." -var=aws_access_key="YOUR_ACCESS_KEY" -var=aws_secret_key="YOUR_SECRET_KEY" -out NAME_FILE.tfplan

# Store our sensitive data in environment variables like so
export TF_VAR_aws_access_key=YOUR_ACCESS_KEY
export TF_VAR_aws_secret_key=YOUR_SECRET_KEY

# For PowerShell
$env:TF_VAR_aws_access_key="YOUR_ACCESS_KEY"
$env:TF_VAR_aws_secret_key="YOUR_SECRET_KEY"

# Now we can run plan without all that extra stuff
terraform plan -out NAME_FILE.tfplan
terraform apply "NAME_FILE.tfplan"

terraform show
terraform show "NAME_FILE.tfplan"
terraform output

terraform state list
terraform state show aws_instance.nginx1

# If you are done, you can tear things down to save $$
terraform destroy

# HOW to use functions!
# You need to initialize the config before terraform console will work.
terraform init
terraform console

# Now we can try some different functions and syntax
min(42,5,16)
lower("SOMETHIN")
cidrsubnet(var.vpc_cidr_block, 8, 0)
cidrhost(cidrsubnet(var.vpc_cidr_block, 8, 0),5)
lookup(local.common_tags, "company", "Unknown")
lookup(local.common_tags, "missing", "Unknown")
local.common_tags
# Test out the range function
range(var.vpc_subnet_count)
# Try it in a for expression
[for subnet in range(var.vpc_subnet_count): cidrsubnet(var.vpc_cidr_block, 8, subnet)]

# Terraform workspaces enable you to deploy multiple instances of a configuration
# using the same base code with different values for the config.
terraform workspace new Development
terraform workspace list

terraform plan -out NAME_FILE.tfplan
terraform apply NAME_FILE.tfplan

# terraform destroy for each workspace
terraform workspace select Development
terraform destroy -auto-approve

# You can delete a workspace too
terraform workspace show
terraform workspace delete Development

# Update module source
terraform get -update

# Login from CLI
terraform login

# Update terraform state after manual changes done on resources with no changes detected
terraform refresh

# Fix No valid credential sources found while configuring Terraform S3 Backend
terraform init -backend-config="access_key=${YOUR_ACCESS_KEY}" -backend-config="secret_key=${YOUR_SECRET_KEY}"

# To Upgrade from 1.7.4 to latest on MAC
# Link: https://developer.hashicorp.com/terraform/install
brew install hashicorp/tap/terraform
# terraform 1.7.4 is already installed but outdated (so it will be upgraded).

# Error: Error acquiring the state lock
terraform force-unlock -force 11111111-2222222-3333333-4444-555555
# Or to relaunch the plan with the following option -lock=false
terraform plan -lock=false
# Or kill that particular process id and run again
ps aux | grep terraform # and sudo kill -9 <process_id>

terraform state push errored.tfstate
```
