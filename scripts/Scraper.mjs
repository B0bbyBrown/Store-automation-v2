import path from "path";
import { createWriteStream, promises as fsPromises } from "fs";

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

async function findLatestCSV(directoryPath) {
  try {
    const files = await fsPromises.readdir(directoryPath);
    const csvFiles = files.filter((file) => file.endsWith(".csv"));

    if (csvFiles.length === 0) {
      throw new Error("No CSV files found in the directory.");
    }

    let latestFile = null;
    let latestFileMtimeMs = 0;

    for (const file of csvFiles) {
      const filePath = path.join(directoryPath, file);
      const fileStat = await fsPromises.stat(filePath);
      if (fileStat.isDirectory()) {
        const subdirectoryLatestFile = await findLatestCSV(filePath);
        if (
          subdirectoryLatestFile &&
          subdirectoryLatestFile.mtimeMs > latestFileMtimeMs
        ) {
          latestFile = subdirectoryLatestFile.path;
          latestFileMtimeMs = subdirectoryLatestFile.mtimeMs;
        }
      } else {
        if (!latestFile || fileStat.mtimeMs > latestFileMtimeMs) {
          latestFile = filePath;
          latestFileMtimeMs = fileStat.mtimeMs;
        }
      }
    }

    return latestFile ? { path: latestFile, mtimeMs: latestFileMtimeMs } : null;
  } catch (error) {
    console.error("Error finding latest CSV file:", error);
    throw error;
  }
}

// Filter data based on a specific condition
async function filterData(csvData) {
  try {
    let manufacturerColumnIndex = -1;

    // Find the index of the column containing the header "manufacturer"
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
      if (index === 0) return true; // Include the header row

      return row[manufacturerColumnIndex].includes("TORK CRAFT");
    });

    if (filteredRows.length === 0) {
      console.log(
        `No rows found with "TORK CRAFT" in the manufacturer column.`
      );
      return [];
    }

    return filteredRows;
  } catch (error) {
    console.error("Error filtering data:", error);
    throw error;
  }
}

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

    const csvWriter = createWriteStream(outputPath);
    filteredData.forEach((row) => {
      csvWriter.write(`${row.join(",")}\n`);
    });
    csvWriter.end();

    return outputPath;
  } catch (error) {
    console.error("Error saving filtered data:", error);
    throw error;
  }
}

export async function mainScraper() {
  try {
    const convertedDirectoryPath = "./output/converted";
    const outputRootDirectory = "./output/filtered_data";

    console.log("Finding the latest CSV file...");
    const latestCSVFile = await findLatestCSV(convertedDirectoryPath);
    console.log("Reading the latest CSV file...");

    const csvData = await fsPromises
      .readFile(latestCSVFile.path, "utf-8")
      .then((data) => {
        return data.split("\n").map((row) => row.split(","));
      });

    console.log("Filtering data...");
    const filteredData = await filterData(csvData);

    console.log("Saving filtered data...");
    const outputPath = await saveToCSV(filteredData, outputRootDirectory);

    console.log("Filtered data saved to:", outputPath);
  } catch (error) {
    console.error("Error:", error);
  }
}

mainScraper();
