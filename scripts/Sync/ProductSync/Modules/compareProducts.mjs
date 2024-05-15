const productFieldMapping = {
  sku: "sku",
  name: "name",
  images: "images",
  permalink: "permalink",
  dimensions_length: "dimensions.length",
  dimensions_width: "dimensions.width",
  dimensions_height: "dimensions.height",
  stock_quantity: "stock_quantity",
  regular_price: "regular_price",
  brand: "brand",
  description: "description",
  tags: "tags",
  meta_data: "meta_data",
  weight: "weight",
  attribute: "attribute",
};

const compareProducts = (csvProducts, storeProducts) => {
  const newProducts = [];
  const updatedProducts = [];
  const existingSKUs = new Set(storeProducts.map((product) => product.sku));

  for (const csvProduct of csvProducts) {
    const { sku, ...csvFields } = csvProduct;

    if (existingSKUs.has(sku)) {
      const storeProduct = storeProducts.find((product) => product.sku === sku);
      let hasDifference = false;

      for (const field in csvFields) {
        const wooCommerceField = productFieldMapping[field] || field;
        if (csvProduct[field] !== storeProduct[wooCommerceField]) {
          hasDifference = true;
          break;
        }
      }

      if (hasDifference) {
        const updateData = {};
        for (const field in csvFields) {
          const wooCommerceField = productFieldMapping[field] || field;
          if (csvProduct[field] !== storeProduct[wooCommerceField]) {
            updateData[wooCommerceField] = csvProduct[field];
          }
        }
        updatedProducts.push({ id: storeProduct.id, ...updateData });
      }
    } else {
      newProducts.push(csvProduct);
    }
  }

  return { newProducts, updatedProducts, productsToDelete: [] };
};

export { compareProducts };
