

import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, StyleSheet, Alert } from 'react-native';
import auth from '@react-native-firebase/auth';
import { globalStyles } from './style';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const allowedEmails = [
    "dsebastian80@yahoo.com",


  ];

  const handleLogin = async () => {
    if (!allowedEmails.includes(email.toLowerCase())) {
      Alert.alert("Acces interzis", "Emailul tau nu este autorizat sa foloseasca aceasta aplicatie.");
      return;
    }

    try {
      await auth().signInWithEmailAndPassword(email, password);
      navigation.navigate('MainControl');
    } catch (error) {
      Alert.alert("Eroare la login", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="black"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="black"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Button title="Login" onPress={handleLogin} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    color:'black',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  input: {
    width: '100%',
    margin: 10,
    borderWidth: 1,
    padding: 10,
  },
});

export default LoginScreen;
