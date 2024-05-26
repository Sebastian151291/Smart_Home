import React, { useState, useEffect } from 'react';
import { Button, View, Text, PermissionsAndroid, Alert } from 'react-native';
import Voice from '@react-native-community/voice';

const App = () => {
  const [lightStatus, setLightStatus] = useState(false);
  const [voiceText, setVoiceText] = useState('');

  useEffect(() => {
    const requestMicrophonePermission = async () => {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Permisiuni microfon',
            message: 'Pentru a trimite comenzi , aceasta aplicatie are nevoie de accesul la microfon',
            buttonNeutral: 'Intreaba-ma mai tarziu',
            buttonNegative: 'Anulare',
            buttonPositive: 'Da',
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Nu ai permis accesul la microfon');
        }
      } catch (err) {
        console.warn(err);
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
    if (e.value[0].toLowerCase() === 'aprinde becul') {
      toggleLight('on');
    } else if (e.value[0].toLowerCase() === 'stinge becul') {
      toggleLight('off');
    }
  };

  const startListening = () => {
    Voice.start('ro-RO').catch(error => {
      console.error('Voice start error: ', error);
      Alert.alert('Failed to start listening', error.message);
    });
  };

  const toggleLight = async (command) => {
    try {
      const response = await fetch(`http://192.168.0.143:8000/lights/${command}`);
      const data = await response.json();

      if (data.success) {
        setLightStatus(command === 'on');
        Alert.alert('Success', `Light turned ${command}`);
      } else {
        console.error('Failed to toggle light',data);
        Alert.alert('Error', 'Failed to toggle light: ' + (data.detail || 'Unknown error'));
      }
    } catch (error) {
      console.error('Network error', error);
      Alert.alert('Network Error', error.message);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Button title="Start Listening" onPress={startListening} />
      <Text>{voiceText}</Text>
      <Button title={`Turn light ${lightStatus ? 'Off' : 'On'}`} onPress={() => toggleLight(lightStatus ? 'off' : 'on')} />
    </View>
  );
};

export default App;