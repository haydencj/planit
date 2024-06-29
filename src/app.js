import express from 'express';
import multer from 'multer';
import morgan from 'morgan';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { uploadImg } from './utils.js';

dotenv.config();

const app = express();
const port = 3000;

const openai = new OpenAI();

// Configure Multer to use memory storage
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.static('public'));
app.use(morgan('dev'));

app.get('/', (req, res) => {
  res.sendFile('index.html');
});

app.post('/extract-measurements', upload.single('floorplan'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  // Convert image to base64 encoded data
  const base64Image = req.file.buffer.toString('base64')
  // Upload the image to ImgBB
  const imageUrl = await uploadImg(req.file.buffer, req.file.originalname);

  const prompt = `
  You are an AI designed to extract measurements from floor plan images reliably and consistently. 
  Your task is to analyze the provided floor plan image and output the measurements of each area and wall in JSON format.

  Please follow these steps:
  1. Use OCR (Optical Character Recognition) to read all text from the image.
  2. Identify and extract the measurements for each labeled area or room.
  3. Format and output only the extracted and estimated measurements into JSON, 
  with each area or room as a key and its corresponding measurements as the value.

  Output the result in the following JSON format:

  {
    "Room 1": "Measurement 1",
    "Room 2": "Measurement 2",
    ...
  }

  Make sure the measurements include all the areas and rooms labeled in the image

  Example Output:
  {
    "Great Room": "19'-9\" x 12'-4\"",
    "Den": "8'-0\" x 4'-6\"",
    "Bath": "6'-10\" x 8'-8\"",
    "Bedroom": "12'-3\" x 10'-0\"",
    "Entry": "8'-4\" x 5'-0\"",
    "Walk-In Closet": "6'-0\" x 4'-0\"",
    "Shower": "3'-6\" x 3'-0\"",
    "W/D": "3'-0\" x 3'-0\""
  }

  Output only the JSON result.
  `;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageUrl} },
          ],
        },
      ],
    });

    console.log(completion.choices[0]);

    // Extract the JSON part from the completion response
    const jsonOutput = completion.choices[0].message.content.match(/{[\s\S]*}/)[0];
    const jsonObject = JSON.parse(jsonOutput);

    // Convert JSON to HTML table
    let htmlOutput = '<table border="1"><tr><th>Room</th><th>Measurement</th></tr>';
    for (const [room, measurement] of Object.entries(jsonObject)) {
      htmlOutput += `<tr><td>${room}</td><td>${measurement}</td></tr>`;
    }
    htmlOutput += '</table>';

    // Send HTML response
    res.send(htmlOutput);

  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('An error occurred while processing your request.');
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
