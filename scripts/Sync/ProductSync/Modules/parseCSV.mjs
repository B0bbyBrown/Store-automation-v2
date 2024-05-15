import csv from "csv-parser";
import fs from "fs";

const parseCSV = (csvFilePath) => {
  const products = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on("data", (row) => {
        products.push(row);
      })
      .on("end", () => {
        resolve(products);
      })
      .on("error", (error) => {
        reject(error);
      });
  });
};

export { parseCSV };
