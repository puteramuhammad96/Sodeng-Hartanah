const fs = require("fs");
const path = require("path");

const listingsPath = path.join(__dirname, "assets", "listings");

function generateImagesJson() {
  if (!fs.existsSync(listingsPath)) {
    console.error("❌ Listings folder not found:", listingsPath);
    return;
  }

  const properties = fs.readdirSync(listingsPath);

  properties.forEach((property) => {
    const propertyPath = path.join(listingsPath, property);

    if (fs.statSync(propertyPath).isDirectory()) {
      const files = fs.readdirSync(propertyPath);

      // Filter semua gambar kecuali thumb
      const images = files
        .filter(
          (file) =>
            /\.(jpg|jpeg|png|webp)$/i.test(file) &&
            file.toLowerCase() !== "thumb.jpg"
        )
        .sort((a, b) => {
          const numA = parseInt(path.basename(a, path.extname(a)), 10);
          const numB = parseInt(path.basename(b, path.extname(b)), 10);
          return (isNaN(numA) ? 9999 : numA) - (isNaN(numB) ? 9999 : numB);
        });

      const jsonPath = path.join(propertyPath, "images.json");
      fs.writeFileSync(jsonPath, JSON.stringify(images, null, 2));
      console.log(`✅ images.json generated for: ${property}`);
    }
  });
}

generateImagesJson();
