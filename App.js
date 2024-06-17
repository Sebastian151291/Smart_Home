
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './screens/LoginScreen';
import MainControlScreen from './screens/MainControlScreen';
import firebase from '@react-native-firebase/app';
import '@react-native-firebase/auth';


const firebaseConfig = {
  apiKey: "AIzaSyBRGgnXwoop3Pi5QrdxxiIFcdyhwIkCIls",           
  authDomain: "[proiect-91191].firebaseapp.com",
  projectId: "proiect-91191",
  storageBucket: "[proiect-91191].appspot.com",
  messagingSenderId: "448375299411",
  appId: "1:448375299411:android:4ba7b829ce8dad0a5b95a6"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const Stack = createNativeStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="MainControl" component={MainControlScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
