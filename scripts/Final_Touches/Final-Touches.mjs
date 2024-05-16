import fs from "fs";
import path from "path";
import csvParser from "csv-parser";
import { Transform } from "stream";
import { stringify as csvStringify } from "csv-stringify";

// Function to find the latest CSV file in a directory and its subdirectories
async function findLatestCSV(directoryPath) {
  let latestFile = null;
  let latestTime = 0;

  // Ensure the directory exists
  if (!fs.existsSync(directoryPath)) {
    console.log(`Directory ${directoryPath} does not exist. Creating it...`);
    fs.mkdirSync(directoryPath, { recursive: true });
    return null;
  }

  // Recursive function to traverse directories and find CSV files
  async function traverseDirectories(dirPath) {
    const files = await fs.promises.readdir(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const fileStat = await fs.promises.stat(filePath);
      if (fileStat.isDirectory()) {
        await traverseDirectories(filePath);
      } else if (file.endsWith(".csv") && fileStat.mtimeMs > latestTime) {
        latestFile = filePath;
        latestTime = fileStat.mtimeMs;
      }
    }
  }

  await traverseDirectories(directoryPath);
  return latestFile;
}

// Function to generate folder name based on current date and time
function generateFolderPath() {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = ("0" + (now.getMonth() + 1)).slice(-2);
  const day = ("0" + now.getDate()).slice(-2);
  const hour = ("0" + now.getHours()).slice(-2);
  const minute = ("0" + now.getMinutes()).slice(-2);
  const folderPath = `./output/final_touches/${year}/${month}/${day}/${hour}/${minute}`;

  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  return folderPath;
}

// Function to clean up and remove specific columns from the row data
function cleanUp(row) {
  delete row.is_essential;
  delete row.is_accessory;
  delete row.is_spare;
  delete row.minimum_allowed_quantity;
  delete row.date_expected;
  delete row.erp_status;
  return row;
}

// Function to transform category name to slug
function transformCategoryNameToSlug(categoryName) {
  return categoryName
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[\s\W-]+/g, "-");
}

// Function to transform the category hierarchy string into an array of category objects with IDs
function transformCategoryHierarchy(hierarchy) {
  return hierarchy.split(" > ").map((categoryName) => {
    const slug = transformCategoryNameToSlug(categoryName);
    return { id: slug, name: categoryName.trim(), slug: slug };
  });
}

// Adjust price by 10%
function adjustPrice(price) {
  const adjustedPrice = parseFloat(price) * 1.0;
  return adjustedPrice.toFixed(2);
}

// Transform each row synchronously
function transformRow(row) {
  if (row.regular_price) {
    row.regular_price = adjustPrice(row.regular_price);
  }
  row.categories = JSON.stringify(
    transformCategoryHierarchy(row.product_hierarchy)
  );
  return cleanUp(row);
}

// Main Method
async function mainFinalTouches() {
  const latestCSV = await findLatestCSV("./output/woo_rephrase/");
  if (!latestCSV) {
    console.log("No CSV file found in the specified directory.");
    return;
  }

  console.log("Latest CSV file found:", latestCSV);
  const folderPath = generateFolderPath();
  const newFilePath = path.join(folderPath, "transformed.csv");
  const writeStream = fs.createWriteStream(newFilePath);

  let productCount = 0;

  const readStream = fs
    .createReadStream(latestCSV)
    .pipe(csvParser({ delimiter: ",", columns: true }))
    .pipe(
      new Transform({
        objectMode: true,
        transform: async (row, encoding, callback) => {
          if (productCount >= 5000) {
            // Stop processing further rows
            writeStream.end();
            callback(); // Signal completion without transforming
            return;
          }

          try {
            const transformedRow = transformRow(row);
            productCount++;
            callback(null, transformedRow);
          } catch (error) {
            console.error("Error transforming row:", error);
            callback(error);
          }
        },
      })
    )
    .pipe(csvStringify({ header: true }))
    .pipe(writeStream);

  readStream.on("error", (error) => {
    console.error("Error reading the CSV file:", error);
  });

  writeStream.on("error", (error) => {
    console.error("Error writing the CSV file:", error);
  });
}

mainFinalTouches();

export { mainFinalTouches };
