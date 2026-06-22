// Must be imported before any other module that may use crypto (e.g. Amplify
// Auth / Cognito), so polyfill `crypto.getRandomValues` first.
import 'react-native-get-random-values';

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppProviders } from './src/app/AppProviders';
import { useSession } from './src/app/SessionContext';
import { useCurrentUser } from './src/features/auth';
import { useMyProfile } from './src/features/users/hooks/useMyProfile';
import AllTasksScreen from './src/screens/AllTasksScreen';
import CreateAccountScreen from './src/screens/CreateAccountScreen';
import CreateTaskScreen from './src/screens/CreateTaskScreen';
import CreateTaskStepScreen from './src/screens/CreateTaskStepScreen';
import ForgotPasswordResetScreen from './src/screens/ForgotPasswordResetScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import HomeScreen from './src/screens/HomeScreen';
import OnboardingNameScreen from './src/screens/OnboardingNameScreen';
import SignInScreen from './src/screens/SignInScreen';
import TaskViewScreen from './src/screens/TaskViewScreen';
import VerifyEmailScreen from './src/screens/VerifyEmailScreen';
import { colors } from './src/shared/theme/tokens';

const Stack = createNativeStackNavigator();

/**
 * State-driven routing: picks one of three stacks based on session state.
 *
 *  - No Cognito user and not in guest mode → Auth stack (SignIn et al.)
 *  - Signed-in real user but profile not yet created → Onboarding (name)
 *  - Signed-in with profile, OR guest mode → Main stack (Home)
 *
 * Whenever any of these states change (sign in, sign out, profile created,
 * Skip pressed), the next render picks the matching stack — no manual
 * navigation.reset() needed anywhere.
 */
function RootStack() {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const { isGuest } = useSession();
  // Only fetch the profile when a real user is signed in — in guest mode
  // there is no Cognito identity to query.
  const { data: profile, isLoading: profileLoading } = useMyProfile({
    enabled: !!currentUser && !isGuest,
  });

  if (userLoading) {
    return <Splash />;
  }
  // Real user signed in but the profile fetch hasn't completed yet — wait
  // so we don't briefly flash the Onboarding screen for existing users.
  if (currentUser && !isGuest && profileLoading) {
    return <Splash />;
  }

  const isAuthed = !!currentUser || isGuest;
  const needsOnboarding = !!currentUser && !isGuest && profile == null;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthed ? (
        <>
          <Stack.Screen name="SignIn" component={SignInScreen} />
          <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
          <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen
            name="ForgotPasswordReset"
            component={ForgotPasswordResetScreen}
          />
        </>
      ) : needsOnboarding ? (
        <Stack.Screen name="Onboarding" component={OnboardingNameScreen} />
      ) : (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="AllTasks" component={AllTasksScreen} />
          <Stack.Screen name="TaskView" component={TaskViewScreen} />
          <Stack.Screen
            name="CreateTask"
            component={CreateTaskScreen}
            options={{ headerBackButtonMenuEnabled: false }}
          />
          <Stack.Screen name="CreateTaskStep" component={CreateTaskStepScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

function Splash() {
  return (
    <View style={styles.splash}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

export default function App() {
  return (
    <AppProviders>
      <SafeAreaProvider>
        <NavigationContainer>
          <RootStack />
        </NavigationContainer>
        <StatusBar style="dark" />
      </SafeAreaProvider>
    </AppProviders>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
