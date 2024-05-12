// Map categories
async function mapCategories(categoriesJson) {
  if (!categoriesJson) {
    console.error("No categories JSON provided");
    return [];
  }

  try {
    const categories = JSON.parse(categoriesJson);
    if (!Array.isArray(categories) || categories.length === 0) {
      console.warn("Categories JSON is empty or not an array");
      return [];
    }

    return categories
      .map((cat) => {
        if (cat && cat.name) {
          // Potentially add logic here to create or verify the category in a database
          return { id: cat.name, name: cat.name };
        } else {
          console.warn("Invalid category object, missing 'name' property");
          return null;
        }
      })
      .filter((cat) => cat !== null); // Filter out any null entries due to invalid data
  } catch (error) {
    console.error("Failed to parse categories JSON", error);
    return [];
  }
}

// Create category
async function createCategory(categoryName, parentCategoryId, WooCommerce) {
  console.log("Creating or finding category:", categoryName);

  if (categoryCache[categoryName]) {
    console.log("Category found in cache.");
    return categoryCache[categoryName];
  }

  try {
    const slug = categoryName.toLowerCase().replace(/\s+/g, "-");
    console.log("Searching for category with slug:", slug);
    const response = await WooCommerce.get("products/categories", { slug });
    const existingCategory = response.data;

    if (existingCategory && existingCategory.length > 0) {
      categoryCache[categoryName] = existingCategory[0].id;
      return existingCategory[0].id;
    } else {
      const newCategory = { name: categoryName, parent: parentCategoryId };
      const response = await WooCommerce.post(
        "products/categories",
        newCategory
      );
      const data = response.data;

      categoryCache[categoryName] = data.id;
      return data.id;
    }
  } catch (error) {
    console.error("Error creating or finding category:", error);
    return null;
  }
}

// Delete unused catagories
async function deleteUnusedCategories(usedCategories) {
  const allCategories = await fetch(
    `${process.env.WC_URL}/wp-json/wc/v3/products/categories`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${process.env.WC_CONSUMER_KEY}:${process.env.WC_CONSUMER_SECRET}`
        ).toString("base64")}`,
        s,
      },
    }
  ).then((res) => res.json());

  const categoriesToDelete = allCategories.filter(
    (cat) => !usedCategories.includes(cat.id)
  );

  for (const category of categoriesToDelete) {
    await fetch(
      `${process.env.WC_URL}/wp-json/wc/v3/products/categories/${category.id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${process.env.WC_CONSUMER_KEY}:${process.env.WC_CONSUMER_SECRET}`
          ).toString("base64")}`,
        },
      }
    );
  }
}
