import React, { useState, useEffect } from 'react';
import { Button, View, Text, PermissionsAndroid, Alert, StyleSheet, Platform } from 'react-native';
import Voice from '@react-native-community/voice';
import auth from '@react-native-firebase/auth';
import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';
import { CONFIG } from './configuration/config.js';

const MainControlScreen = ({ navigation }) => {
  const [lightStatus, setLightStatus] = useState({
    bec_sufragerie: false,
    bec_dormitor: false
  });
  const [lightBrightness, setLightBrightness] = useState({
    bec_sufragerie: '0%',
    bec_dormitor: '0%'
  });
  const [lightColor, setLightColor] = useState({
    bec_sufragerie: 'Unknown',
    bec_dormitor: 'Unknown'
  });
  const [voiceText, setVoiceText] = useState('');
  const [doorStatus, setDoorStatus] = useState('');

  useEffect(() => {
    const requestMicrophonePermission = async () => {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Permisiuni microfon',
          message: 'Această aplicație necesită acces la microfonul tău pentru a procesa comenzi vocale',
          buttonNeutral: 'Întreabă-mă mai târziu',
          buttonNegative: 'Anulează',
          buttonPositive: 'OK',
        },
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Permisiunea pentru microfon nu a fost acordată');
      }
    };

    requestMicrophonePermission();

    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechError = onSpeechError; 
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const getBaseUrl = async () => {
    try {
      const state = await NetInfo.fetch();
      if (state.type === 'cellular') {
        return CONFIG.cellularNetworkBaseUrl;
      }
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        const ssid = state.details.ssid;
        if (ssid === 'YourHomeNetworkSSID') {
          return CONFIG.homeNetworkBaseUrl;
        } else {
          return CONFIG.otherNetworkBaseUrl;
        }
      } else {
        const isHomeNetwork = state.isWifiEnabled && state.details.ipAddress.startsWith('192.168.0.');
        if (isHomeNetwork) {
          return CONFIG.homeNetworkBaseUrl;
        } else if (state.isWifiEnabled) {
          return CONFIG.otherNetworkBaseUrl;
        } else {
          return CONFIG.phoneNetworkBaseUrl;
        }
      }
    } catch (error) {
      console.error('Error fetching base URL:', error);
      throw error;
    }
  };

  const startListening = () => {
    Voice.start('ro-RO').catch(error => {
      Alert.alert('Error starting voice recognition', error.message);
    });
  };

  const onSpeechResults = (e) => {
    setVoiceText(e.value[0]);
    const spokenText = e.value[0].toLowerCase();
    console.log('Spoken Text:', spokenText); 
    handleVoiceCommand(spokenText);
  };

  const onSpeechError = (e) => {
    console.error('onSpeechError:', e); 
    Alert.alert('Voice recognition error', e.error.message);
  };

  const handleVoiceCommand = (spokenText) => {
    console.log('Handling Voice Command:', spokenText); 
    if (spokenText.includes('am închis ușa')) {
      console.log('Command recognized: am închis ușa'); 
      checkSensorStatus();
    } else if (spokenText.includes('mărește intensitatea becului din sufragerie')) {
      adjustBrightness('increase', 'bec_sufragerie');
    } else if (spokenText.includes('scade intensitatea becului din sufragerie')) {
      adjustBrightness('decrease', 'bec_sufragerie');
    } else if (spokenText.includes('aprinde lumina in sufragerie')) {
      toggleLight('on', 'bec_sufragerie');
    } else if (spokenText.includes('stinge lumina in sufragerie')) {
      toggleLight('off', 'bec_sufragerie');
    } else if (spokenText.match(/schimbă culoarea becului din sufragerie în (\w+)/)) {
      const color = spokenText.match(/schimbă culoarea becului din sufragerie în (\w+)/)[1];
      changeLightColor(color, 'bec_sufragerie');
    } else if (spokenText.includes('mărește intensitatea becului din dormitor')) {
      adjustBrightness('increase', 'bec_dormitor');
    } else if (spokenText.includes('scade intensitatea becului din dormitor')) {
      adjustBrightness('decrease', 'bec_dormitor');
    } else if (spokenText.includes('aprinde lumina din dormitor')) {
      toggleLight('on', 'bec_dormitor');
    } else if (spokenText.includes('stinge lumina din dormitor')) {
      toggleLight('off', 'bec_dormitor');
    } else if (spokenText.match(/schimbă culoarea becului din dormitor în (\w+)/)) {
      const color = spokenText.match(/schimbă culoarea becului din dormitor în (\w+)/)[1];
      changeLightColor(color, 'bec_dormitor');
    } else {
      console.log('Unrecognized command:', spokenText); 
    }
  };

  const adjustBrightness = async (action, bulb) => {
    try {
      const baseUrl = await getBaseUrl();
      const response = await axios.get(`${baseUrl}/lights/${bulb}/brightness/${action}`);
      const data = response.data;
      if (data.success) {
        setLightBrightness(prevState => ({ ...prevState, [bulb]: `${data.brightness}%` }));
        Alert.alert('Success', `Brightness of ${bulb} adjusted to ${data.brightness}%`);
      } else {
        throw new Error('Eroare la ajustarea luminozitatii');
      }
    } catch (error) {
      console.error('Eroare la ajustarea luminozitatii:', error); 
      Alert.alert('Eroare la ajustarea luminozitatii', error.message);
    }
  };

  const toggleLight = async (command, bulb) => {
    try {
      const baseUrl = await getBaseUrl();
      const response = await axios.get(`${baseUrl}/lights/${bulb}/${command}`);
      const data = response.data;
      if (data.success) {
        setLightStatus(prevState => ({ ...prevState, [bulb]: command === 'on' }));
        Alert.alert('Success', `Light ${bulb} turned ${command}`);
      } else {
        Alert.alert('Eroare la pornirea luminii', data.detail || 'Eroare necunoscuta');
      }
    } catch (error) {
      console.error('Eroare de retea', error); 
      Alert.alert('Eroare de retea', error.message);
    }
  };

  const changeLightColor = async (color, bulb) => {
    try {
      const baseUrl = await getBaseUrl();
      const response = await axios.post(`${baseUrl}/lights/${bulb}/color/${color}`);
      const data = response.data;
      if (data.success) {
        setLightColor(prevState => ({ ...prevState, [bulb]: color }));
        Alert.alert('Success', `Color of ${bulb} changed to ${color}`);
      } else {
        Alert.alert('Eroare la schimbarea culorii', data.detail || 'Eroare necunoscuta');
      }
    } catch (error) {
      console.error('Eroare de retea', error);
      Alert.alert('Eroare de retea', error.message);
    }
  };

  const checkSensorStatus = async () => {
    try {
      const baseUrl = await getBaseUrl();
      const response = await axios.get(`${baseUrl}/sensor/status`);
      const data = response.data;
      console.log('Sensor status response:', data); 
      if (data.success) {
        setDoorStatus(data.door_state === 'open' ? 'Door is open' : 'Door is closed');
        Alert.alert('Sensor Status', `Door is ${data.door_state}. Battery: ${data.battery_level}%`);
      } else {
        throw new Error('Unknown status');
      }
    } catch (error) {
      console.error('Error getting sensor status:', error); 
      Alert.alert('Error getting sensor status', error.message);
    }
  };

  const handleLogout = () => {
    auth().signOut()
      .then(() => navigation.replace('Login'))
      .catch(error => {
        Alert.alert('Logout esuat', error.message);
      });
  };

  return (
    <View style={styles.container}>
      <Button title="Spune ceva" onPress={startListening} />
      <Text>{voiceText}</Text>
      <Button title="Verifică starea ușii" onPress={checkSensorStatus} />
      <Text>{doorStatus}</Text>
      <Button title="Deconectează-te" onPress={handleLogout} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  }
});

export default MainControlScreen;
