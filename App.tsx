import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppProviders } from './src/app/AppProviders';
import HomeScreen from './src/screens/HomeScreen';

/**
 * Root application component. Defines the mobile app's navigation stack.
 * Additional screens (task detail, sign-in, settings) can be added to the
 * <Stack.Navigator> block as the app grows.
 */
const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <AppProviders>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Home" component={HomeScreen} />
          </Stack.Navigator>
        </NavigationContainer>
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </AppProviders>
  );
}
