import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import api from 'services/api';

interface StateCityPickerProps {
  onStateChange?: (stateId: string) => void;
  onCityChange?: (cityId: string, cityName: string) => void; // Actualizado para recibir 2 parámetros
}

const StateCityPicker = ({ onStateChange, onCityChange }: StateCityPickerProps) => {
  const [states, setStates] = useState<{ id: string; name: string }[]>([]);
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCityName, setSelectedCityName] = useState(''); // Nuevo estado para el nombre

  // Obtener estados (sin cambios)
  useEffect(() => {
    const fetchStates = async () => {
      try {
        
        const response = await api.get('/states');
        setStates(response.data);
      } catch (error) {
        console.error('Error al obtener estados:', error);
      }
    };
    fetchStates();
  }, []);

  // Obtener ciudades (sin cambios)
  useEffect(() => {
    if (selectedState) {
      const fetchCities = async () => {
        try {
          const response = await api.get(
            `/cities/${selectedState}`
          );
          setCities(response.data);
        } catch (error) {
          console.error('Error al obtener ciudades:', error);
          setCities([]);
        }
      };
      fetchCities();
    } else {
      setCities([]);
    }
  }, [selectedState]);

  const handleStateChange = (value: string) => {
    setSelectedState(value);
    setSelectedCity('');
    setSelectedCityName(''); // Reiniciar nombre al cambiar estado
    onStateChange?.(value);
  };

  const handleCityChange = (cityId: string) => {
    const city = cities.find((c) => c.id === cityId);
    setSelectedCity(cityId);
    setSelectedCityName(city?.name || ''); // Guardar el nombre
    onCityChange?.(cityId, city?.name || ''); // Enviar ambos datos al padre
  };

  return (
    <View>
      <Text>Estado</Text>
      <Picker selectedValue={selectedState} onValueChange={handleStateChange}>
        <Picker.Item label="Selecciona un estado" value="" />
        {states.map((state) => (
          <Picker.Item key={state.id} label={state.name} value={state.id} />
        ))}
      </Picker>

      <Text>Ciudad</Text>
      <Picker
        selectedValue={selectedCity}
        onValueChange={handleCityChange}
        enabled={cities.length > 0}
      >
        <Picker.Item label="Selecciona una ciudad" value="" />
        {cities.map((city) => (
          <Picker.Item key={city.id} label={city.name} value={city.id} />
        ))}
      </Picker>
    </View>
  );
};

export default StateCityPicker;