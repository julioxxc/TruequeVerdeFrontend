import react from 'react';
import { StyleSheet } from 'react-native';


const LoginStyles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#14532d',
    },
    formContainer: {
      width: '80%',
      padding: 20,
      backgroundColor: 'white',
      borderRadius: 8,
      elevation: 5,
      alignItems: 'center',
    },
    icon: {
      marginBottom: 10,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#388E3C',
    },
    subtitle: {
      fontSize: 14,
      color: 'gray',
      marginBottom: 20,
    },
    input: {
    width: '100%',
    backgroundColor: '#FFF',
    marginBottom: 15,
    borderRadius: 4,
  },
  
    passwordContainer: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 15,
    },
    forgotPassword: {
      alignSelf: 'flex-end',
      marginBottom: 15,
    },
    forgotPasswordText: {
      color: '#388E3C',
    },
    checkboxContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 20,
    },
    button: {
      width: '100%',
      marginBottom: 15,
      backgroundColor: '#388E3C',
    },
    registerText: {
      fontSize: 14,
      color: 'gray',
    },
    registerLink: {
      color: '#388E3C',
    },
    rememberContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start', // <-- Cambiado de 'flex-end' a 'flex-start'
      marginBottom: 16,
    },
    rememberText: {
      marginLeft: 8,
      color: '#555',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#fff',
    },
    loadingText: {
      marginTop: 20,
      color: '#4CAF50',
      fontSize: 16,
    },
    buttonText: {
      color: 'white',
      fontSize: 16,
    },
    logoImage: {
      width: 100, // Ajusta según necesites
      height: 100, // Ajusta según necesites
      marginBottom: 15,
      alignSelf: 'center',
    },
  });

  export default LoginStyles;