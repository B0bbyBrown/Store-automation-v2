import { get } from "https";
import {
  existsSync,
  mkdirSync,
  createWriteStream,
  createReadStream,
  promises as fsPromises,
} from "fs";
import { dirname as _dirname } from "path";
import { pipeline } from "stream";
import { promisify } from "util";
import { createGunzip } from "zlib";

// Function to generate folder name based on current date and time
export function generateFolderPath() {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = ("0" + (now.getMonth() + 1)).slice(-2);
  const day = ("0" + now.getDate()).slice(-2);
  const hour = ("0" + now.getHours()).slice(-2);
  const minute = ("0" + now.getMinutes()).slice(-2);
  return `${year}/${month}/${day}/${hour}/${minute}`;
}

// Function to ensure directory exists
export function ensureDirectoryExistence(filePath) {
  const dirname = _dirname(filePath);
  if (existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  mkdirSync(dirname);
}

// Function to download file from URL
export async function downloadFile(url, dest) {
  const pipelineAsync = promisify(pipeline);
  try {
    const response = await new Promise((resolve, reject) => {
      get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(
            new Error(
              `Failed to download file: HTTP status ${response.statusCode}`
            )
          );
          return;
        }
        resolve(response);
      }).on("error", (error) => {
        reject(new Error(`Failed to download file: ${error.message}`));
      });
    });

    // console.log(`Download started. Saving to: ${dest}`);
    await pipelineAsync(response, createWriteStream(dest));
    // console.log(`Download completed successfully. File saved to: ${dest}`);
  } catch (error) {
    console.error(`Failed to download file: ${error.message}`);
    throw new Error(`Failed to download file: ${error.message}`);
  }
}

// Function to unzip file
export async function unzipFile(inputFilePath, outputFilePath) {
  return new Promise((resolve, reject) => {
    const gunzip = createGunzip();
    const readStream = createReadStream(inputFilePath);
    const writeStream = createWriteStream(outputFilePath);

    readStream.pipe(gunzip).pipe(writeStream);

    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
  });
}

// Main Method
export async function mainDownload() {
  try {
    console.log("Starting up scripting engine...");
    const url = "https://www.vermontsales.co.za/exports_v2/products.csv.gz";
    const downloadPath = "./output/downloads";
    const unzipPath = "./output/unzipped";
    console.log("Ready to go!");

    // Generate file & path dynamically
    console.log("Busy setting up a dynamic folder path...");
    const fileName = generateFolderPath();
    console.log("Done");

    const filePath = `${downloadPath}/${fileName}`;
    const outputFilePath = `${unzipPath}/products.csv`;

    // Ensure directory exists
    console.log("Making sure a folder exists for csv.gz file...");
    ensureDirectoryExistence(filePath);
    console.log("Found it");
    console.log("Making sure a folder exists for unzipped file...");
    ensureDirectoryExistence(outputFilePath);
    console.log("Found it");

    // Download file
    console.log("Downloading file...");
    await downloadFile(url, filePath);
    console.log("Done");

    // Unzip the file
    console.log("Unzipping file...");
    await unzipFile(filePath, outputFilePath);
    console.log("Youre all sorted, find your file in the unzipped folder");
  } catch (error) {
    console.error("Error:", error);
  }
}

// Execute main method
mainDownload();
