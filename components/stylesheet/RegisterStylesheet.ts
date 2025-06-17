import { StyleSheet } from 'react-native';

const RegisterStyles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#FAF9F6',
    paddingVertical: 20,
  },
  formContainer: {
    width: '90%',
    alignSelf: 'center',
  },
  icon: {
    alignSelf: 'center',
    marginBottom: 15,
    color: '#4CAF50',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#388E3C',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
  },
  input: {
    width: '100%',
    backgroundColor: '#FFF',
    marginBottom: 15,
    borderRadius: 4,
  },
  
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
  },
  passwordInputContainer: {
    position: 'relative',
    width: '100%',
    marginBottom: 15,
  },
  passwordInput: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 4,
    paddingRight: 40, // Espacio para el icono
  },
  eyeIconContainer: {
    position: 'absolute',
    right: 10,
    top: 12,
    zIndex: 2,
  },
  eyeIcon: {
    position: 'absolute',
    right: 10,
    padding: 10,
  },
  button: {
    width: '100%',
    marginTop: 15,
    paddingVertical: 8,
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonGroup: {
    flexDirection: 'column',
    width: '100%',
    marginTop: 20,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderColor: '#4CAF50',
    borderWidth: 1,
    marginBottom: 10,
  },
  secondaryButtonText: {
    color: '#4CAF50',
  },
  radioGroup: {
    marginBottom: 20,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  radioLabel: {
    marginLeft: 8,
    color: '#333',
  },
  loginText: {
    marginTop: 25,
    textAlign: 'center',
    color: '#666',
  },
  loginLink: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  halfInput: {
    width: '48%',
    backgroundColor: '#FFF',
    marginBottom: 15,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#388E3C',
    marginBottom: 10,
    marginTop: 5,
  },
  logoImage: {
    width: 100, // Ajusta según necesites
    height: 100, // Ajusta según necesites
    marginBottom: 15,
    alignSelf: 'center',
  },
  
});

export default RegisterStyles;