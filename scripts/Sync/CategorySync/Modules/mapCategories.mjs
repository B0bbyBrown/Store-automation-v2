function transformCategoryNameToSlug(categoryName) {
  return categoryName
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[\s\W-]+/g, "-");
}

function isValidCategory(category) {
  return category && typeof category === "string" && category.trim() !== "";
}

async function mapCategories(categoriesArray) {
  console.log("Received categories:", categoriesArray);
  console.log("Type of categoriesArray:", typeof categoriesArray);

  if (!categoriesArray) {
    console.error("No categories array provided");
    return [];
  }

  if (!Array.isArray(categoriesArray) || categoriesArray.length === 0) {
    console.warn("Categories array is empty or not an array");
    return [];
  }

  const validCategories = categoriesArray
    .filter(isValidCategory)
    .map((name) => ({
      name,
      slug: transformCategoryNameToSlug(name),
    }));

  console.log("Mapped categories:", validCategories);

  return validCategories;
}

export { mapCategories };
