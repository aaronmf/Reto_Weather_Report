import React, { useState } from 'react';
import axios from 'axios';
import { Container, Row, Col, Form, Button, Table, Card } from 'react-bootstrap';

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert("Please upload a CSV file");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('http://localhost:5000/weather-report', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      console.log('Response from server:', response); 
      setReport(response.data.report);
    } catch (error) {
      console.error("Error fetching weather data", error);
      setError('Error al obtener datos del backend');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
    <Container className="border mt-5 rounded p-3">
      <Row className="my-4">
        <Col>
          <h2>Reporte de clima</h2>
          <Form onSubmit={handleSubmit}>
            <Form.Group controlId="formFile" className="mb-3">
              <Form.Label>Carga el archivo CDV para generar el reporte</Form.Label>
              <Form.Control type="file" accept=".csv" onChange={handleFileChange} />
            </Form.Group>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? 'Uploading...' : 'Cargar'}
            </Button>
          </Form>
        </Col>
      </Row>

      {error && (
        <Row>
          <Col>
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          </Col>
        </Row>
      )}
      </Container>
      <Container fluid>
      {report.length > 0 && (
        <Container fluid className="mt-5">
          <Card className="mx-auto" style={{ width: '100%' }}>
            <Card.Header as="h5" className="text-center">Informe de clima para viajeros</Card.Header>
            <Card.Body>
              <div style={{ maxHeight: '500px', overflowY: 'auto', overflowX: 'auto', marginTop: '20px' }}>
                <Table striped bordered hover style={{ width: '100%' }}>
                  <thead className="thead-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                    <tr>
                      <th>Origen</th>
                      <th>Destino</th>
                      <th>Aerolínea</th>
                      <th>Número de Vuelo</th>
                      <th>Código IATA Origen</th>
                      <th>Nombre Origen</th>
                      <th>Latitud Origen</th>
                      <th>Longitud Origen</th>
                      <th>Clima de Origen</th>
                      <th>Código IATA Destino</th>
                      <th>Nombre Destino</th>
                      <th>Latitud Destino</th>
                      <th>Longitud Destino</th>
                      <th>Clima de Destino</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.map((ticket, index) => (
                      <tr key={index}>
                        <td>{ticket.origin.airport}</td>
                        <td>{ticket.destination.airport}</td>
                        <td>{ticket.airline}</td>
                        <td>{ticket.flight_num}</td>
                        <td>{ticket.origin_iata_code}</td>
                        <td>{ticket.origin_name}</td>
                        <td>{ticket.origin_latitude}</td>
                        <td>{ticket.origin_longitude}</td>
                        <td>
                          {ticket.originWeather ? (
                            `${ticket.originWeather}°C`
                          ) : 'Cargando...'}
                        </td>
                        <td>{ticket.destination_iata_code}</td>
                        <td>{ticket.destination_name}</td>
                        <td>{ticket.destination_latitude}</td>
                        <td>{ticket.destination_longitude}</td>
                        <td>
                          {ticket.destinationWeather ? (
                            `${ticket.destinationWeather}°C`
                          ) : 'Cargando...'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Container>
      )}
    </Container>
    </div>
  );
};

export default App;
