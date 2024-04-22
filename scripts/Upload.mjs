import fs from "fs";
import csvParser from "csv-parser";
import axios from "axios";
import dotenv from "dotenv";
import { Transform } from "stream";
import path from "path";
import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";
import productFieldMapping from "./Mapping.mjs";

console.log("Connecting to woo api");

dotenv.config({ path: "./scripts/.env" });
if (
  !process.env.WC_URL ||
  !process.env.WC_CONSUMER_KEY ||
  !process.env.WC_CONSUMER_SECRET
) {
  console.error("Missing environment variables. Check your .env file.");
  process.exit(1);
}

const WooCommerce = new WooCommerceRestApi.default({
  url: process.env.WC_URL,
  consumerKey: process.env.WC_CONSUMER_KEY,
  consumerSecret: process.env.WC_CONSUMER_SECRET,
  version: "wc/v3",
});

console.log("Connected to woo api");

console.log("Setting up error handling");

function handleError(error, message, options = {}) {
  console.error(message, error);
  // Potential Logic:
  // - Attempt a retry for specific error types
  if (options.canRetry && options.retryCount < 3) {
    // Adjust retry limit as needed
    setTimeout(() => {
      options.callback(); // Assuming options contains the function to retry
    }, 5000); // Adjust retry delay as needed
  } else if (options.sendEmail) {
    // Implement logic for sending an email notification
  }
}

console.log("Error handling setup complete");

console.log("Looking for CSV");
// Function to recursively search for CSV files
const findLatestCSV = (dirPath) => {
  let latestCSV = null;
  let latestModificationTime = 0;

  const files = fs.readdirSync(dirPath);
  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      const subdirectoryLatestCSV = findLatestCSV(filePath);
      if (
        subdirectoryLatestCSV &&
        subdirectoryLatestCSV.modificationTime > latestModificationTime
      ) {
        latestCSV = subdirectoryLatestCSV;
        latestModificationTime = subdirectoryLatestCSV.modificationTime;
      }
    } else if (
      stats.isFile() &&
      file.toLowerCase().endsWith(".csv") &&
      stats.mtimeMs > latestModificationTime
    ) {
      latestCSV = {
        filePath: filePath,
        modificationTime: stats.mtimeMs,
      };
      latestModificationTime = stats.mtimeMs;
    }
  });

  return latestCSV;
};

console.log("CSV found");

console.log("Starting phrasing process");

// CSV Parsing (Enhance with validation)
const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const products = [];
    const csvTransformer = new Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        const row = chunk.toString().split(",");

        // Extract necessary fields from the row array
        const [
          sku,
          name,
          description,
          regular_price,
          sale_price,
          date_on_sale_from,
          date_on_sale_to,
          dimensions_length,
          dimensions_width,
          dimensions_height,
          stock_quantity,
          weight,
          categories,
          tags,
          images,
          attributes,
          meta_data,
        ] = row;

        if (!sku) {
          console.warn("SKU is missing for a product. Skipping...");
          callback();
          return;
        }

        // Prepare product data with dimensions as a nested object
        const productData = {
          sku,
          name,
          description,
          regular_price,
          sale_price,
          date_on_sale_from,
          date_on_sale_to,
          dimensions: {
            length: parseFloat(dimensions_length), // Parse to float
            width: parseFloat(dimensions_width),
            height: parseFloat(dimensions_height),
          },
          stock_quantity,
          weight,
          categories: [{ id: categoryId }],
          tags: meta_data
            ? meta_data.split(",").map((tag) => ({ name: tag.trim() }))
            : [],
          images: images ? images.split(",") : [],
          attributes: attributes ? attributes.split(",") : [],
          meta_data: meta_data
            ? meta_data
                .split(",")
                .map((value) => value.trim())
                .filter((value) => value !== "") // Filter out empty values
            : [],
        };

        products.push(productData);
        callback();
      },
    });

    csvTransformer.on("finish", () => {
      resolve(products);
    });

    csvTransformer.on("error", (error) => {
      reject(error);
    });

    fs.createReadStream(filePath)
      .pipe(csvTransformer)
      .on("error", (error) => {
        reject(error);
      });
    csvTransformer.on("finish", () => resolve(products));
    csvTransformer.on("error", (error) => reject(error));
    fs.createReadStream(filePath).pipe(csvTransformer);
  });
};

