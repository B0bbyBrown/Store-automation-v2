import fs from "fs";
import path from "path";
import csv from "fast-csv";

// Define the mapping between old headers and new headers
const headerMapping = {
  model: "sku",
  name: "name",
  product_image_url: "images",
  category: "categories",
  product_url: "permalink",
  dimensions_length: "dimensions_length",
  dimensions_width: "dimensions_width",
  dimensions_height: "dimensions_height",
  availability: "stock_quantity",
  price: "regular_price",
  manufacturer: "brand",
  description: "description",
  tag: "tags",
  meta_keyword: "meta_data",
  weight: "weight",
  // barcode: "sku", // Optional, if not already mapped to 'model'
  k8_branch: "attribute",
  is_essential: "is_essential",
  is_accessory: "is_accessory",
  is_spare: "is_spare",
  recommended_minimum: "minimum_allowed_quantity",
  date_expected: "date_expected",
  product_hierarchy: "product_hierarchy",
  erp_status: "erp_status",
};

// Function to update headers in the CSV data
function updateHeaders(data) {
  const newData = {};
  for (const oldHeader in data) {
    const newHeader = headerMapping[oldHeader] || oldHeader;
    newData[newHeader] = data[oldHeader];
  }
  return newData;
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

// Function to generate folder name based on current date and time
function generateFolderPath() {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = ("0" + (now.getMonth() + 1)).slice(-2);
  const day = ("0" + now.getDate()).slice(-2);
  const hour = ("0" + now.getHours()).slice(-2);
  const minute = ("0" + now.getMinutes()).slice(-2);

  const folderPath = `./output/woo_rephrase/${year}/${month}/${day}/${hour}/${minute}`;

  // Create directory structure if it doesn't exist
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  return folderPath;
}

// Main rephrasing logic function
async function rephraseCSVHeaders(inputCsvPath, outputCsvPath) {
  const rows = [];

  // Read input CSV file
  fs.createReadStream(inputCsvPath)
    .pipe(csv.parse({ headers: true }))
    .on("error", (error) => console.error("Error parsing CSV:", error))
    .on("data", (data) => {
      // Update headers for each row
      const newData = updateHeaders(data);
      rows.push(newData);
    })
    .on("end", () => {
      // Write processed data with updated headers to output CSV file
      csv
        .writeToPath(outputCsvPath, rows, { headers: true })
        .on("error", (error) => console.error("Error writing CSV file:", error))
        .on("finish", () =>
          console.log("CSV file with updated headers written successfully.")
        );
    });
}

// Main function to perform WooRephrase
async function mainWooRephrase() {
  try {
    //console.log("Finding the latest CSV file...");
    const latestInputFile = await findLatestCSV("./output/filtered_data/");
    //console.log("Found:", latestInputFile);

    //console.log("Setting up a dynamic folder path...");
    const folderPath = generateFolderPath();
    //console.log("Done:", folderPath);

    //console.log("Setting up the output CSV file path...");
    const outputCsvPath = path.join(folderPath, "rephrased.csv");
    //console.log("Done:", outputCsvPath);

    //console.log("Rephrasing CSV headers...");
    await rephraseCSVHeaders(latestInputFile, outputCsvPath);
    //console.log("Rephrasing completed successfully.");

    console.log("WooRephrase process completed successfully.");
  } catch (error) {
    console.error("Error occurred during WooRephrase process:", error);
  }
}

// Export mainWooRephrase
export { mainWooRephrase };
