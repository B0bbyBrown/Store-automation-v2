import { config } from "../config.mjs";

// Validate Product Data
function validateProductData(product) {
  const requiredFields = ["sku", "name", "images", "regular_price"];
  let isValid = true;
  for (const field of requiredFields) {
    if (!product[field]) {
      console.error(`Missing required field: ${field}`);
      isValid = false;
    }
  }

  return isValid;
}

// Parse CSV Value
function parseCsvValue(input, delimiter) {
  return input ? input.split(delimiter).map((item) => item.trim()) : [];
}

// Map Products
function mapProductBasics(row) {
  const validatedRow = validateProductData(row); // Ensure data is valid
  if (!validatedRow) {
    console.error("Invalid product data:", row);
    return null;
  }

  // Correct function name used here
  const images = parseCsvValue(row.images, ";").map((image) => ({
    src: image,
  }));
  const tags = parseCsvValue(row.tags, ",").map((tag) => ({
    name: tag,
  }));

  return {
    sku: validatedRow.sku,
    name: validatedRow.name,
    images,
    permalink: validatedRow.permalink,
    dimensions: {
      length: validatedRow.dimensions_length,
      width: validatedRow.dimensions_width,
      height: validatedRow.dimensions_height,
    },
    stock_quantity: parseInt(validatedRow.stock_quantity) || 0,
    regular_price: validatedRow.regular_price,
    brand: row.brand,
    description: validatedRow.description || "",
    tags,
    meta_data: formatMetaData(validatedRow.meta_data),
    weight: validatedRow.weight || "0",
    manage_stock: true,
    backorders: config.allowBackorders ? "yes" : "no",
  };
}

export { mapProductBasics };
