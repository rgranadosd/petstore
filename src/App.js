import React, { useState, useEffect } from 'react';
import { Container, Typography, Grid, Card, CardContent, CardMedia, Button, AppBar, Toolbar } from '@mui/material';
import axios from 'axios';

function App() {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('Componente App montado');
    fetchPets();
  }, []);

  const fetchPets = async () => {
    console.log('Iniciando petición a la API de mascotas...');
    try {
      const response = await axios.get('https://petstore.swagger.io/v2/pet/findByStatus?status=available');
      console.log('Respuesta recibida de la API:', response);
      setPets(response.data);
      setLoading(false);
      console.log('Mascotas guardadas en el estado:', response.data);
    } catch (error) {
      console.error('Error al obtener mascotas:', error);
      setLoading(false);
    }
  };

  console.log('Renderizando App. Estado loading:', loading, 'Mascotas:', pets);

  return (
    <div>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6">
            PetStore
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Container style={{ marginTop: '2rem' }}>
        <Typography variant="h4" gutterBottom>
          Available Pets
        </Typography>
        
        {loading ? (
          <Typography>Loading pets...</Typography>
        ) : (
          <Grid container spacing={3}>
            {pets.map((pet) => (
              <Grid item xs={12} sm={6} md={4} key={pet.id}>
                <Card>
                  <CardMedia
                    component="img"
                    height="140"
                    image={pet.photoUrls[0] || 'https://via.placeholder.com/140'}
                    alt={pet.name}
                  />
                  <CardContent>
                    <Typography gutterBottom variant="h5" component="div">
                      {pet.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Status: {pet.status}
                    </Typography>
                    {pet.tags && (
                      <Typography variant="body2" color="text.secondary">
                        Tags: {pet.tags.map(tag => tag.name).join(', ')}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </div>
  );
}

export default App; 