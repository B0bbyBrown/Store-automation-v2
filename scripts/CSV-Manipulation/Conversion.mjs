import fs from "fs";
import path from "path";
import csv from "fast-csv";
import cheerio from "cheerio";

// Function to check if a string contains HTML tags
function containsHtmlTags(text) {
  const $ = cheerio.load(text);
  return $("*").length > 0; // Check if any HTML elements exist
}

// Function to strip HTML tags from a string and trim whitespace
function stripHtmlTags(html) {
  const $ = cheerio.load(html);
  return $.text().trim(); // Trim whitespace
}

// Function to ensure directory exists
function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
}

// Function to generate folder name based on current date and time
function generateFolderPath() {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = ("0" + (now.getMonth() + 1)).slice(-2);
  const day = ("0" + now.getDate()).slice(-2);
  const hour = ("0" + now.getHours()).slice(-2);
  const minute = ("0" + now.getMinutes()).slice(-2);
  return `${year}/${month}/${day}/${hour}/${minute}`;
}

// Function to find the latest CSV file in a directory and its subdirectories
async function findLatestCSV(directoryPath) {
  let latestFile = null;
  let latestTime = 0;

  // Recursive function to traverse directories and find CSV files
  async function traverseDirectories(dirPath) {
    const files = await fs.promises.readdir(dirPath);

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const fileStat = await fs.promises.stat(filePath);

      if (fileStat.isDirectory()) {
        await traverseDirectories(filePath); // Recursively traverse subdirectories
      } else if (file.endsWith(".csv") && fileStat.mtimeMs > latestTime) {
        // Update latest file if it's a CSV file and modified later than the current latest
        latestFile = filePath;
        latestTime = fileStat.mtimeMs;
      }
    }
  }

  await traverseDirectories(directoryPath); // Start traversing from the specified directory
  return latestFile;
}

// Function to process HTML-formatted CSV file and save as standard CSV
async function processHtmlCsv(inputCsvPath, outputCsvPath) {
  return new Promise((resolve, reject) => {
    const rows = [];

    // Read input CSV file
    fs.createReadStream(inputCsvPath)
      .pipe(csv.parse({ headers: true }))
      .on("error", (error) => {
        console.error("Error parsing CSV:", error);
        reject(error);
      })
      .on("data", (data) => {
        // Strip HTML tags from the description field and trim white space
        if (data.description && containsHtmlTags(data.description)) {
          data.description = stripHtmlTags(data.description)
            .replace(/\s+/g, " ")
            .trim();
        }
        // Trim white space from all fields
        Object.keys(data).forEach((key) => {
          data[key] = data[key].replace(/\s+/g, " ").trim();
        });
        rows.push(data);
      })
      .on("end", () => {
        // Write processed data to output CSV file
        ensureDirectoryExistence(outputCsvPath);
        csv
          .writeToPath(outputCsvPath, rows, { headers: true }) // Remove trim option
          .on("error", (error) => {
            console.error("Error writing CSV file:", error);
            reject(error);
          })
          .on("finish", () => {
            console.log("Processed CSV file written successfully.");
            resolve();
          });
      });
  });
}

// Main Method
async function mainConversion() {
  try {
    //console.log("Finding the latest CSV file...");
    const latestInputFile = await findLatestCSV("./output");
    //console.log("Found:", latestInputFile);

    //console.log("Setting up a dynamic folder path...");
    const folderPath = generateFolderPath();
    //console.log("Done:", folderPath);

    //console.log("Setting up the output CSV file path...");
    const outputCsvPath = `./output/converted/${folderPath}/products-converted.csv`;
    //console.log("Done:", outputCsvPath);

    //console.log("Converting & Saving HTML-formatted CSV file...");
    await processHtmlCsv(latestInputFile, outputCsvPath);
    //console.log("Done");

    //console.log("Conversion process completed successfully.");
  } catch (error) {
    //console.error("Error occurred during conversion process:", error);
  }
}

// Export mainConversion
export { mainConversion };
