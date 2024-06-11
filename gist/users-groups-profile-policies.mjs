/**
 * Required:
 *  Node: https://nodejs.org/en/download/package-manager
 *  AWS CLI: https://docs.aws.amazon.com/cli/v1/userguide/cli-chap-install.html
 *  AWS Profile set on path "~/.aws/credentials" and "~/.aws/config" and add it on AWS_PROFILES object (line 42)
 *
 * After:
 *  Save the code to users-groups-profile-policies.mjs (or any other name ending with .mjs)
 *  Run on your terminal the following command: node users-groups-profile-policies.mjs
 */

import { writeFile } from "node:fs/promises";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execPromise = promisify(exec);

const execCommand = async (command) => {
  try {
    console.log(`execute command: ${command}`);
    const { stdout, stderr } = await execPromise(command);
    if (stdout) {
      return JSON.parse(stdout);
    }
    console.log(`stderr: ${stderr || "N/A"}`);
    return {};
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
};

const saveToFile = async (fileName, data) => {
  try {
    await writeFile(fileName, JSON.stringify(data));
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
};

const AWS_PROFILES = ["YOUR_PROFILE"];

// IAM Policies by Account
const USER_GROUP_PROFILE_POLICIES = {
  Users: {},
  PoliciesArn: [],
  PoliciesDocument: {},
};

const getUsersAndGroupsPoliciesPerProfile = async (awsProfile) => {
  // Get all users for the AWS Profile ACCOUNT
  const users = await execCommand(
    `aws iam list-users --profile ${awsProfile} --no-paginate`
  );

  // Create Users object and get the list attached policies per user
  for (const user of users["Users"]) {
    const userName = user.UserName;

    // Managed Policies
    const attachedPolicies = await execCommand(
      `aws iam list-attached-user-policies --user-name ${userName} --profile ${awsProfile} --no-paginate`
    );

    USER_GROUP_PROFILE_POLICIES["Users"][userName] = {
      ...user,
      ...attachedPolicies,
      GroupNames: {},
      InlineUserPolicies: [],
      InlineGroupPolicies: [],
    };

    // Creates the list of all ARN policies attached to the Account users
    for (const key in attachedPolicies["AttachedPolicies"]) {
      const policyArn = attachedPolicies["AttachedPolicies"][key]["PolicyArn"];
      if (
        USER_GROUP_PROFILE_POLICIES["PoliciesArn"].indexOf(policyArn) === -1
      ) {
        USER_GROUP_PROFILE_POLICIES["PoliciesArn"].push(policyArn);
      }
    }

    // Inline Policies attached to User
    const inlineUserPolicies = await execCommand(
      `aws iam list-user-policies --user-name ${userName} --profile ${awsProfile} --no-paginate`
    );

    for (const key in inlineUserPolicies["PolicyNames"]) {
      const policyName = inlineUserPolicies["PolicyNames"][key];
      const policyDocument = await execCommand(
        `aws iam get-user-policy --user-name ${userName} --policy-name ${policyName} --profile ${awsProfile} --no-paginate`
      );

      USER_GROUP_PROFILE_POLICIES["Users"][userName]["InlineUserPolicies"].push(
        {
          PolicyName: policyDocument.PolicyName,
          PolicyDocument: policyDocument.PolicyDocument,
        }
      );
    }

    // Group Policies
    const groups = await execCommand(
      `aws iam list-groups-for-user --user-name ${userName} --profile ${awsProfile} --no-paginate`
    );

    for (const group of groups["Groups"]) {
      const groupName = group["GroupName"];

      const groupAttachedPolicies = await execCommand(
        `aws iam list-attached-group-policies --group-name ${groupName} --profile ${awsProfile} --no-paginate`
      );

      USER_GROUP_PROFILE_POLICIES["Users"][userName]["GroupNames"][groupName] =
        {
          ...group,
          AttachedPolicies: groupAttachedPolicies["AttachedPolicies"],
        };

      for (const key in groupAttachedPolicies["AttachedPolicies"]) {
        const policyArn =
          groupAttachedPolicies["AttachedPolicies"][key]["PolicyArn"];
        if (
          USER_GROUP_PROFILE_POLICIES["PoliciesArn"].indexOf(policyArn) === -1
        ) {
          USER_GROUP_PROFILE_POLICIES["PoliciesArn"].push(policyArn);
        }
      }

      // Inline Policies attached to Group
      const inlineGroupPolicies = await execCommand(
        `aws iam list-group-policies --group-name ${groupName} --profile ${awsProfile} --no-paginate`
      );

      for (const policyName of inlineGroupPolicies["PolicyNames"]) {
        const policyDocument = await execCommand(
          `aws iam get-group-policy --group-name ${groupName} --policy-name ${policyName} --profile ${awsProfile} --no-paginate`
        );

        USER_GROUP_PROFILE_POLICIES["Users"][userName][
          "InlineGroupPolicies"
        ].push({
          GroupName: policyDocument.GroupName,
          PolicyName: policyDocument.PolicyName,
          PolicyDocument: policyDocument.PolicyDocument,
        });
      }
    }
  }

  // Iterate on AttachedPolicies, policyArn = USER_GROUP_PROFILE_POLICIES.AttachedPolicies.[*].PolicyArn
  for (const policyArn of USER_GROUP_PROFILE_POLICIES["PoliciesArn"]) {
    const policy = await execCommand(
      `aws iam get-policy --policy-arn ${policyArn} --profile ${awsProfile} --no-paginate`
    );
    const policyVersion = await execCommand(
      `aws iam get-policy-version --policy-arn ${policyArn} --version-id ${policy["Policy"]["DefaultVersionId"]} --profile ${awsProfile} --no-paginate`
    );

    USER_GROUP_PROFILE_POLICIES["PoliciesDocument"][policyArn] = {
      ...policy["Policy"],
      Document: { ...policyVersion["PolicyVersion"]["Document"] },
    };
  }
};

for (const awsProfile of AWS_PROFILES) {
  const timestamp = Date.now();
  const policiesFileName = `${timestamp}-${awsProfile}-users-groups-profile-policies.json`;

  await getUsersAndGroupsPoliciesPerProfile(awsProfile);
  await saveToFile(policiesFileName, USER_GROUP_PROFILE_POLICIES);

  console.log(
    `Policies saved for: "${awsProfile}", to: "${policiesFileName}".`
  );
}
