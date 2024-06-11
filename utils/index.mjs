import { writeFile } from "node:fs/promises";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execPromise = promisify(exec);

export const execCommand = async (command) => {
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

export const saveToFile = async (fileName, data) => {
  try {
    await writeFile(fileName, JSON.stringify(data));
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
};