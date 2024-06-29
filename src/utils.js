import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

export async function uploadImg(buffer, filename) {
  try {
    // Convert buffer to base64
    const base64Image = buffer.toString('base64');

    // Create form data
    const formData = new URLSearchParams();
    formData.append('key', process.env.IMGBB_API_KEY);
    formData.append('image', base64Image);
    formData.append('name', filename);

    const response = await axios.post('https://api.imgbb.com/1/upload', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    console.log(response.data.data.url);
    return response.data.data.url;
  } catch (error) {
    console.error('Error uploading to ImgBB:', error);
    throw error;
  }
}