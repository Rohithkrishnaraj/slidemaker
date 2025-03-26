import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { AuthProvider } from '../contexts/AuthContext';
import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import UserHeader from '../components/UserHeader';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    // Add any custom fonts here if needed
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider>
          <AuthProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                headerRight: () => <UserHeader />,
              }}
            >
              <Stack.Screen 
                name="(auth)" 
                options={{ 
                  headerShown: false,
                }} 
              />
              <Stack.Screen 
                name="index" 
                options={{ 
                  title: 'SlideMaker',
                  headerShown: true 
                }} 
              />
              <Stack.Screen 
                name="upload" 
                options={{ 
                  title: 'Upload Files',
                  presentation: 'modal',
                  headerShown: true
                }} 
              />
              <Stack.Screen 
                name="preview" 
                options={{ 
                  title: 'Preview Slides',
                  presentation: 'modal',
                  headerShown: true
                }} 
              />
              <Stack.Screen 
                name="presentation" 
                options={{ 
                  title: 'Presentation',
                  presentation: 'fullScreenModal',
                  headerShown: true
                }} 
              />
              <Stack.Screen 
                name="my-slides" 
                options={{ 
                  title: 'My Slides',
                  headerShown: true
                }} 
              />
              <Stack.Screen 
                name="edit" 
                options={{ 
                  title: 'Edit Slide',
                  presentation: 'modal',
                  headerShown: true
                }} 
              />
            </Stack>
          </AuthProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
