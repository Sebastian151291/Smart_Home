 import React, { useState, useEffect } from 'react';
import { Button, View, Text, PermissionsAndroid, Alert } from 'react-native';
import Voice from '@react-native-community/voice';
import auth from '@react-native-firebase/auth';
import { globalStyles } from './aspect/styles';

const MainControlScreen = ({ navigation }) => {
  const [lightStatus, setLightStatus] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [textColor, setTextColor] = useState('black');
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
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const onSpeechResults = (e) => {
    setVoiceText(e.value[0]);
    const spokenText = e.value[0].toLowerCase();
    const colorMatch = spokenText.match(/schimbă culoarea becului în (\w+)/);

    if (colorMatch && colorMatch[1]) {
      changeLightColor(colorMatch[1]);
    } else if (spokenText === 'aprinde lumina') {
      toggleLight('on');
    } else if (spokenText === 'stinge lumina') {
      toggleLight('off');
    }
  };

  const startListening = () => {
    Voice.start('ro-RO').catch(error => {
      console.error('Eroare la pornirea ascultării: ', error);
      Alert.alert('Eșec la pornirea ascultării', error.message);
    });
  };

  const toggleLight = async (command) => {
    try {
      const response = await fetch(`http://192.168.0.143:8000/lights/${command}`);
      const data = await response.json();
      if (data.success) {
        setLightStatus(command === 'on');
        Alert.alert('Succes', `Lumina a fost ${command === 'on' ? 'aprină' : 'stinsă'}`);
      } else {
        console.error('Eroare la comutarea luminii', data);
        Alert.alert('Eroare', 'Eroare la comutarea luminii: ' + (data.detail || 'Eroare necunoscută'));
      }
    } catch (error) {
      console.error('Eroare de rețea', error);
      Alert.alert('Eroare de rețea', error.message);
    }
  };

  const changeLightColor = async (color) => {
    try {
      const response = await fetch(`http://192.168.0.143:8000/lights/color/${color}`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        Alert.alert('Succes', `Culoarea becului a fost schimbată în ${color}`);
      } else {
        console.error('Eroare la schimbarea culorii becului', data);
        Alert.alert('Eroare', 'Eroare la schimbarea culorii becului: ' + (data.detail || 'Eroare necunoscută'));
      }
    } catch (error) {
      console.error('Eroare de rețea', error);
      Alert.alert('Eroare de rețea', error.message);
    }
  };

  const checkSensorStatus = async () => {
    try {
      const response = await fetch('http://192.168.0.106:8000/sensor/status');
      const data = await response.json();
      if (data.status === 'open') {
        Alert.alert('Stare ușă', 'Ușa este deschisă');
        setDoorStatus('Ușa este deschisă');
      } else if (data.status === 'closed') {
        Alert.alert('Stare ușă', 'Ușa este închisă');
        setDoorStatus('Ușa este închisă');
      } else {
        throw new Error('Stare necunoscută');
      }
    } catch (error) {
      console.error('Eroare la obținerea stării senzorului', error);
      Alert.alert('Eroare', 'Eroare la obținerea stării senzorului: ' + error.message);
    }
  };

  const handleLogout = () => {
    auth().signOut()
      .then(() => {
        navigation.replace('Login');
      })
      .catch(error => {
        console.error('Eșec la deconectare: ', error);
        Alert.alert('Eșec la deconectare', error.message);
      });
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Button title="Spune ceva" onPress={startListening} />
      <Text>{voiceText}</Text>
      <Button title="Verifică starea ușii" onPress={checkSensorStatus} />
      <Text>{doorStatus}</Text>
      <Button title="Deconectează-te" onPress={handleLogout} />
    </View>
  );
};


export default MainControlScreen;