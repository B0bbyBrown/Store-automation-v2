import { readdir, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { join } from "node:path";
import csvParser from "csv-parser";
import csv from "fast-csv";
import path from "path";
import fs from "fs";
import { readFileSync } from "fs";
import winston from "winston";
import config from "./config.json";

// Initialize logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(
      ({ timestamp, level, message }) =>
        `${timestamp} - ${level.toUpperCase()}: ${message}`
    )
  ),
  transports: [new winston.transports.Console()],
});

// Ensure directory existence
function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
    logger.info(`Created directory: ${dirname}`);
  }
}

// Generate folder path
function generateFolderPath() {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = ("0" + (now.getMonth() + 1)).slice(-2);
  const day = ("0" + now.getDate()).slice(-2);
  const hour = ("0" + now.getHours()).slice(-2);
  const minute = ("0" + now.getMinutes()).slice(-2);

  return `final_filter/${year}/${month}/${day}/${hour}/${minute}`;
}

// Find the latest CSV file
async function findLatestCSV(convertedDirectoryPath) {
  let latestFile = null;
  let latestTime = 0;

  async function traverseDirectories(output) {
    const files = await readdir(output);
    for (const file of files) {
      const filePath = join(output, file);
      const fileStat = await stat(filePath);

      if (fileStat.isDirectory()) {
        await traverseDirectories(filePath);
      } else if (file.endsWith(".csv") && fileStat.mtimeMs > latestTime) {
        latestFile = filePath;
        latestTime = fileStat.mtimeMs;
      }
    }
  }

  await traverseDirectories(convertedDirectoryPath);
  return latestFile;
}

// Define keywords
function defineKeywords() {
  try {
    // Reading keywords from a configuration file
    const configData = readFileSync(
      "./scripts/Final_Touches/config.json",
      "utf-8"
    );
    const config = JSON.parse(configData);
    return config.keywords || [];
  } catch (error) {
    logger.error("Error reading configuration: " + error);
    return [];
  }
}

// Filter products by keywords
async function filterProductsByKeywords(filePath, keywords) {
  const has = [];
  const hasNot = [];
  const products = [];

  return new Promise((resolve, reject) => {
    logger.info("Reading and parsing CSV data...");
    createReadStream(filePath)
      .pipe(csvParser())
      .on("data", (row) => products.push(row))
      .on("end", () => {
        logger.info("CSV data read successfully. Processing data...");

        for (const product of products) {
          const productName = product.product_name || ""; // Safeguard against undefined fields
          const productMetaData = product.meta_data || ""; // Safeguard against undefined fields

          let found = false;

          for (const keyword of keywords) {
            if (
              productName.includes(keyword) ||
              productMetaData.includes(keyword)
            ) {
              has.push(product);
              found = true;
              break; // Avoid duplicate entries
            }
          }

          if (!found) {
            hasNot.push(product); // Add to 'has not' if no keyword matches
          }
        }

        logger.info("Data processing complete.");
        resolve({ has, hasNot }); // Resolve with both lists
      })
      .on("error", (error) => {
        logger.error("Error parsing CSV file:", error);
        reject(error);
        logger.info("Filtered lists:", {
          has: has.length,
          hasNot: hasNot.length,
        });
      });
  });
}

// Save filtered products
async function saveFilteredProducts(filteredProducts, outputPath) {
  return new Promise((resolve, reject) => {
    ensureDirectoryExistence(outputPath); // Make sure the directory exists

    logger.info("Writing data to new CSV...");
    csv
      .writeToPath(outputPath, filteredProducts, { headers: true }) // Use headers from the first row
      .on("error", (error) => {
        logger.error("Error writing CSV file:", error);
        reject(error);
      })
      .on("finish", () => {
        logger.info(`Filtered products saved to ${outputPath}`);
        resolve();
      });
  });
}

// Main function
async function mainFinalFilter() {
  const convertedDirectoryPath = "./output/final_touches/";

  try {
    logger.info("Finding the latest CSV file...");
    const latestFile = await findLatestCSV(convertedDirectoryPath);
    if (!latestFile) {
      logger.error("No CSV file found.");
      return;
    }
    logger.info("Latest CSV file found:", latestFile);

    const keywords = defineKeywords();
    logger.info("Keywords defined:", keywords);

    const { has, hasNot } = await filterProductsByKeywords(
      latestFile,
      keywords
    );

    logger.info(
      `Found ${has.length} products matching keywords and ${hasNot.length} not matching.`
    );

    if (has.length > 0) {
      const folderPath = generateFolderPath();
      const outputPath = `${
        config.directories?.output || "./output/"
      }/${folderPath}/final_filter.csv`;

      logger.info("Saving 'has' list to new CSV...");
      const saveStatus = await saveFilteredProducts(has, outputPath);
      if (saveStatus) {
        logger.info("Filtered products successfully saved.");
      } else {
        logger.error("Error saving filtered products.");
      }
    }
  } catch (error) {
    logger.error("Error occurred during the filtering process:", error);
  }
}

mainFinalFilter();
