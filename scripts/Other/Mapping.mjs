// import fetch from "node-fetch";
// import dotenv from "dotenv";

// dotenv.config({ path: "./scripts/.env" });

// const categoryCache = {};

// //Find or Create Category
// const createOrRetrieveCategory = async (
//   categoryName,
//   parentCategoryId = null
// ) => {
//   console.log("Creating or finding category:", categoryName);

//   if (categoryCache[categoryName]) {
//     console.log("Category found in cache.");
//     return categoryEntityCache[categoryName];
//   }

//   const slug = categoryName.toLowerCase().replace(/\s+/g, "-");
//   const categoryUrl = `${apiUrl}/products/categories?slug=${slug}`;

//   try {
//     console.log(`Fetching category from URL: ${categoryUrl}`);
//     const response = await fetch(categoryUrl, { method: "GET", headers });

//     const data = await response.json();
//     if (data && data.length > 0) {
//       categoryCache[categoryName] = data[0].id;
//       return data[0].id;
//     } else {
//       console.log("No existing category found, creating new one.");
//       const newCategoryData = {
//         name: categoryName,
//         parent: parentCategoryId,
//         slug,
//       };
//       const createResponse = await fetch(`${apiUrl}/products/categories`, {
//         method: "POST",
//         headers,
//         body: JSON.stringify(newCategoryData),
//       });

//       const createdCategory = await createResponse.json();
//       if (createResponse.ok) {
//         categoryCache[categoryName] = createdCategory.id;
//         return createdCategory.id;
//       } else {
//         throw new Error(
//           `Failed to create category: ${createdCategory.message}`
//         );
//       }
//     }
//   } catch (error) {
//     console.error("Error creating or finding category:", error);
//     return null; // Depending on how critical this operation is, you might want to throw the error instead
//   }
// };

// export {
//   createOrRetrieveCategory,
//   // createCategory,
//   deleteUnusedCategories,
//   formatMetaData,
//   productFieldMapping,
//   mapCategories,
//   mapProductBasics,
// };
