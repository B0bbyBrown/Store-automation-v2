import { readFileSync } from "fs";

function loadConfig() {
  try {
    const configData = readFileSync(
      "./scripts/Final_Touches/config.json",
      "utf-8"
    );
    return JSON.parse(configData);
  } catch (error) {
    throw new Error(`Error reading configuration: ${error}`);
  }
}

export { loadConfig };
