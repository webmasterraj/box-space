import express from 'express';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Function to extract meaningful title from URL
const getTitleFromUrl = (url) => {
  try {
    const urlObj = new URL(url);
    
    // Special handling for known sites
    if (urlObj.hostname.includes('zillow.com')) {
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      if (pathParts[0] === 'homedetails') {
        const address = pathParts[1].replace(/-/g, ' ');
        return `Zillow: ${address}`;
      }
    }
    
    // Default to hostname
    return urlObj.hostname.replace(/^www\./, '');
  } catch (error) {
    return url;
  }
};

app.post('/api/fetch-metadata', async (req, res) => {
  const { url } = req.body;
  console.log('Fetching metadata for:', url);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const metadata = {
      url,
      title: $('meta[property="og:title"]').attr('content') || 
             $('title').text().trim() || 
             getTitleFromUrl(url),
      description: $('meta[property="og:description"]').attr('content') || 
                  $('meta[name="description"]').attr('content') || '',
      image: $('meta[property="og:image"]').attr('content') || 
             $('meta[name="twitter:image"]').attr('content') || '',
      favicon: $('link[rel="icon"]').attr('href') || 
               $('link[rel="shortcut icon"]').attr('href') || '',
      siteName: $('meta[property="og:site_name"]').attr('content') || 
                new URL(url).hostname.replace(/^www\./, '')
    };

    // Handle relative URLs for favicon and image
    const baseUrl = new URL(url);
    if (metadata.favicon && !metadata.favicon.startsWith('http')) {
      metadata.favicon = new URL(metadata.favicon, baseUrl.origin).toString();
    }
    if (metadata.image && !metadata.image.startsWith('http')) {
      metadata.image = new URL(metadata.image, baseUrl.origin).toString();
    }

    console.log('Metadata fetched:', metadata);
    res.json(metadata);
  } catch (error) {
    console.error('Error fetching metadata:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
