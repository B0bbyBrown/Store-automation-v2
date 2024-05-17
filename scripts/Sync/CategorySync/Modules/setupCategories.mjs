import { mapCategories } from "./mapCategories.mjs";
import { createCategory } from "./createCategory.mjs";
import { getWooCommerceCategories } from "../../ProductSync/Modules/getWooCommerceCategories.mjs";

async function getOrCreateCategory(categoryName, parentId, createdCategories) {
  if (createdCategories[categoryName]) {
    return createdCategories[categoryName];
  }

  const categoryData = {
    name: categoryName,
    slug: categoryName.toLowerCase().replace(/\s+/g, "-"),
    parent: parentId,
  };
  const category = await createCategory(categoryData);
  createdCategories[categoryName] = category.id;
  return category.id;
}

const setupCategories = async (csvProducts) => {
  const existingCategories = await getWooCommerceCategories();
  console.log(
    `Fetched ${existingCategories.length} existing categories from WooCommerce.`
  );

  const createdCategories = existingCategories.reduce((acc, category) => {
    acc[category.name] = category.id;
    return acc;
  }, {});

  for (const product of csvProducts) {
    const categoryHierarchy = product.categories;
    let parentId = 0;

    for (const category of categoryHierarchy) {
      parentId = await getOrCreateCategory(
        category.name,
        parentId,
        createdCategories
      );
    }

    product.categories = categoryHierarchy.map((category) => ({
      id: createdCategories[category.name],
      name: category.name,
      slug: category.slug,
    }));
  }

  return csvProducts;
};

export { setupCategories };
