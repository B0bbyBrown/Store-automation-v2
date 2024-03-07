import path from "path";
import { promises as fsPromises } from "fs";

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
async function findLatestCSV(convertedDirectoryPath) {
  let latestFile = null;
  let latestTime = 0;

  async function traverseDirectories(output) {
    const files = await fsPromises.readdir(output);

    for (const file of files) {
      const filePath = path.join(output, file);
      const fileStat = await fsPromises.stat(filePath);

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

// Function to filter data based on manufacturer
async function filterData(csvData) {
  try {
    let manufacturerColumnIndex = -1;

    for (let i = 0; i < csvData[0].length; i++) {
      if (csvData[0][i] === "manufacturer") {
        manufacturerColumnIndex = i;
        break;
      }
    }

    if (manufacturerColumnIndex === -1) {
      throw new Error("Header 'manufacturer' not found in the CSV file.");
    }

    const filteredRows = csvData.filter((row, index) => {
      if (index === 0) return true;

      const manufacturerValue = row[manufacturerColumnIndex];
      return manufacturerValue && manufacturerValue.trim() === "TORK CRAFT";
    });

    return filteredRows;
  } catch (error) {
    throw error;
  }
}

// Function to save filtered data to CSV
async function saveToCSV(filteredData, outputRootDirectory) {
  try {
    if (filteredData.length === 0) {
      throw new Error("No filtered data to save.");
    }

    const folderPath = generateFolderPath();
    const filteredFolderPath = path.join(outputRootDirectory, folderPath);

    await fsPromises.mkdir(filteredFolderPath, { recursive: true });

    const fileName = "filtered_data.csv";
    const outputPath = path.join(filteredFolderPath, fileName);

    const csvContent = filteredData.map((row) => row.join(",")).join("\n");
    await fsPromises.writeFile(outputPath, csvContent);

    return outputPath;
  } catch (error) {
    throw error;
  }
}

// Main Method
async function mainScraper() {
  try {
    const convertedDirectoryPath = "./output/converted";
    const outputRootDirectory = "./output/filtered_data";

    console.log("Finding the latest CSV file...");
    const latestCSVFile = await findLatestCSV(convertedDirectoryPath);
    console.log("done");

    console.log("Reading the latest CSV file...");
    const csvData = await fsPromises
      .readFile(latestCSVFile, "utf-8")
      .then((data) => data.split("\n").map((row) => row.split(",")));
    console.log("done");

    console.log("Filtering data...");
    const filteredData = await filterData(csvData);
    console.log("done");

    console.log("Saving filtered data...");
    const outputPath = await saveToCSV(filteredData, outputRootDirectory);
    console.log("done");

    console.log("Filtered data saved to:", outputPath);
  } catch (error) {
    console.error("Error:", error);
  }
}

// Export mainScraper
export { mainScraper };
