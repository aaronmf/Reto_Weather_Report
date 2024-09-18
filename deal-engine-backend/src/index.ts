import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';
import axios from 'axios';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Configurar multer para la subida de archivos
const upload = multer({ dest: 'uploads/' });

// Ruta de prueba
app.get('/', (req: Request, res: Response) => {
    res.send('Deal Engine Weather API');
});

// Ruta para procesar el archivo CSV y generar el informe
app.post('/weather-report', upload.single('file'), async (req: Request, res: Response) => {
    const filePath = req.file?.path;

    console.log('Received a request at /weather-report');
    console.log('Uploaded file path:', filePath);

    if (!filePath) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const report: any[] = [];
    const fetchWeatherPromises: Promise<void>[] = [];

    fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
            const { origin_iata_code, destination_iata_code, origin_name, destination_name } = row;

            fetchWeatherPromises.push(
                (async () => {
                    try {
                        const [originWeatherResponse, destinationWeatherResponse] = await Promise.all([
                            axios.get('https://api.openweathermap.org/data/2.5/weather', {
                                params: {
                                    appid: process.env.WEATHER_API_KEY,
                                    lat: row.origin_latitude,
                                    lon: row.origin_longitude,
                                    units: 'metric'
                                }
                            }),
                            axios.get('https://api.openweathermap.org/data/2.5/weather', {
                                params: {
                                    appid: process.env.WEATHER_API_KEY,
                                    lat: row.destination_latitude,
                                    lon: row.destination_longitude,
                                    units: 'metric'
                                }
                            })
                        ]);

                        report.push({
                            ...row,
                            originWeather: originWeatherResponse.data.main.temp,
                            destinationWeather: destinationWeatherResponse.data.main.temp
                        });

                    } catch (error) {
                        console.error('Error fetching weather data:', error);
                    }
                })()
            );
        })
        .on('end', async () => {
            await Promise.all(fetchWeatherPromises); // Asegúrate de que todas las promesas se resuelvan
            fs.unlinkSync(filePath); // Eliminar el archivo después de procesarlo
            console.log('Final report:', report);
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
