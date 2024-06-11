/**
 * Required:
 *  Node: https://nodejs.org/en/download/package-manager
 *  AWS CLI: https://docs.aws.amazon.com/cli/v1/userguide/cli-chap-install.html
 *  AWS Profile set on path "~/.aws/credentials" and "~/.aws/config" and add it on AWS_PROFILES object (line 42)
 *
 * After:
 *  Save the code to organizations-profile-policies.mjs (or any other name ending with .mjs)
 *  Run on your terminal the following command: node organizations-profile-policies.mjs
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

// AWS_PROFILES should contain all the accounts with Organizational Units created and
// at least one SERVICE_CONTROL_POLICY enabled
const AWS_PROFILES = ["YOUR_PROFILE"];

// Enable them on your organization first before uncomment
const SCPs = {
  SERVICE_CONTROL_POLICY: [],
  // "TAG_POLICY" : [],
  // "BACKUP_POLICY" : [],
  // "AISERVICES_OPT_OUT_POLICY" : []
};

// Lists all of the organizational units (OUs) or accounts that are contained in the specified parent OU or root.
const POLICIES = {
  Roots: {}, // list of all Roots (right now just one)
  OUs: {}, // list of all Organization Units in an organization
  ACCs: {}, // list of all accounts in an organization
  SCPs: {}, // list of all policies in an organization by type
};

const getPoliciesByTargetId = async (targetId, awsProfile) => {
  const policies = { ...SCPs };
  for (const policyType in SCPs) {
    const policiesTarget = await execCommand(
      `aws organizations list-policies-for-target --filter ${policyType} --target-id ${targetId} --profile ${awsProfile} --no-paginate`
    );
    policies[policyType] = policiesTarget["Policies"];
  }
  return policies;
};

const getRootUsers = async (awsProfile) => {
  const rootsUsers = await execCommand(
    `aws organizations list-roots --profile ${awsProfile} --no-paginate`
  );
  return rootsUsers["Roots"];
};

const getSCPs = async (awsProfile) => {
  for (const policyType in SCPs) {
    const allPoliciesByType = await execCommand(
      `aws organizations list-policies --filter ${policyType} --profile ${awsProfile} --no-paginate`
    );

    POLICIES["SCPs"][policyType] = {};

    for (const policyTypeObj of allPoliciesByType["Policies"]) {
      const policyId = policyTypeObj["Id"];
      const policyDescription = await execCommand(
        `aws organizations describe-policy --policy-id ${policyId} --profile ${awsProfile} --no-paginate`
      );
      POLICIES["SCPs"][policyType][policyId] = {
        ...policyDescription["Policy"],
      };
    }
  }
};

const getOrgUnits = async (orgOUs = {}, parentID, awsProfile) => {
  const orgChildrenForOU = await execCommand(
    `aws organizations list-children --child-type ORGANIZATIONAL_UNIT --parent-id ${parentID} --profile ${awsProfile} --no-paginate`
  );

  const childrenOrgOUs = orgChildrenForOU["Children"];

  if (!childrenOrgOUs.length) {
    return orgOUs;
  }

  for (let child of childrenOrgOUs) {
    const ou = await execCommand(
      `aws organizations describe-organizational-unit --organizational-unit-id ${child["Id"]} --profile ${awsProfile} --no-paginate`
    );
    orgOUs[child["Id"]] = {
      ...ou["OrganizationalUnit"],
      ...(await getOrgUnits({}, child["Id"], awsProfile)),
      ...(await getPoliciesByTargetId(child["Id"], awsProfile)),
    };
  }

  return orgOUs;
};

const getACCs = async (awsProfile) => {
  const orgACCs = await execCommand(
    `aws organizations list-accounts --profile ${awsProfile} --no-paginate`
  );

  for (const orgAcc of orgACCs["Accounts"]) {
    POLICIES["ACCs"][orgAcc["Id"]] = {
      ...orgAcc,
      ...(await getPoliciesByTargetId(orgAcc["Id"], awsProfile)),
    };
  }
};

const getOrganizationsPolicies = async (awsProfile) => {
  // list of all policies in the organization by type and fetch related Content/Statement
  await getSCPs(awsProfile);

  // Currently, we have only one root. AWS Organizations automatically creates it for us when we create an organization.
  const rootsUsers = await getRootUsers(awsProfile);

  for (const root of rootsUsers) {
    // list of all Roots (right now just one)
    POLICIES["Roots"][root["Id"]] = {
      ...root,
      ...(await getPoliciesByTargetId(root["Id"], awsProfile)),
    };

    // list of all Organization Units in an organization including SCPs
    await getOrgUnits(POLICIES["OUs"], root["Id"], awsProfile);
    // list of all accounts in an organization including SCPs
    await getACCs(awsProfile);
  }
};

for (const awsProfile of AWS_PROFILES) {
  const timestamp = Date.now();
  const policiesFileName = `${timestamp}-${awsProfile}-policies.json`;

  await getOrganizationsPolicies(awsProfile);
  await saveToFile(policiesFileName, POLICIES);

  console.log(
    `Policies saved for: "${awsProfile}", to: "${policiesFileName}".`
  );
}
