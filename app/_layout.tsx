import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

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
    <PaperProvider>
      <Stack>
        <Stack.Screen 
          name="index" 
          options={{ 
            title: 'SlideMaker',
            headerShown: false 
          }} 
        />
        <Stack.Screen 
          name="upload" 
          options={{ 
            title: 'Upload Files',
            presentation: 'modal'
          }} 
        />
        <Stack.Screen 
          name="preview" 
          options={{ 
            title: 'Preview Slides',
            presentation: 'modal'
          }} 
        />
        <Stack.Screen 
          name="presentation" 
          options={{ 
            title: 'Presentation',
            presentation: 'fullScreenModal'
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
            presentation: 'modal'
          }} 
        />
      </Stack>
    </PaperProvider>
  );
}
