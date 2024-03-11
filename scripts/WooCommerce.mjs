import fs from "fs";
import path from "path";

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
  return `Woocommerce/${year}/${month}/${day}/${hour}/${minute}`;
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

// Function to read CSV file and parse data
async function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, "utf8", (err, data) => {
      if (err) reject(err);
      else {
        const products = data.split("\n").map((row) => row.split(","));
        const headers = products.shift();
        resolve({ headers, products });
      }
    });
  });
}

// Function to transform CSV data to WooCommerce product format
function transformData(headers, products) {
  const transformedProducts = products.map((product) => {
    const transformedProduct = {};
    headers.forEach((header, index) => {
      switch (header) {
        case "model":
          transformedProduct.sku = product[index];
          break;
        case "name":
          transformedProduct.name = product[index];
          break;
        case "price":
          transformedProduct.regular_price = product[index];
          break;
        case "description":
          transformedProduct.description = product[index];
          break;
        case "category":
          transformedProduct.categories = [{ name: product[index] }];
          break;
        case "product_image_url":
          transformedProduct.images = [{ src: product[index] }];
          break;
        case "manufacturer":
          if (product[index]) {
            transformedProduct.meta_data = [
              { key: "manufacturer", value: product[index] },
            ];
          }
          break;
        case "dimensions_length":
          transformedProduct.dimensions_length = product[index];
          break;
        case "dimensions_width":
          transformedProduct.dimensions_width = product[index];
          break;
        case "dimensions_height":
          transformedProduct.dimensions_height = product[index];
          break;
        case "weight":
          transformedProduct.weight = product[index];
          break;
        case "barcode":
          transformedProduct.barcode = product[index];
          break;
        case "product_url":
          transformedProduct.external_url = product[index];
          break;
      }
    });
    return transformedProduct;
  });
  return transformedProducts;
}

// Function to save a file locally
async function saveFileLocally(filePath, data) {
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, data, "utf8", (err) => {
      if (err) reject(err);
      else resolve(filePath);
    });
  });
}

// Main Method
async function mainWoocommerce() {
  try {
    const folderPath = generateFolderPath();
    const outputPath = path.join(
      __dirname,
      "Woocommerce",
      "filtered_data",
      folderPath
    );
    ensureDirectoryExistence(outputPath);

    const latestCSVFile = await findLatestCSV(
      path.join(__dirname, "output", "filtered_data")
    );

    if (latestCSVFile) {
      const { headers, products } = await readCSV(latestCSVFile);

      const csvData = products.map((row) => row.join(",")).join("\n");
      const savedFilePath = await saveFileLocally(
        path.join(outputPath, "Woocommerce.csv"),
        csvData
      );

      console.log(`CSV file saved locally at ${savedFilePath}`);

      const transformedProducts = transformData(headers, products);

      await uploadProducts(transformedProducts);
    } else {
      console.log("No CSV file found.");
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

export { mainWoocommerce };