console.log("CSV parsed");

console.log("Getting products from store");

// Get all WooCommerce products
const getWooCommerceProducts = async () => {
  try {
    const response = await axios.get(
      `${process.env.WC_URL}/wp-json/wc/v3/products`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            process.env.WC_CONSUMER_KEY + ":" + process.env.WC_CONSUMER_SECRET
          ).toString("base64")}`,
        },
      }
    );

    if (response.status === 200) {
      return response.data;
    } else {
      throw new Error(
        `Error retrieving products: ${response.status} ${response.statusText}`
      );
    }
  } catch (error) {
    handleError(error, "Error retrieving products from WooCommerce:", {
      name: "getWooCommerceProducts",
      canRetry: true,
      retryCount: 0,
      callback: getWooCommerceProducts,
    });
  }
};

console.log("Products retrieved");

console.log("comparing products to csv");

// Product Comparison (Add category/attribute mapping)
const compareProducts = async (csvProducts, storeProducts) => {
  const newProducts = [];
  const updatedProducts = [];
  const existingSKUs = new Set();

  // Create a set of existing SKUs in the store
  storeProducts.forEach((product) => existingSKUs.add(product.sku));
  // Brand-as-Category Logic
  const productBrand = csvProduct.csv_brand;

  const existingCategory = await WooCommerce.get("products/categories", {
    slug: productBrand,
  });

  let categoryId;
  if (existingCategory.length === 0) {
    // Create the category
    for (const csvProduct of csvProducts) {
      const productBrand = csvProduct.csv_brand;
      let categoryId = await findOrCreateCategory(productBrand);
      csvProduct.categories = [{ id: categoryId }];
    }

    // Iterate through CSV products
    csvProducts.forEach((csvProduct) => {
      const { sku, ...csvFields } = csvProduct;

      if (existingSKUs.has(sku)) {
        // If SKU exists in the store, compare product details
        const storeProduct = storeProducts.find(
          (product) => product.sku === sku
        );
        const storeFields = {
          name: storeProduct.name,
          regular_price: storeProduct.regular_price,
          description: storeProduct.description,
          images: storeProduct.images,
          categories: storeProduct.categories,
          permalink: storeProduct.permalink,
          dimensions_length: storeProduct.dimensions_length,
          dimensions_width: storeProduct.dimensions_width,
          dimensions_height: storeProduct.dimensions_height,
          stock_quantity: storeProduct.stock_quantity,
          brand: storeProduct.brand,
          tags: storeProduct.tags,
          meta_data: storeProduct.meta_data,
          weight: storeProduct.weight,
          barcode: storeProduct.barcode,
          attribute: storeProduct.attribute,
          is_essential: storeProduct.is_essential,
          is_accessory: storeProduct.is_accessory,
          is_spare: storeProduct.is_spare,
          minimum_allowed_quantity: storeProduct.minimum_allowed_quantity,
          date_expected: storeProduct.date_expected,
          product_hierarchy: storeProduct.product_hierarchy,
          erp_status: storeProduct.erp_status,
          // Add more fields as needed
        };

        let hasDifference = false;

        // Check if any field differs
        for (const field in csvFields) {
          const wooCommerceField = productFieldMapping[field] || field; // Use mapped name if exists
          if (csvFields[field] !== storeFields[wooCommerceField]) {
            hasDifference = true;
            break;
          }
        }

        if (hasDifference) {
          // Update product if any differences are found
          updatedProducts.push({
            sku: sku,
            ...csvFields,
          });
          console.log(`Product with SKU ${sku} marked for update.`);
        }

        // Category Mapping
        const mappedCategory = categoryMapping[csvProduct.csv_brand];
        if (mappedCategory) {
          csvFields.categories = [{ name: mappedCategory }]; // Or modify as needed
        }

        // Attribute Mapping
        if (csvProduct.attributes) {
          const mappedAttributes = csvProduct.attributes.map((rawAttribute) => {
            const mappedName = attributeMapping[rawAttribute];
            return mappedName ? { name: mappedName } : { name: rawAttribute };
          });
          csvFields.attributes = mappedAttributes;
        }
      } else {
        // If SKU doesn't exist in the store, add as a new product
        newProducts.push(csvProduct);
      }
    });

    return { newProducts, updatedProducts };
  }

  console.log("Products compared");

  console.log("Uploading products");

  // Batch Upload
  const uploadProducts = async (newProducts) => {
    try {
      const batchSize = 100; // Maximum allowed by WooCommerce API
      const batches = [];

      while (newProducts.length > 0) {
        batches.push(newProducts.splice(0, batchSize));
      }

      for (const batch of batches) {
        await WooCommerce.post("products/batch", { create: batch });
      }

      console.log("Uploaded products in batches.");
    } catch (error) {
      handleError(error, "Error uploading products:", {
        canRetry: true,
        retryCount: 0,
        callback: uploadProducts,
      });
    }
  };

  console.log("Products uploaded");

  console.log("Updating products");
  /// Batch Update
  const updateProducts = async (updatedProducts) => {
    try {
      const batchSize = 100; // Maximum allowed by WooCommerce API
      const batches = [];

      while (updatedProducts.length > 0) {
        batches.push(updatedProducts.splice(0, batchSize));
      }

      for (const batch of batches) {
        await WooCommerce.post("products/batch", { update: batch });
      }

      console.log("Updated products in batches.");
    } catch (error) {
      handleError(error, "Error updating products:", {
        canRetry: true,
        retryCount: 0,
        callback: updateProducts,
      });
    }
  };

  console.log("Products updated");

  console.log("Deleting products");

  // Function to delete products not in CSV
  const deleteProducts = async (deletedSKUs) => {
    try {
      for (const sku of deletedSKUs) {
        // Find product ID by SKU
        const productToDelete = storeProducts.find(
          (product) => product.sku === sku
        );
        if (productToDelete) {
          // Delete product from the store using DELETE with force parameter
          await WooCommerce.delete(`products/${productToDelete.id}`, {
            force: true,
          });
          console.log(`Deleted product with SKU ${sku} from the store.`);
        } else {
          console.log(
            `Product with SKU ${sku} not found in the store. Skipping deletion.`
          );
        }
      }
    } catch (error) {
      handleError(error, "Error deleting products:");
    }
  };

  console.log("Products deleted");

  console.log("All Done!");

  // Main function
  const mainUpload = async () => {
    try {
      const rootDirPath = "./output/woo_rephrase/";
      const latestCSV = findLatestCSV(rootDirPath);

      if (!latestCSV) {
        console.error("No CSV files found.");
        return;
      }

      const csvProducts = await parseCSV(latestCSV.filePath);
      const storeProducts = await getWooCommerceProducts();

      const { newProducts, updatedProducts, deletedSKUs } =
        await compareProducts(csvProducts, storeProducts);

      await uploadProducts(newProducts);
      await updateProducts(updatedProducts);
      await deleteProducts(deletedSKUs);

      const emptyMetaDataSKUs = csvProducts
        .filter((product) => !product.meta_data || !product.meta_data.trim())
        .map((product) => product.sku);

      if (emptyMetaDataSKUs.length > 0) {
        console.warn(
          "The following SKUs have empty meta data columns:",
          emptyMetaDataSKUs
        );
      }
      console.log("Product synchronization completed successfully.");
    } catch (error) {
      console.error("An error occurred during processing:", error);
      const processedProducts = newProducts.length + updatedProducts.length;
      console.log(
        `Partially completed: Processed ${processedProducts} products.`
      );
    }
  };
  mainUpload();
};
