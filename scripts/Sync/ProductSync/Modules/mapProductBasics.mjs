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

function parseCsvValue(input, delimiter) {
  return input ? input.split(delimiter).map((item) => item.trim()) : [];
}

function mapProductBasics(row) {
  if (!validateProductData(row)) {
    console.error("Invalid product data:", row);
    return null;
  }

  const images = parseCsvValue(row.images, ";").map((image) => ({
    src: image,
  }));
  const tags = parseCsvValue(row.tags, ",").map((tag) => ({ name: tag }));

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
    brand: row.brand,
    description: row.description || "",
    tags,
    meta_data: row.meta_data,
    manage_stock: true,
    backorders: false,
    categories: row.categories, // Assuming it's already an array of objects
  };
}

export { mapProductBasics };
