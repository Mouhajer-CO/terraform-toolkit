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
