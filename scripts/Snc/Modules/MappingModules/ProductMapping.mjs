import config from "../MappingModules/config.json" assert { type: "json" };
const brand = config.defaultBrand;
const allowBackorders = config.allowBackorders;

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
function mapProductBasics(row, categoryMap) {
  if (!validateProductData(row)) {
    console.error("Invalid product data:", row);
    return null;
  }

  const images = parseCsvValue(row.images, ";").map((image) => ({
    src: image,
  }));
  const tags = parseCsvValue(row.tags, ",").map((tag) => ({ name: tag }));

  // Handle categories
  const categories = row.categories
    ? JSON.parse(row.categories)
        .map((cat) => {
          const categoryId = categoryMap[cat.name];
          if (categoryId) {
            return { id: categoryId };
          } else {
            console.error(`No match found for category: ${cat.name}`);
            return null;
          }
        })
        .filter(Boolean)
    : [];

  return {
    sku: row.sku,
    name: row.name,
    images,
    permalink: row.permalink,
    dimensions: {
      length: row.dimensions_length,
      width: row.dimensions_width,
      height: row.dimensions_height,
    },
    stock_quantity: parseInt(row.stock_quantity) || 0,
    regular_price: row.regular_price,
    brand: row.brand || config.defaultBrand,
    description: row.description || "",
    tags, // Ensure tags are included
    meta_data: row.meta_data,
    weight: row.weight || "0",
    manage_stock: true,
    backorders: config.allowBackorders ? "yes" : "no",
    categories, // Ensure categories are included
  };
}

export { mapProductBasics };
