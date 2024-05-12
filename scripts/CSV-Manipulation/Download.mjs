import { get } from "https";
import { existsSync, mkdirSync, createWriteStream, createReadStream } from "fs";
import { dirname } from "path";
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
  const dirPath = dirname(filePath);
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true }); // Ensure parent directories also created
  }
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
    await pipelineAsync(response, createWriteStream(dest));
  } catch (error) {
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
async function mainDownload() {
  try {
    const url = "https://www.vermontsales.co.za/exports_v2/products.csv.gz";
    const downloadPath = "./output/downloads";
    const unzipPath = "./output/unzipped";

    //console.log("Busy setting up a dynamic folder path...");
    const fileName = generateFolderPath();
    //console.log("Done");

    const filePath = `${downloadPath}/${fileName}`;
    const outputFilePath = `${unzipPath}/products.csv`;

    //console.log("Making sure a folder exists for csv.gz file...");
    ensureDirectoryExistence(filePath);
    //console.log("Found it");

    //console.log("Making sure a folder exists for unzipped file...");
    ensureDirectoryExistence(outputFilePath);
    //console.log("Found it");

    //console.log("Downloading file...");
    await downloadFile(url, filePath);
    //console.log("Done");

    //console.log("Unzipping file...");
    await unzipFile(filePath, outputFilePath);
    //console.log("You're all sorted, find your file in the ./output/unzipped folder.");
  } catch (error) {
    console.error("Error:", error);
  }
}

// Export mainDownload
export { mainDownload };
