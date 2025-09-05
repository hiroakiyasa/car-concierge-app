const https = require('https');
const fs = require('fs');
const path = require('path');

// Unsplash API configuration
const UNSPLASH_ACCESS_KEY = 'hLRr8-ErFZWqo7r1iBTGNdR0vsKVBDZmeUhuF604m8A';

// Categories and their search queries
const CATEGORIES = {
  discover: {
    query: 'japan cherry blossom sakura spring landscape',
    count: 5
  },
  explore: {
    query: 'japan traditional street kyoto temple shrine',
    count: 5
  },
  ranking: {
    query: 'tokyo tower japan city skyline night',
    count: 5
  },
  parking: {
    query: 'japan modern parking car city',
    count: 3
  },
  nature: {
    query: 'mount fuji japan mountain landscape nature',
    count: 5
  },
  culture: {
    query: 'japan tea ceremony traditional culture zen',
    count: 3
  }
};

// Create assets/japan directory if it doesn't exist
const assetsDir = path.join(__dirname, '..', 'assets', 'japan');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Function to download an image
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(filepath);
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {}); // Delete the file on error
      reject(err);
    });
  });
}

// Function to fetch images from Unsplash
async function fetchUnsplashImages(query, perPage = 5) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.unsplash.com',
      path: `/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape&client_id=${UNSPLASH_ACCESS_KEY}`,
      method: 'GET',
      headers: {
        'Accept-Version': 'v1'
      }
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData.results || []);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Main function to download all images
async function downloadAllImages() {
  console.log('🎌 Starting to download beautiful Japanese landscape images...\n');
  
  const imageManifest = {};
  
  for (const [category, config] of Object.entries(CATEGORIES)) {
    console.log(`📸 Fetching ${category} images...`);
    
    try {
      const images = await fetchUnsplashImages(config.query, config.count);
      imageManifest[category] = [];
      
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const filename = `${category}_${i + 1}.jpg`;
        const filepath = path.join(assetsDir, filename);
        
        // Download regular size for better quality
        const imageUrl = image.urls.regular;
        
        console.log(`  ⬇️  Downloading ${filename}...`);
        await downloadImage(imageUrl, filepath);
        
        // Save image metadata
        imageManifest[category].push({
          filename,
          path: `../assets/japan/${filename}`,
          description: image.description || image.alt_description,
          photographer: image.user.name,
          photographerUrl: image.user.links.html,
          unsplashUrl: image.links.html,
          color: image.color,
          width: image.width,
          height: image.height
        });
        
        console.log(`  ✅ Downloaded ${filename}`);
      }
      
      console.log(`✨ Completed ${category} (${images.length} images)\n`);
      
    } catch (error) {
      console.error(`❌ Error fetching ${category} images:`, error.message);
    }
  }
  
  // Save manifest file
  const manifestPath = path.join(assetsDir, 'images-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(imageManifest, null, 2));
  console.log('📝 Image manifest saved to images-manifest.json');
  
  // Create TypeScript constants file
  const tsContent = generateTypeScriptFile(imageManifest);
  const tsPath = path.join(__dirname, '..', 'src', 'constants', 'japanImages.ts');
  
  // Create constants directory if it doesn't exist
  const constantsDir = path.join(__dirname, '..', 'src', 'constants');
  if (!fs.existsSync(constantsDir)) {
    fs.mkdirSync(constantsDir, { recursive: true });
  }
  
  fs.writeFileSync(tsPath, tsContent);
  console.log('📝 TypeScript constants file created at src/constants/japanImages.ts');
  
  console.log('\n🎉 All images downloaded successfully!');
  console.log(`📁 Images saved to: ${assetsDir}`);
}

// Generate TypeScript file content
function generateTypeScriptFile(manifest) {
  let content = `// Auto-generated file - Beautiful Japanese landscape images from Unsplash
// Generated on ${new Date().toISOString()}

export interface JapanImage {
  source: any; // require() returns any type
  description: string;
  photographer: string;
  photographerUrl: string;
}

export const JAPAN_IMAGES = {
`;

  for (const [category, images] of Object.entries(manifest)) {
    content += `  ${category}: [\n`;
    images.forEach((img, index) => {
      content += `    {
      source: require('../../assets/japan/${img.filename}'),
      description: '${(img.description || '').replace(/'/g, "\\'")}',
      photographer: '${img.photographer}',
      photographerUrl: '${img.photographerUrl}',
    },\n`;
    });
    content += `  ],\n`;
  }

  content += `};

// Helper function to get random image from category
export function getRandomImage(category: keyof typeof JAPAN_IMAGES): JapanImage {
  const images = JAPAN_IMAGES[category];
  return images[Math.floor(Math.random() * images.length)];
}

// Helper function to get all images from a category
export function getCategoryImages(category: keyof typeof JAPAN_IMAGES): JapanImage[] {
  return JAPAN_IMAGES[category];
}

// Get a random image from all categories
export function getRandomJapanImage(): JapanImage {
  const allCategories = Object.keys(JAPAN_IMAGES) as (keyof typeof JAPAN_IMAGES)[];
  const randomCategory = allCategories[Math.floor(Math.random() * allCategories.length)];
  return getRandomImage(randomCategory);
}
`;

  return content;
}

// Run the script
downloadAllImages().catch(console.error);