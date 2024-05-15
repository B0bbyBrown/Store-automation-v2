function transformCategoryNameToSlug(categoryName) {
  return categoryName
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[\s\W-]+/g, "-");
}

function isValidCategory(category) {
  return category && category.name && category.name.trim() !== "";
}

async function mapCategories(categoriesJson) {
  console.log("Received categories:", categoriesJson);
  console.log("Type of categoriesJson:", typeof categoriesJson);

  if (!categoriesJson) {
    console.error("No categories JSON provided");
    return [];
  }

  let categories;
  try {
    categories =
      typeof categoriesJson === "string"
        ? JSON.parse(categoriesJson)
        : categoriesJson;

    if (!Array.isArray(categories) || categories.length === 0) {
      console.warn("Categories JSON is empty or not an array");
      return [];
    }
  } catch (error) {
    console.error("Failed to parse categories JSON", error);
    return [];
  }

  return categories.filter(isValidCategory).map((cat) => ({
    name: cat.name,
    slug: transformCategoryNameToSlug(cat.name),
  }));
}

export { mapCategories };
