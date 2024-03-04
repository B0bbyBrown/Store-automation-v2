import fs from "fs";
import path from "path";
import csv from "fast-csv";
import cheerio from "cheerio";

// Function to check if a string contains HTML tags
function containsHtmlTags(text) {
  const $ = cheerio.load(text);
  return $("*").length > 0; // Check if any HTML elements exist
}

// Function to strip HTML tags from a string
function stripHtmlTags(html) {
  const $ = cheerio.load(html);
  return $.text();
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
  const rows = [];

  // Read input CSV file
  fs.createReadStream(inputCsvPath)
    .pipe(csv.parse({ headers: true }))
    .on("error", (error) => console.error("Error parsing CSV:", error))
    .on("data", (data) => {
      // Strip HTML tags from the description field
      if (containsHtmlTags(data.description)) {
        data.description = stripHtmlTags(data.description);
      }
      rows.push(data);
    })
    .on("end", () => {
      // Write processed data to output CSV file
      ensureDirectoryExistence(outputCsvPath);
      csv
        .writeToPath(outputCsvPath, rows, { headers: true })
        .on("error", (error) => console.error("Error writing CSV file:", error))
        .on("finish", () =>
          console.log("Processed CSV file written successfully.")
        );
    });
}

// Main function to orchestrate the conversion process
async function conversionMain() {
  try {
    // Locate the latest CSV file in the "./output" directory and its subdirectories
    const latestInputFile = await findLatestCSV("./output");

    // Generate the folder path dynamically based on current date and time
    const folderPath = generateFolderPath();

    // Construct the full path for the output CSV file
    const outputCsvPath = `./output/converted/${folderPath}/products-converted.csv`;

    // Process HTML-formatted CSV file and save as standard CSV
    await processHtmlCsv(latestInputFile, outputCsvPath);

    console.log("Conversion process completed successfully.");
  } catch (error) {
    console.error("Error occurred during conversion process:", error);
  }
}

// Call the main function to start the conversion process
conversionMain();
