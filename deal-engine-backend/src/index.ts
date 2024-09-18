import NodeCache from 'node-cache';
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';
import axios from 'axios';

dotenv.config();

const app = express();
const cache = new NodeCache({ stdTTL: 3600 });
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

app.post('/weather-report', upload.single('file'), async (req: Request, res: Response) => {
    const filePath = req.file?.path;
    if (!filePath) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const report: any[] = [];
    const fetchWeatherPromises: Promise<void>[] = [];

    fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
            const cacheKeyOrigin = `${row.origin_latitude}-${row.origin_longitude}`;
            const cacheKeyDestination = `${row.destination_latitude}-${row.destination_longitude}`;

            fetchWeatherPromises.push(
                (async () => {
                    try {
                        let originWeather, destinationWeather;

                        if (cache.has(cacheKeyOrigin)) {
                            originWeather = cache.get(cacheKeyOrigin);
                        } else {
                            const originWeatherResponse = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
                                params: {
                                    appid: process.env.WEATHER_API_KEY,
                                    lat: row.origin_latitude,
                                    lon: row.origin_longitude,
                                    units: 'metric'
                                }
                            });
                            originWeather = originWeatherResponse.data.main.temp;
                            cache.set(cacheKeyOrigin, originWeather);
                        }

                        if (cache.has(cacheKeyDestination)) {
                            destinationWeather = cache.get(cacheKeyDestination);
                        } else {
                            const destinationWeatherResponse = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
                                params: {
                                    appid: process.env.WEATHER_API_KEY,
                                    lat: row.destination_latitude,
                                    lon: row.destination_longitude,
                                    units: 'metric'
                                }
                            });
                            destinationWeather = destinationWeatherResponse.data.main.temp;
                            cache.set(cacheKeyDestination, destinationWeather);
                        }

                        report.push({
                            ...row,
                            originWeather,
                            destinationWeather
                        });

                    } catch (error) {
                        console.error('Error fetching weather data:', error);
                    }
                })()
            );
        })
        .on('end', async () => {
            await Promise.all(fetchWeatherPromises);
            fs.unlinkSync(filePath);
            res.json({ report });
        })
        .on('error', (err) => {
            console.error('Error processing file:', err);
            res.status(500).json({ error: 'Error processing file' });
        });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
